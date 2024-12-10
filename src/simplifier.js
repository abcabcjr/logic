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

function applyDistributivity(ast, type, pipeline) {
    if (ast.op.id === type) {
        let transformedIndices = [];

        let finalSubs = [];

        let otherOp = type === 'and' ? 'or' : 'and'
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
                return pipeline.record(finalSubs[0], 'apply distributivity');
            return finalSubs[0];
        } else {
            ast.sub = finalSubs;
            if (transformedIndices.length > 0)
                return pipeline.record(ast, 'apply distributivity');
            return ast;
        }
    }

    return ast;
}

function applySimplifications(ast, pipeline, postProcessFn) {
    if (ast.type === 'atomic')
        return ast;

    // convert implication
    if (ast.type === 'composite' && ast.op.id === 'implies') {
        return pipeline.record(chainUpAst([negateFormula(ast.sub[0]), ast.sub[1]], 'or'), 'convert implication');
    }

    // convert equivalence
    if (ast.type === 'composite' && ast.op.id === 'eq') {
        return pipeline.record(chainUpAst([
            chainUpAst(ast.sub, 'and'),
            chainUpAst(ast.sub.map(sub => negateFormula(sub)), 'and')
        ], 'or'), 'convert equivalence');
    }

    // Double negation
    if (ast.op.id === 'not' && ast.sub[0].type === 'composite' && ast.sub[0].op.id === 'not') {
        return pipeline.record(ast.sub[0].sub[0], 'remove double negation');
    }

    // idempotence
    if (ast.op.id === 'and' || ast.op.id === 'or') {
        let newSubs = [];
        let originalLength = ast.sub.length;

        for (let sub of ast.sub) {
            let isNew = true;
            let simplified = pipeline.record(sub);
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
            return pipeline.record(ast.sub.length < 2 ? ast.sub[0] : ast, 'idempotence');
    }
    
    if (ast.op.id === 'eq' || ast.op.id === 'implies') {
        if (arePropsTheSame(pipeline.record(ast.sub[0]), pipeline.record(ast.sub[1])))
            return pipeline.record(makeAtomic('⊤'), 'turn to tautology');
        else if (ast.op.id === 'eq' && arePropsTheSame(pipeline.record(ast.sub[0]), pipeline.record(negateFormula(ast.sub[1]))))
            return pipeline.record(makeAtomic('⊥'), 'turn to contradiction');
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
            return pipeline.record(ast, 'apply associativity');
        }
    }

    // absorption
    if (ast.op.id === 'and' && astListIncludesProp(ast.sub, '⊥'))
        return pipeline.record(makeAtomic('⊥'), 'apply absorption');

    if (ast.op.id === 'or' && astListIncludesProp(ast.sub, '⊤'))
        return pipeline.record(makeAtomic('⊤'), 'turn to tautology');

    // Complementarity by Contradiction
    if (ast.op.id === 'and') {
        for (let i = 0; i < ast.sub.length; i++) {
            for (let j = 0; j < ast.sub.length; j++)
                if (arePropsTheSame(pipeline.record(ast.sub[i]),
                    pipeline.record(negateFormula(pipeline.record(ast.sub[j])))))
                    return pipeline.record(makeAtomic('⊥'), 'turn to contradiction');
        }
    }

    // Complementarity by excluded third
    if (ast.op.id === 'or') {
        for (let i = 0; i < ast.sub.length; i++) {
            for (let j = 0; j < ast.sub.length; j++)
                if (arePropsTheSame(pipeline.record(ast.sub[i]),
                    pipeline.record(negateFormula(pipeline.record(ast.sub[j])))))
                    return pipeline.record(makeAtomic('⊤'), 'turn to tautology');
        }
    }

    // clean NOT
    if (ast.op.id === 'not' && ast.sub[0].name === '⊤')
        return pipeline.record(makeAtomic('⊥'), 'turn to contradiction');
    if (ast.op.id === 'not' && ast.sub[0].name === '⊥')
        return pipeline.record(makeAtomic('⊤'), 'turn to tautology');

    // identity
    if (ast.op.id === 'and') {
        ast.sub = ast.sub.filter(prop => prop.name !== '⊤');
        if (ast.sub.length === 0)
            return pipeline.record(makeAtomic('⊤'), 'turn to tautology');
        else if (ast.sub.length === 1)
            return pipeline.record(ast.sub[0], 'apply identity');
    }
    if (ast.op.id === 'or') {
        ast.sub = ast.sub.filter(prop => prop.name !== '⊥');
        if (ast.sub.length === 0)
            return pipeline.record(makeAtomic('⊥'), 'turn to contradiction');
        else if (ast.sub.length === 1)
            return pipeline.record(ast.sub[0], 'apply identity');
    }

    // De Morgan laws
    if (ast.op.id === 'not' && ast.sub[0].type === 'composite') {
        if (ast.sub[0].op.id === 'and')
            return pipeline.record(chainUpAst(ast.sub[0].sub.map(sub => negateFormula(sub)), 'or'), 'apply de morgan laws');

        if (ast.sub[0].op.id === 'or')
            return pipeline.record(chainUpAst(ast.sub[0].sub.map(sub => negateFormula(sub)), 'and'), 'apply de morgan laws');
    }

    return postProcessFn(ast);
}

export function convertToDNF(ast, pipeline) {
    return applySimplifications(ast, pipeline, (ast) => {
        ast = applyDistributivity(ast, 'and', pipeline);

        return astPostprocess(ast, pipeline);
    });
}

export function convertToCNF(ast, pipeline) {
    return applySimplifications(ast, pipeline, (ast) => {
        //ast = applyDistributivity(ast, 'or', pipeline);

        return astPostprocess(ast, pipeline);
    });
}

function astPostprocess(ast, pipeline) {
    let simplifiedSubs = [];
    let needsAnotherIteration = false;
    for (let sub of ast.sub) {
        let simplified = pipeline.record(sub);
        if (!arePropsTheSame(sub, simplified))
            needsAnotherIteration = true;
        simplifiedSubs.push(simplified);
    }
    ast.sub = simplifiedSubs;

    if (needsAnotherIteration)
        return pipeline.record(ast);

    return ast;
}