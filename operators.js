
const ParserOperators = {
    unary: {},
    binary: {}
};

function registerOperator(id, type, symbol) {
    ParserOperators[type][symbol] = {
        id: id
    }
}

registerOperator('not', 'unary', '¬');
registerOperator('and', 'binary', '∧');
registerOperator('or', 'binary', '∨');
registerOperator('eq', 'binary', '⇔');
registerOperator('implies', 'binary', '⇒');

export function tryGetUnaryOperator(character) {
    return ParserOperators.unary[character] || null;
}

export function tryGetBinaryOperator(character) {
    return ParserOperators.binary[character] || null;
}