
const ParserOperators = {
    unary: {},
    binary: {}
};

const ParserEvals = {}

function registerOperator(id, type, symbol, evalFn) {
    ParserOperators[type][symbol] = {
        id: id
    }
    ParserEvals[id] = evalFn;
}

registerOperator('not', 'unary', '¬', (a) => !a);
registerOperator('and', 'binary', '∧', (a, b) => a && b);
registerOperator('or', 'binary', '∨', (a, b) => a || b);
registerOperator('eq', 'binary', '⇔', (a, b) => a === b);
registerOperator('implies', 'binary', '⇒', (a, b) => !a || (a && b));

export function tryGetUnaryOperator(character) {
    return ParserOperators.unary[character] || null;
}

export function tryGetBinaryOperator(character) {
    return ParserOperators.binary[character] || null;
}

export function getOpEvalFn(opId) {
    return ParserEvals[opId];
}