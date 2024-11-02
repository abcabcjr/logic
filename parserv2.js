import { tryGetBinaryOperator, tryGetUnaryOperator } from './operators.js';

function isValidPropName(name) {
    return /[A-Z]/.test(name);
}

function readAtomicFormula(reader) {
    let name = reader.peek(); // should be verified before this function is called
    reader.advance();
    return {
        type: 'atomic',
        name: name
    }
}

function parseParenthesisFormula(reader) {
    reader.advance(); // should be ( before this function is called

    let innerFormula = parseFormula(reader);

    if (reader.peek() !== ')')
        throw new Error('Expected to be ended with )');
    reader.advance();

    // make sure inner formula is innerFormula (prof rules)
    if (innerFormula.type !== 'composite')
        throw new Error('Paranthesis can only be used for composite formulas');

    return innerFormula;
}

function parsePrimary(reader) {
    let char = reader.peek();

    if (isValidPropName(char))
        return readAtomicFormula(reader);
    else if (char === '(')
        return parseParenthesisFormula(reader);
    else {
        let unaryOp = tryGetUnaryOperator(char);
        if (unaryOp) {
            reader.advance();
            return {
                type: 'composite',
                op: unaryOp,
                sub: [
                    parseFormula(reader)
                ]
            }
        }
    }

    throw new Error('Unk primary: ' + char);
}

function parseBinaryOperatorRightSide(reader, currentOperatorPrecedence, leftSide) {
    while (true) {
        let operator = tryGetBinaryOperator(reader.peek());

        if (!operator || operator.precedence < currentOperatorPrecedence)
            return leftSide;

        reader.advance();

        let rightSideFormulas = [parsePrimary(reader)];

        let nextOperator = tryGetBinaryOperator(reader.peek());

        while (nextOperator && nextOperator.id == operator.id && operator.composable) {
            reader.advance();
            rightSideFormulas.push(parsePrimary(reader));
            nextOperator = tryGetBinaryOperator(reader.peek());
        }

        if (nextOperator && operator.precedence < nextOperator.precedence) {
            rightSideFormulas = parseBinaryOperatorRightSide(reader, operator.precedence + 1, rightSideFormulas[rightSideFormulas.length-1]);
        }

        leftSide = {
            type: 'composite',
            op: operator,
            sub: [
                JSON.parse(JSON.stringify(leftSide)), // copy
            ].concat(rightSideFormulas)
        }
    }
}

export function parseFormula(reader) {
    let leftSide = parsePrimary(reader);

    return parseBinaryOperatorRightSide(reader, 0, leftSide);
}