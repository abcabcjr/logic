function astListIncludesProp(astList, propName) {
    return astList.filter(ast => ast.name === propName).length > 0;
}

function arePropsTheSame(prop1, prop2) {
    // atomic
    if (prop1.type === 'atomic' || prop2.type === 'atomic')
        return prop1.name === prop2.name;

    // sub
    if (prop1.op.id !== prop2.op.id)
        return false;

    if (prop1.sub.length !== prop2.sub.length)
        return false;

    if (prop1.op.id === 'and' || prop1.op.id === 'or' || prop1.op.id === 'eq') {
        for (let sub of prop1.sub)
            if (prop2.sub.filter(sub2 => arePropsTheSame(sub2, sub)).length === 0)
                return false;

        return true;
    }

    // sub formulas have to be the same in same order
    for (let i = 0; i < prop1.sub.length; i++)
        if (!arePropsTheSame(prop1.sub[i], prop2.sub[i]))
            return false;

    return true;
}

function makeAtomic(name) {
    return {
        type: 'atomic',
        name: name
    }
}

function testEquivalence(ast1, ast2) {
    return isStateValid(getSatisfiabilityState({
        type: 'composite',
        op: {
            id: 'eq'
        },
        sub: [ast1, ast2]
    }));
}

function negateFormula(ast) {
    return {
        type: 'composite',
        op: {
            id: 'not'
        },
        sub: [ast]
    }
}

function chainUpAst(asts, operatorId) {
    if (asts.length === 1)
        return asts[0];
    return {
        type: 'composite',
        op: {
            id: operatorId
        },
        sub: asts
    }
}

function isFormulaSingleTerm(formulaAst) {
    return formulaAst.type === 'atomic' || formulaAst.op.id === 'not';
}

function applyDistributivity(ast) {
    if (ast.op.id === 'and') {
        let transformedIndices = [];

        let finalSubs = [];

        let otherOp = 'or'
        let flattenIndex = -1;
        let flattenAgainstIndex = -1;

        let i = 0;
        for (let sub of ast.sub) {
            i++;
            if (flattenIndex === -1 && sub.type === 'composite' && sub.op.id === otherOp)
                flattenIndex = i-1;
            else if (flattenAgainstIndex === -1 && (sub.type === 'atomic' || (sub.type === 'composite' && (sub.op.id === 'not' || sub.op.id === otherOp))))
                flattenAgainstIndex = i-1;
        }
        
        if (flattenAgainstIndex !== -1 && flattenIndex !== -1) {
            let composite = ast.sub[flattenIndex];
            let primary = ast.sub[flattenAgainstIndex];

            let distributed = {
                type: 'composite',
                op: {
                    id: otherOp
                },
                sub: []
            }

            let subList = isFormulaSingleTerm(primary) ? [primary] : primary.sub;
            let compSubList = isFormulaSingleTerm(composite) ? [composite] : composite.sub;

            for (let sub1 of subList) {
                for (let sub2 of compSubList) {
                    distributed.sub.push(chainUpAst([sub1, sub2], ast.op.id));
                }
            }

            finalSubs.push(distributed);
            transformedIndices.push(flattenAgainstIndex);
            transformedIndices.push(flattenIndex);
        }

        for (let i = 0; i < ast.sub.length; i++) {
            if (!transformedIndices.includes(i))
                finalSubs.push(ast.sub[i]);
        }

        if (finalSubs.length === 1) {
            if (transformedIndices.length > 0)
                return convertToDNF(finalSubs[0]);
            return finalSubs[0];
        } else {
            ast.sub = finalSubs;
            if (transformedIndices.length > 0)
                return convertToDNF(ast);
            return ast;
        }
    }

    return ast;
}

export function convertToDNF(ast) {
    if (ast.type === 'atomic')
        return ast;

    // convert implication
    if (ast.type === 'composite' && ast.op.id === 'implies') {
        return convertToDNF(chainUpAst([negateFormula(ast.sub[0]), ast.sub[1]], 'or'));
    }

    // Double negation
    if (ast.op.id === 'not' && ast.sub[0].type === 'composite' && ast.sub[0].op.id === 'not') {
        return convertToDNF(ast.sub[0].sub[0]);
    }

    // idempotence
    if (ast.op.id === 'and' || ast.op.id === 'or') {
        let newSubs = [];
        let originalLength = ast.sub.length;

        for (let sub of ast.sub) {
            let isNew = true;
            let simplified = convertToDNF(sub);
            for (let newSub of newSubs)
                if (arePropsTheSame(simplified, newSub)) {
                    isNew = false;
                    break;
                }
            if (isNew)
                newSubs.push(simplified);
        }
        ast.sub = newSubs;

        // don't end up in infinite recursion
        if (originalLength !== ast.sub.length)
            return convertToDNF(ast.sub.length < 2 ? ast.sub[0] : ast);
    }
    if (ast.op.id === 'eq' || ast.op.id === 'implies') {
        if (arePropsTheSame(convertToDNF(ast.sub[0]), convertToDNF(ast.sub[1])))
            return makeAtomic('⊤');
        else if (ast.op.id === 'eq' && arePropsTheSame(convertToDNF(ast.sub[0]), convertToDNF(negateFormula(ast.sub[1]))))
            return makeAtomic('⊥');
    }

    // Associativity law (remove paranthesis)
    if (ast.op.id === 'and' || ast.op.id === 'or') {
        let newSubs = [];
        let modified = false;

        for (let sub of ast.sub) {
            // flatten structure
            if (sub.type === 'composite' && sub.op.id === ast.op.id) {
                modified = true;
                newSubs = newSubs.concat(sub.sub);
            } else newSubs.push(sub);
        }

        if (modified) {
            ast.sub = newSubs;
            return convertToDNF(ast);
        }
    }

    // absorption
    if (ast.op.id === 'and' && astListIncludesProp(ast.sub, '⊥'))
        return makeAtomic('⊥');

    if (ast.op.id === 'or' && astListIncludesProp(ast.sub, '⊤'))
        return makeAtomic('⊤');

    // Complementarity by Contradiction
    if (ast.op.id === 'and') {
        for (let i = 0; i < ast.sub.length; i++) {
            for (let j = 0; j < ast.sub.length; j++)
                if (arePropsTheSame(convertToDNF(ast.sub[i]),
                    convertToDNF(negateFormula(convertToDNF(ast.sub[j])))))
                    return makeAtomic('⊥');
        }
    }

    // Complementarity by excluded third
    if (ast.op.id === 'or') {
        for (let i = 0; i < ast.sub.length; i++) {
            for (let j = 0; j < ast.sub.length; j++)
                if (arePropsTheSame(convertToDNF(ast.sub[i]),
                    convertToDNF(negateFormula(convertToDNF(ast.sub[j])))))
                    return makeAtomic('⊤');
        }
    }

    // clean NOT
    if (ast.op.id === 'not' && ast.sub[0].name === '⊤')
        return makeAtomic('⊥');
    if (ast.op.id === 'not' && ast.sub[0].name === '⊥')
        return makeAtomic('⊤');

    // identity
    if (ast.op.id === 'and') {
        ast.sub = ast.sub.filter(prop => prop.name !== '⊤');
        if (ast.sub.length === 0)
            return makeAtomic('⊤');
        else if (ast.sub.length === 1)
            return ast.sub[0];
    }
    if (ast.op.id === 'or') {
        ast.sub = ast.sub.filter(prop => prop.name !== '⊥');
        if (ast.sub.length === 0)
            return makeAtomic('⊥');
        else if (ast.sub.length === 1)
            return ast.sub[0];
    }

    // De Morgan laws
    if (ast.op.id === 'not' && ast.sub[0].type === 'composite') {
        if (ast.sub[0].op.id === 'and')
            return chainUpAst(ast.sub[0].sub.map(sub => negateFormula(sub)), 'or');

        if (ast.sub[0].op.id === 'or')
            return chainUpAst(ast.sub[0].sub.map(sub => negateFormula(sub)), 'and');
    }

    ast = applyDistributivity(ast);

    return astPostprocess(ast);
}

function astPostprocess(ast) {
    let simplifiedSubs = [];
    let needsAnotherIteration = false;
    for (let sub of ast.sub) {
        let simplified = convertToDNF(sub);
        if (!arePropsTheSame(sub, simplified))
            needsAnotherIteration = true;
        simplifiedSubs.push(simplified);
    }
    ast.sub = simplifiedSubs;

    if (needsAnotherIteration)
        return convertToDNF(ast);

    return ast;
}