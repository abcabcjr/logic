
const ParserOperators = {
    unary: {},
    binary: {}
};

const ParserEvals = {}

const OpIdsToSymbols = {}

function registerOperator(id, type, symbol, evalFn, precedence, isComposable=false) {
    ParserOperators[type][symbol] = {
        id: id,
        precedence: precedence,
        composable: isComposable
    }
    OpIdsToSymbols[id] = symbol;
    ParserEvals[id] = evalFn;
}

registerOperator('not', 'unary', '¬', (a) => !a, 50);
registerOperator('and', 'binary', '∧', (...args) => args.reduce((prev, now) => prev && now, true), 30, true);
registerOperator('or', 'binary', '∨', (...args) => args.reduce((prev, now) => prev || now, false), 40, true);
registerOperator('nand', 'binary', '|', (...args) => !args.reduce((prev, now) => prev && now, true), 30, true);
registerOperator('nor', 'binary', '▽', (...args) => !args.reduce((prev, now) => prev || now, false), 40, true);
registerOperator('eq', 'binary', '⇔', (a, b) => a === b, 10);
registerOperator('implies', 'binary', '⇒', (a, b) => !a || (a && b), 20);

export function tryGetUnaryOperator(character) {
    return ParserOperators.unary[character] || null;
}

export function tryGetBinaryOperator(character) {
    return ParserOperators.binary[character] || null;
}

export function getOpEvalFn(opId) {
    return ParserEvals[opId];
}

export function getSymbolForOperator(operatorObj) {
    return OpIdsToSymbols[operatorObj.id];
}