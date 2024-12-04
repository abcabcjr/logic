import { DisplayParseError, ParseError } from '../parser.js';
import { tryGetBinaryOperator, tryGetUnaryOperator } from '../operators.js';
import { TextReader } from '../reader.js';

function isValidVariableName(name) {
    return /[a-z]/.test(name);
}

function isDigit(char) {
    return /\d/.test(char);
}

function readVariable(reader) {
    let name = reader.peek(); // should be verified before this function is called
    reader.advance();

    while (isDigit(reader.peek())) {
        name += reader.peek();
        reader.advanceSimple();
    }
    reader.skipSpaces();

    return {
        node: 'term',
        type: 'variable',
        name: name
    }
}

function parseParenthesisFormula(reader, signature) {
    reader.advance(); // should be ( before this function is called

    let innerFormula = parseFormula(reader, signature);

    if (reader.peek() !== ')')
        throw new ParseError('Expected formula to be ended with ), found ' + reader.peek() + ' instead.');
    reader.advance();

    // mb not?
    // make sure inner formula is innerFormula (prof rules)
    //if (innerFormula.type !== 'composite' || innerFormula.hasParen)
    //    throw new ParseError('Parentheses can only be used for composite formulas');

    innerFormula.hasParen = true;
    return innerFormula;
}

function parseFunction(functionData, reader, signature) {
    if (reader.peek() !== '(')
        throw new ParseError('Function/Predicate needs to be followed by parenthesis, found ' + reader.peek() + ' instead.');
    reader.advance();

    let args = [];

    if (reader.peek() !== ')') {
        do {
            args.push(parseFormula(reader, signature));
        } while (reader.peek() === ',' && reader.advance());
    }

    if (reader.peek() !== ')')
        throw new ParseError('Function/Predicate needs to be ended with ), found ' + reader.peek() + ' instead.');
    reader.advance();

    if (args.length !== functionData.arity)
        throw new ParseError(functionData.name + '() expected ' + functionData.arity + ' arguments, found ' + args.length + ' instead.');

    return {
        node: (functionData.type === 'predicate' ? 'formula' : 'term'),
        type: functionData.type,
        id: functionData.name,
        sub: args
    }
}

function parsePossibleFunctionOrPredicate(reader, signature) {
    let allFunctionNames = signature.getAllFunctionNames();

    for (let functionName of allFunctionNames) {
        if (reader.expectText(functionName))
            return parseFunction(signature.getFunction(functionName), reader, signature);
    }

    let allPredicateNames = signature.getAllPredicateNames();

    for (let predicateName of allPredicateNames) {
        if (reader.expectText(predicateName))
            return parseFunction(signature.getPredicate(predicateName), reader, signature);
    }

    return null;
}

function parsePossibleConstant(reader, signature) {
    let allConstants = signature.getAllConstants();

    for (let constant of allConstants) {
        if (reader.expectText(constant))
            return signature.getConstant(constant);
    }

    return null;
}

function parseQuantified(reader, signature) {
    let quantifierSymbol = reader.peek();
    let quantifier = signature.getQuantifierBySymbol(quantifierSymbol);

    reader.advance();

    if (!isValidVariableName(reader.peek()))
        throw new ParseError('Expected quantifier to be followed by a variable, found ' + reader.peek() + ' instead.');

    let variable = readVariable(reader, signature);

    let predicate = parsePrimary(reader, signature);

    if (!predicate)
        throw new ParseError('Expected formula node for quantifier ' + quantifierSymbol);

    if (predicate.node !== 'formula')
        throw new ParseError('Expected formula node for quantifier ' + quantifierSymbol + ' found ' + predicate.type + ' expression instead.');

    return {
        node: 'formula',
        type: 'quantified',
        quantifier: quantifier.id,
        sub: [
            variable,
            predicate
        ]
    }
}

function parsePrimary(reader, signature) {
    let char = reader.peek();

    let constant = parsePossibleConstant(reader, signature);

    if (constant)
        return constant;

    let parsedFn = parsePossibleFunctionOrPredicate(reader, signature);

    if (parsedFn)
        return parsedFn;

    if (signature.getQuantifierBySymbol(char))
        return parseQuantified(reader, signature);
    if (isValidVariableName(char))
        return readVariable(reader, signature);
    else if (char === '(')
        return parseParenthesisFormula(reader, signature);
    else {
        let unaryOp = tryGetUnaryOperator(char);
        if (unaryOp) {
            reader.advance();
            return {
                node: 'formula',
                type: 'operator',
                op: unaryOp.id,
                sub: [
                    expectFormula(parsePrimary(reader, signature))
                ]
            }
        }
    }

    throw new ParseError('Expected expression, found ' + char + ' instead.');
}

function expectFormula(value) {
    if (!value)
        throw new ParseError('Expected formula');

    if (value.node !== 'formula')
        throw new ParseError('Expected formula, found ' + value.type + ' instead.');

    return value;
}

function parseBinaryOperatorRightSide(reader, currentOperatorPrecedence, leftSide, signature) {
    while (true) {
        let operator = tryGetBinaryOperator(reader.peek());

        if (!operator || operator.precedence < currentOperatorPrecedence)
            return leftSide;

        reader.advance();

        let rightSideFormulas = [expectFormula(parsePrimary(reader, signature))];

        let nextOperator = tryGetBinaryOperator(reader.peek());

        while (nextOperator && nextOperator.id == operator.id && operator.composable) {
            reader.advance();
            rightSideFormulas.push(expectFormula(parsePrimary(reader, signature)));
            nextOperator = tryGetBinaryOperator(reader.peek());
        }

        if (nextOperator && operator.precedence < nextOperator.precedence) {
            rightSideFormulas = parseBinaryOperatorRightSide(reader, operator.precedence + 1, rightSideFormulas[rightSideFormulas.length-1], signature);
        }

        leftSide = {
            node: 'formula',
            type: 'operator',
            op: operator.id,
            sub: [
                JSON.parse(JSON.stringify(leftSide)), // copy
            ].concat(rightSideFormulas)
        }
    }
}

function parseFormula(reader, signature) {
    let leftSide = parsePrimary(reader, signature);

    if (leftSide && leftSide.node === 'formula')
        return parseBinaryOperatorRightSide(reader, 0, leftSide, signature);
    else return leftSide;
}

export function parseNewFirstOrder(input, signature) {
    const reader = new TextReader(input);

    try {
        const expression = parseFormula(reader, signature);

        if (reader.hasNext())
            throw new ParseError('Expected expression to end, found' + reader.peek() + ' instead.');

        return expression;
    } catch (e) {
        if (e.name === 'ParseError')
            throw new DisplayParseError(input, reader.getPosition(), e.message);
        else throw e;
    }
}