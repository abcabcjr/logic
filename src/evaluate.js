import { getOpEvalFn } from "./operators.js";
import { astToFormulaText } from './tools.js';

export function evaluateAst(ast, interpretation, debugInfo) {
    if (ast.type === 'atomic') {
        debugInfo[astToFormulaText(ast)] = interpretation[ast.name];
        return interpretation[ast.name];
    } else if (ast.type === 'composite') {
        let value = getOpEvalFn(ast.op.id).apply(null, ast.sub.map(subFormula => evaluateAst(subFormula, interpretation, debugInfo)));
        debugInfo[astToFormulaText(ast)] = value;
        return value;
    }

    throw new Error('Missing ast type: ' + ast.type);
}

export function getAllAtomicNamesFromAst(ast, previous = (new Set())) {
    if (ast.type === 'atomic')
        previous.add(ast.name);
    else for (let sub of ast.sub)
        getAllAtomicNamesFromAst(sub, previous);
}

function* cartesian([t, ...more]) {
    if (t == null)
        return yield []
    for (const v of t)
        for (const c of cartesian(more))
            yield [v, ...c]
}

function* combine(t) {
    let restricted = {
        '⊤': [true],
        '⊥': [false]
    };

    let options = [false, true];

    for (const ps of cartesian(t.map((name) => (restricted[name] || options).map((value) => ({ [name]: value })))))
        yield Object.assign({}, ...ps)
}

export function getAllInterpretationsForAst(ast) {
    let propSet = new Set();
    getAllAtomicNamesFromAst(ast, propSet);

    let interpretations = Array.from(combine(Array.from(propSet)));
    return interpretations;
}

export function combinePropSet(...astList) {
    let propSet = new Set();
    for (let ast of astList)
        getAllAtomicNamesFromAst(ast, propSet);
    return propSet;
}

export function getCombinedEvaluation(...astList) {
    let propSet = combinePropSet.apply(null, astList);

    let interpretations = Array.from(combine(Array.from(propSet)));

    let tableInfo = {};

    for (let interp of interpretations) {
        let debugInfo = {};
        for (let ast of astList)
            evaluateAst(ast, interp, debugInfo);

        for (let formula in debugInfo) {
            if (!tableInfo[formula])
                tableInfo[formula] = [];
            tableInfo[formula].push(debugInfo[formula]);
        }
    }

    return tableInfo;
}

export function getSatisfiabilityState(ast, overridePropSet=new Set()) {
    let propSet = new Set(overridePropSet);
    getAllAtomicNamesFromAst(ast, propSet);

    let interpretations = Array.from(combine(Array.from(propSet)));

    let satisfies = [];
    let unsatisfies = [];

    let tableInfo = {};

    for (let interp of interpretations) {
        let debugInfo = {};
        if (evaluateAst(ast, interp, debugInfo))
            satisfies.push(interp);
        else unsatisfies.push(interp);

        for (let formula in debugInfo) {
            if (!tableInfo[formula])
                tableInfo[formula] = [];
            tableInfo[formula].push(debugInfo[formula]);
        }
    }

    return {
        satisfies: satisfies,
        unsatisfies: unsatisfies,
        tableInfo: tableInfo
    }
}

export function isStateValid(state) {
    return state.unsatisfies.length === 0;
}

export function isStateSatisfiable(state) {
    return state.satisfies.length > 0;
}

export function formatInterpretation(interpretation) {
    let fmt = [];

    let keys = Object.keys(interpretation).sort();

    for (let key of keys)
        fmt.push(key + ' := ' + interpretation[key]);

    return fmt.join(', ');
}