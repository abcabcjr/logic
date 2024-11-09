import { getSatisfiabilityState, isStateValid } from './evaluate.js';
import { astToFormulaText } from './tools.js';

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

let fnCallLinker = 0;
let counter2 = 0;

function applyDistributivity(ast) {
    ast.distributed = true;
    if (ast.op.id === 'or' || ast.op.id === 'and') {
        let opposite = ast.op.id === 'or' ? 'and' : 'or';

        let takenCompositeIndices = [];
        let transformedIndices = [];

        let finalSubs = [];

        for (let i = 0; i < ast.sub.length; i++) {
            for (let j = 0; j < ast.sub.length; j++) {
                if (takenCompositeIndices.includes(j) || (i === j)
                    || transformedIndices.includes(i)
                    || transformedIndices.includes(j))
                    continue;

                let primaryIndex = i;
                let compositeIndex = j;
                let primary = ast.sub[primaryIndex];
                let composite = ast.sub[compositeIndex];

                if (primary.type !== 'atomic')
                    continue;
                if (composite.type !== 'composite' || composite.op.id !== opposite)
                    continue;

                if (primaryIndex !== -1 && compositeIndex !== -1) {
                    let distributed = {
                        type: 'composite',
                        op: {
                            id: opposite
                        },
                        sub: []
                    }

                    let subList = primary.type === 'atomic' ? [primary] : primary.sub;
                    let compSubList = composite.type === 'atomic' ? [composite] : composite.sub;

                    for (let sub1 of subList) {
                        for (let sub2 of compSubList) {
                            distributed.sub.push(chainUpAst([sub1, sub2], ast.op.id));
                        }
                    }

                    finalSubs.push(distributed);
                    transformedIndices.push(primaryIndex);
                    transformedIndices.push(compositeIndex);
                }
            }
        }

        for (let i = 0; i < ast.sub.length; i++) {
            if (!transformedIndices.includes(i))
                finalSubs.push(ast.sub[i]);
        }

        if (finalSubs.length === 1) {
            finalSubs[0].distributed = true;
            return finalSubs[0];
        } else {
            ast.sub = finalSubs;
            return ast;
        }
    }

    return ast;
}

function groupTerms(ast) {
    if (!ast.distributed && (ast.op.id === 'or' || ast.op.id === 'and')) {
        let opposite = ast.op.id === 'or' ? 'and' : 'or';

        let takenCompositeIndices = [];
        let transformedIndices = [];

        let finalSubs = [];

        for (let i = 0; i < ast.sub.length; i++) {
            for (let j = 0; j < ast.sub.length; j++) {
                if (takenCompositeIndices.includes(j) || (i === j)
                    || transformedIndices.includes(i)
                    || transformedIndices.includes(j))
                    continue;

                let primaryIndex = i;
                let compositeIndex = j;
                let primary = simplifyFormula(ast.sub[primaryIndex]);
                let composite = simplifyFormula(ast.sub[compositeIndex]);

                if (primary.type !== 'atomic' && (primary.type === 'composite' && primary.op.id !== opposite))
                    continue;
                if (composite.type !== 'composite' || composite.op.id !== opposite)
                    continue;

                if (primaryIndex !== -1 && compositeIndex !== -1) {
                    let subList = primary.type === 'atomic' ? [primary] : primary.sub;
                    let compSubList = composite.type === 'atomic' ? [composite] : composite.sub;

                    let commonFactors = [];
                    let nonCommonFirst = [];
                    let nonCommonSecond = [];

                    for (let sub of subList) {
                        let shared = false;
                        let simplified = simplifyFormula(sub);
                        for (let compSub of compSubList) {
                            if (arePropsTheSame(simplifyFormula(sub), simplifyFormula(compSub))) {
                                commonFactors.push(simplified);
                                shared = true;
                            }
                        }

                        if (!shared)
                            nonCommonFirst.push(simplified)
                    }

                    for (let sub of compSubList) {
                        let simplified = simplifyFormula(sub);
                        if (commonFactors.filter(sub2 => arePropsTheSame(sub2, simplified)).length === 0)
                            nonCommonSecond.push(simplified);
                    }

                    if (commonFactors.length > 0) {
                        let uncommonAsts = [];

                        for (let ast1 of nonCommonFirst)
                            for (let ast2 of nonCommonSecond)
                                uncommonAsts.push(chainUpAst([ast1, ast2], ast.op.id));

                        let distributed = chainUpAst(commonFactors.concat(uncommonAsts), opposite);
    
                        //console.warn(JSON.stringify(commonFactors));
                        //console.warn(JSON.stringify(distributed, null, 4));
                        //console.warn('FN#' + fnCallNo, astToFormulaText(distributed))
                        finalSubs.push(distributed);
                        transformedIndices.push(primaryIndex);
                        transformedIndices.push(compositeIndex);
                    }
                }
            }
        }

        for (let i = 0; i < ast.sub.length; i++) {
            if (!transformedIndices.includes(i))
                finalSubs.push(simplifyFormula(ast.sub[i]));
        }

        if (finalSubs.length === 1) {
            counter2++;
            if (transformedIndices.length > 0)
                return simplifyFormula(finalSubs[0]);

            //finalSubs[0].traversed = true;
            finalSubs[0] = applyDistributivity(finalSubs[0]);
            return finalSubs[0];
        } else {
            ast.sub = finalSubs;
            counter2++;
            //console.warn('FN#' + fnCallNo, 'AST: ' + astToFormulaText(ast))

            if (transformedIndices.length > 0)
                return simplifyFormula(ast);
            ast = applyDistributivity(ast);
            //ast.traversed = true;
            //return ast;
            //return ast;
        }
    }
    
    return ast;
}

export function simplifyFormula(ast) {
    fnCallLinker++;
    let fnCallNo = fnCallLinker;
    //console.warn('Step: ' + astToFormulaText(ast)); 
    if (ast.type === 'atomic')
        return ast;

    // idempotence
    if (ast.op.id === 'and' || ast.op.id === 'or') {
        let newSubs = [];
        let originalLength = ast.sub.length;

        for (let sub of ast.sub) {
            let isNew = true;
            let simplified = simplifyFormula(sub);
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
            return simplifyFormula(ast.sub.length < 2 ? ast.sub[0] : ast);
    }
    if (ast.op.id === 'eq' || ast.op.id === 'implies') {
        if (arePropsTheSame(simplifyFormula(ast.sub[0]), simplifyFormula(ast.sub[1])))
            return makeAtomic('⊤');
        else if (ast.op.id === 'eq' && arePropsTheSame(simplifyFormula(ast.sub[0]), simplifyFormula(negateFormula(ast.sub[1]))))
            return makeAtomic('⊥');
    }

    // absorption
    if (ast.op.id === 'and' && astListIncludesProp(ast.sub, '⊥'))
        return makeAtomic('⊥');

    if (ast.op.id === 'or' && astListIncludesProp(ast.sub, '⊤'))
        return makeAtomic('⊤');

    // Double negation
    if (ast.op.id === 'not' && ast.sub[0].type === 'composite' && ast.sub[0].op.id === 'not') {
        return simplifyFormula(ast.sub[0].sub[0]);
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
            return simplifyFormula(ast);
        }
    }

    // Simplifications
    if (ast.op.id === 'or' || ast.op.id === 'and') {
        let opposite = ast.op.id === 'or' ? 'and' : 'or';

        let takenCompositeIndices = [];
        let transformedIndices = [];

        let finalSubs = [];

        for (let i = 0; i < ast.sub.length; i++) {
            for (let j = 0; j < ast.sub.length; j++) {
                if (takenCompositeIndices.includes(j) || (i === j)
                    || transformedIndices.includes(i)
                    || transformedIndices.includes(j))
                    continue;

                let primaryIndex = i;
                let compositeIndex = j;
                let primary = simplifyFormula(ast.sub[primaryIndex]);
                let composite = simplifyFormula(ast.sub[compositeIndex]);
                
                if (composite.type !== 'composite' || composite.op.id !== opposite)
                    continue;

                let pushed = false;

                if (primaryIndex !== -1 && compositeIndex !== -1) {
                    if (primary.type === 'atomic' || primary.op.id === 'not')
                        for (let sub of composite.sub) {
                            if (arePropsTheSame(sub, primary)) {
                                finalSubs.push(primary);
                                pushed = true;
                            }
                        }
                    else if (primary.op.id === opposite) {
                        let sameProps = true;
                        for (let subProp of primary.sub)
                            if (composite.sub.filter(entry => arePropsTheSame(entry, subProp)).length === 0) {
                                sameProps = false;
                                break;
                            }

                        if (sameProps) {
                            finalSubs.push(primary);
                            pushed = true;
                        }
                    }
                }

                if (pushed) {
                    transformedIndices.push(primaryIndex);
                    transformedIndices.push(compositeIndex);
                }
            }
        }

        for (let i = 0; i < ast.sub.length; i++) {
            if (!transformedIndices.includes(i))
                finalSubs.push(simplifyFormula(ast.sub[i]));
        }

        if (finalSubs.length === 1) {
            if (transformedIndices.length > 0)
                return simplifyFormula(finalSubs[0]);
            return finalSubs[0];
        } else {
            ast.sub = finalSubs;
            if (transformedIndices.length > 0)
                return simplifyFormula(ast);
        }
    }

    // Complementarity by Contradiction
    if (ast.op.id === 'and') {
        for (let i = 0; i < ast.sub.length; i++) {
            for (let j = 0; j < ast.sub.length; j++)
                if (arePropsTheSame(simplifyFormula(ast.sub[i]),
                    simplifyFormula(negateFormula(simplifyFormula(ast.sub[j])))))
                    return makeAtomic('⊥');
        }
    }

    // Complementarity by excluded third
    if (ast.op.id === 'or') {
        for (let i = 0; i < ast.sub.length; i++) {
            for (let j = 0; j < ast.sub.length; j++)
                if (arePropsTheSame(simplifyFormula(ast.sub[i]),
                    simplifyFormula(negateFormula(simplifyFormula(ast.sub[j])))))
                    return makeAtomic('⊤');
        }
    }

    // De Morgan laws
    /*if (ast.op.id === 'not' && ast.sub[0].type === 'composite') {
        if (ast.sub[0].op.id === 'and')
            return simplifyFormula({
                type: 'composite',
                op: {
                    id: 'or'
                },
                sub: ast.sub.map(sub => {return {
                    type: 'composite',
                    op: {
                        id: 'not'
                    },
                    sub: [sub]
                }})
            });

        if (ast.sub[0].op.id === 'or')
            return simplifyFormula({
                type: 'composite',
                op: {
                    id: 'and'
                },
                sub: ast.sub.map(sub => {return {
                    type: 'composite',
                    op: {
                        id: 'not'
                    },
                    sub: [sub]
                }})
            });
    }*/

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

    let ast2 = astPostprocess(applyDistributivity(JSON.parse(JSON.stringify(ast))));
    let ast3 = astPostprocess(groupTerms(JSON.parse(JSON.stringify(ast))));
    ast = astPostprocess(ast);

    if (astToFormulaText(ast).length < astToFormulaText(ast2).length)
        if (astToFormulaText(ast).length > astToFormulaText(ast3).length)
            return ast3;
        else return ast;

    if (astToFormulaText(ast2).length < astToFormulaText(ast3).length)
        return ast2;
    return ast3;
}

function astPostprocess(ast) {
    let simplifiedSubs = [];
    let needsAnotherIteration = false;
    for (let sub of ast.sub) {
        let simplified = simplifyFormula(sub);
        if (!arePropsTheSame(sub, simplified))
            needsAnotherIteration = true;
        simplifiedSubs.push(simplified);
    }
    ast.sub = simplifiedSubs;

    if (needsAnotherIteration)
        return simplifyFormula(ast);

    return ast;
}