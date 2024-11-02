import { getOpEvalFn } from "./operators.js";

export function evaluateAst(ast, interpretation) {
    if (ast.type === 'atomic')
        return interpretation[ast.name];
    else if (ast.type === 'composite')
        return getOpEvalFn(ast.op.id).apply(null, ast.sub.map(subFormula => evaluateAst(subFormula, interpretation)));

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
    let options = [false, true];
    for (const ps of cartesian(t.map((name) => options.map((value) => ({ [name]: value })))))
        yield Object.assign({}, ...ps)
}

export function getAllInterpretationsForAst(ast) {
    let propSet = new Set();
    getAllAtomicNamesFromAst(ast, propSet);

    let interpretations = Array.from(combine(Array.from(propSet)));
    return interpretations;
}

export function getSatisfiabilityState(ast) {
    let propSet = new Set();
    getAllAtomicNamesFromAst(ast, propSet);

    let interpretations = Array.from(combine(Array.from(propSet)));

    let satisfies = [];
    let unsatisfies = [];

    for (let interp of interpretations)
        if (evaluateAst(ast, interp))
            satisfies.push(interp);
        else unsatisfies.push(interp);

    return {
        satisfies: satisfies,
        unsatisfies: unsatisfies
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

    for (let key in interpretation)
        fmt.push(key + ' := ' + interpretation[key]);

    return fmt.join(', ');
}