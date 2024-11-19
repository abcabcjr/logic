import { chainUpAst, makeAtomic, negateFormula } from './treebuild.js';

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

function testEquivalence(ast1, ast2) {
    return isStateValid(getSatisfiabilityState({
        type: 'composite',
        op: {
            id: 'eq'
        },
        sub: [ast1, ast2]
    }));
}

export function isFormulaSingleTerm(formulaAst) {
    return formulaAst.type === 'atomic' || formulaAst.op.id === 'not';
}

function applyDistributivity(ast, type) {
    if (ast.type === 'atomic')
        return ast;

    //let subs = [];
    //for (let sub of ast.sub)
    //    subs.push(applyDistributivity(sub, type));
    //ast.sub = subs;

    if (type !== 'and' && type !== 'or')
        return ast;

    if (ast.op.id === type) {
        let transformedIndices = [];

        let finalSubs = [];

        let otherOp = type === 'and' ? 'or' : 'and';
        let flattenIndex = -1;
        let flattenAgainstIndex = -1;

        let i = 0;
        for (let sub of ast.sub) {
            i++;
            if (flattenIndex === -1 && sub.type === 'composite' && sub.op.id === otherOp)
                flattenIndex = i - 1;
            else if (flattenAgainstIndex === -1 && (sub.type === 'atomic' || (sub.type === 'composite' && (sub.op.id === 'not' || sub.op.id === otherOp))))
                flattenAgainstIndex = i - 1;
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
            //if (transformedIndices.length > 0)
            //    return applyDistributivity(finalSubs[0], type);
            return finalSubs[0];
        } else {
            ast.sub = finalSubs;
            //if (transformedIndices.length > 0)
            //    return applyDistributivity(ast, type);
            return ast;
        }
    }

    return ast;
}

function applyDeMorgan(ast) {
    if (ast.type === 'atomic')
        return ast;

    let subs = [];
    for (let sub of ast.sub)
        subs.push(applyDeMorgan(sub));
    ast.sub = subs;

    if (ast.op.id === 'not' && ast.sub[0].type === 'composite') {
        if (ast.sub[0].op.id === 'and')
            return chainUpAst(ast.sub[0].sub.map(sub => negateFormula(sub)), 'or');

        if (ast.sub[0].op.id === 'or')
            return chainUpAst(ast.sub[0].sub.map(sub => negateFormula(sub)), 'and');
    }

    return ast;
}

function convertImplicationsAndEquivalences(ast) {
    if (ast.type === 'atomic')
        return ast;

    // convert implication
    if (ast.type === 'composite' && ast.op.id === 'implies') {
        ast = chainUpAst([negateFormula(ast.sub[0]), ast.sub[1]], 'or');
    }

    // convert equivalence
    if (ast.type === 'composite' && ast.op.id === 'eq') {
        ast = chainUpAst([
            chainUpAst(ast.sub, 'and'),
            chainUpAst(ast.sub.map(sub => negateFormula(sub)), 'and')
        ], 'or');
    }

    let subs = [];
    for (let sub of ast.sub)
        subs.push(convertImplicationsAndEquivalences(sub));
    ast.sub = subs;

    return ast;
}

function doAssociativity(ast) {
    if (ast.type === 'atomic')
        return ast;

    let subs = [];
    for (let sub of ast.sub) {
        subs.push(doAssociativity(sub));
    }
    ast.sub = subs;

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
            return doAssociativity(ast);
        }
    }

    return ast;
}

function simplify(ast) {
    if (ast.type === 'atomic')
        return ast;

    let subs = [];
    for (let sub of ast.sub)
        subs.push(simplify(sub));
    ast.sub = subs;

    // Double negation
    if (ast.op.id === 'not' && ast.sub[0].type === 'composite' && ast.sub[0].op.id === 'not') {
        return simplify(ast.sub[0].sub[0]);
    }

    // idempotence
    if (ast.op.id === 'and' || ast.op.id === 'or') {
        let newSubs = [];
        let originalLength = ast.sub.length;

        for (let sub of ast.sub) {
            let isNew = true;
            let simplified = simplify(sub);
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
            return simplify(ast.sub.length < 2 ? ast.sub[0] : ast);
    }
    if (ast.op.id === 'eq' || ast.op.id === 'implies') {
        if (arePropsTheSame(simplify(ast.sub[0]), simplify(ast.sub[1])))
            return makeAtomic('⊤');
        else if (ast.op.id === 'eq' && arePropsTheSame(simplify(ast.sub[0]), simplify(negateFormula(ast.sub[1]))))
            return makeAtomic('⊥');
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
                if (arePropsTheSame(simplify(ast.sub[i]),
                    simplify(negateFormula(simplify(ast.sub[j])))))
                    return makeAtomic('⊥');
        }
    }

    // Complementarity by excluded third
    if (ast.op.id === 'or') {
        for (let i = 0; i < ast.sub.length; i++) {
            for (let j = 0; j < ast.sub.length; j++)
                if (arePropsTheSame(simplify(ast.sub[i]),
                    simplify(negateFormula(simplify(ast.sub[j])))))
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

    return ast;
}

export function convertToNNF(ast) {
    if (ast.type === 'atomic')
        return ast;

    ast = convertImplicationsAndEquivalences(ast);
    ast = doAssociativity(ast);
    ast = applyDeMorgan(ast);
    ast = simplify(ast);
    
    return ast;
}

export function convertToDNF(ast) {
    if (ast.type === 'atomic')
        return ast;

    ast = convertToNNF(ast);
    //ast = applyDistributivity(ast, 'and');
    ast = simplify(ast);

    return ast;
}

export function convertToCNF(ast) {
    if (ast.type === 'atomic')
        return ast;

    ast = convertToNNF(ast);
    //ast = applyDistributivity(ast, 'or');
    ast = simplify(ast);
    
    return ast;
}

function astPostprocess(ast, simplifyFn) {
    if (ast.type === 'atomic')
        return ast;

    let simplifiedSubs = [];
    let needsAnotherIteration = false;
    for (let sub of ast.sub) {
        let simplified = simplifyFn(sub);
        if (!arePropsTheSame(sub, simplified))
            needsAnotherIteration = true;
        simplifiedSubs.push(simplified);
    }
    ast.sub = simplifiedSubs;

    if (needsAnotherIteration)
        return simplifyFn(ast);

    return ast;
}