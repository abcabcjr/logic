import { tryGetBinaryOperator, tryGetUnaryOperator } from './operators.js';
import { TextReader } from './reader.js';

function isValidPropName(name) {
    return /[A-Z]|⊥|⊤/.test(name);
}

function isDigit(char) {
    return /\d/.test(char);
}

function readAtomicFormula(reader) {
    let name = reader.peek(); // should be verified before this function is called
    reader.advance();

    while (isDigit(reader.peek())) {
        name += reader.peek();
        reader.advanceSimple();
    }
    reader.skipSpaces();

    let restricted = {
        '⊤': [true],
        '⊥': [false]
    };

    return {
        type: 'atomic',
        restrictedValues: restricted[name] || [true, false],
        name: name
    }
}

function parseParenthesisFormula(reader) {
    reader.advance(); // should be ( before this function is called

    let innerFormula = parseFormula(reader);

    if (reader.peek() !== ')')
        throw new ParseError('Expected formula to be ended with ), found ' + reader.peek() + ' instead.');
    reader.advance();

    // make sure inner formula is innerFormula (prof rules)
    if (innerFormula.type !== 'composite' || innerFormula.hasParen)
        throw new ParseError('Parentheses can only be used for composite formulas');

    innerFormula.hasParen = true;
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
                    parsePrimary(reader)
                ]
            }
        }
    }

    throw new ParseError('Expected formula, found ' + char + ' instead.');
}

function parseBinaryOperatorRightSide(reader, currentOperatorPrecedence, leftSide) {
    while (true) {
        let operator = tryGetBinaryOperator(reader.peek());

        if (!operator || operator.precedence < currentOperatorPrecedence)
            return leftSide;

        reader.advance();

        let rightSideFormulas = [parsePrimary(reader)];

        let nextOperator = tryGetBinaryOperator(reader.peek());

        console.warn('Op, next op');
        console.table(operator);
        console.table(nextOperator);

        while (nextOperator && nextOperator.id == operator.id && operator.composable) {
            reader.advance();
            rightSideFormulas.push(parsePrimary(reader));
            nextOperator = tryGetBinaryOperator(reader.peek());
        }

        console.warn('Next');
        if (nextOperator)
            console.warn(operator.precedence < nextOperator.precedence);

        if (nextOperator && operator.precedence < nextOperator.precedence) {
            rightSideFormulas = parseBinaryOperatorRightSide(reader, operator.precedence + 1, rightSideFormulas[rightSideFormulas.length-1]);
        }

        console.warn('Left side');
        console.table(leftSide);
        console.warn('Right side');
        console.table(rightSideFormulas);

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

export function parseNew(input) {
    const reader = new TextReader(input);

    try {
        const expression = parseFormula(reader);

        if (reader.hasNext())
            throw new ParseError('Expected expression to end, found' + reader.peek() + ' instead.');

        return expression;
    } catch (e) {
        if (e.name === 'ParseError')
            throw new DisplayParseError(input, reader.getPosition(), e.message);
        else throw e;
    }
}

function parseClause(reader) {
    if (reader.peek() !== '{')
        throw new ParseError('Expected { to start clause, found ' + reader.peek() + ' instead.');
    reader.advance();

    let clause = {};
    let isParsing = true;
    let clauseCanBeSimplified = false;

    while (isParsing) {
        if (reader.peek() === '}')
            break;

        let char = reader.peek();

        let isComplement = false;
    
        if (char === '¬') {
            isComplement = true;
            reader.advance();
        }
    
        let nameFormula = readAtomicFormula(reader);

        // already existed, wipe
        if ((clause[nameFormula.name] && isComplement) || (clause[nameFormula.name] === false && !isComplement)) {
            delete clause[nameFormula.name];
            clauseCanBeSimplified = true;
        } else clause[nameFormula.name] = !isComplement;

        if (reader.peek() !== ',')
            isParsing = false;
        else reader.advance();
    }

    if (reader.peek() !== '}')
        throw new ParseError('Expected clause to be ended with }, found ' + reader.peek() + ' instead.');
    reader.advance();

    return clauseCanBeSimplified ? null : clause;
}

export function parseClauseSet(input) {
    const reader = new TextReader(input);

    if (reader.peek() !== '{')
        throw new ParseError('Expected { to start clause set, found ' + reader.peek() + ' instead.');
    reader.advance();

    let clausesRaw = [];
    let propSet = new Set();

    while (reader.peek() !== '}') {
        const clause = parseClause(reader);
        clausesRaw.push(clause);

        for (let key in clause)
            propSet.add(key);

        if (reader.peek() === ',')
            reader.advance();
    }

    if (reader.peek() !== '}')
        throw new ParseError('Expected clause set to be ended with }, found ' + reader.peek() + ' instead.');

    let clauses = [];

    let props = Array.from(propSet).sort();

    for (let clause of clausesRaw) {
        if (clause === null)
            continue;
        // convert clause into number
        let converted = 0n;

        for (let i = 0; i < props.length; i++) {
            // 1 bit signifies if the proposition appears in the prop
            // 1 bit signifies truth/false
            converted |= ((1n << BigInt(i*2 + 1)) * ((typeof clause[props[i]] === 'boolean') ? 1n : 0n));
            converted |= ((1n << BigInt(i*2)) * BigInt(clause[props[i]] ? 1 : 0));
        }

        clauses.push(converted);
    }

    return {
        props: props,
        clauses: clauses
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