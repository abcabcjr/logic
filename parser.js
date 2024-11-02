import { tryGetBinaryOperator, tryGetUnaryOperator } from './operators.js';
import { TextReader } from './reader.js';

function isValidPropName(name) {
    return /[A-Z]/.test(name);
}

function parseComposite(reader) {
    if (reader.peek() !== '(')
        return null;

    reader.advance();

    let dominantOp = tryGetUnaryOperator(reader.peek());

    if (!dominantOp) {
        // binary
        let exp1 = parseExpression(reader);

        dominantOp = tryGetBinaryOperator(reader.peek());
        if (!dominantOp)
            throw new ParseError('Expected binary operator, found ' + reader.peek() + ' instead.');
        reader.advance();
        let exp2 = parseExpression(reader);

        if (reader.peek() !== ')')
            throw new ParseError('Expected composite formula to be ended with ), found ' + reader.peek() + ' instead.');
        reader.advance();

        return {
            type: 'composite',
            op: dominantOp,
            sub: [exp1, exp2]
        }
    } else {
        reader.advance();

        let exp1 = parseExpression(reader);

        if (reader.peek() !== ')')
            throw new ParseError('Expected composite formula to be ended with ), found ' + reader.peek() + ' instead.');
        reader.advance();

        return {
            type: 'composite',
            op: dominantOp,
            sub: [exp1]
        }
    }
}

function parseExpression(reader) {
    let char = reader.peek();

    // atomic branch
    if (isValidPropName(char)) {
        reader.advance();
        return {
            type: 'atomic',
            name: char
        }
    }

    // composite branch
    let expr = parseComposite(reader);

    if (!expr)
        throw new ParseError('Expected atomic or composite formula, found ' + char + ' instead.');

    return expr;
}

export function parseNew(input) {
    const reader = new TextReader(input);

    try {
        const expression = parseExpression(reader);

        if (reader.hasNext())
            throw new ParseError('Expected expression to end');

        return expression;
    } catch (e) {
        if (e.name === 'ParseError')
            throw new DisplayParseError(input, reader.getPosition(), e.message);
        else throw e;
    }
}

export class ParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ParseError';
    }
}

export class DisplayParseError extends Error {
    constructor(input, index, errMsg) {
        let name = 'ParseError (#' + index + ')';
        let formattedSpace = ' '.repeat(index + name.length + 2);
        super(`${input.trim()}\n${formattedSpace}|\n${formattedSpace}|-> ${errMsg}`);
        this.name = name;
        this.stack = null;
    }
}