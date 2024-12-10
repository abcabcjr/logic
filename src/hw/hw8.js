import { parseNewFirstOrder } from "../firstorder/fopParser.js";
import { LanguageSignature } from "../firstorder/languageSignatureBuilder.js";

export function runFOPExpressionHW8(formulaText) {

    let signature = new LanguageSignature();

    /* Logical connectives */
    signature.registerLogicalOperator('not', 'unary', '¬', 50);
    signature.registerLogicalOperator('and', 'narity', '∧', 30, 2);
    signature.registerLogicalOperator('or', 'narity', '∨', 40, 2);
    signature.registerLogicalOperator('eq', 'narity', '⇔', 10, 2);
    signature.registerLogicalOperator('implies', 'narity', '⇒', 20, 2);

    /* Functions */
    signature.registerFunction('add', 2);
    signature.registerFunction('sub', 2);
    signature.registerFunction('mul', 2);
    signature.registerFunction('div', 2);
    signature.registerFunction('pow', 2);
    signature.registerFunction('sqrt', 1);

    signature.registerOperatorForFunction('add', '+', 10);
    signature.registerOperatorForFunction('sub', '−', 10);
    signature.registerOperatorForFunction('mul', '*', 20);
    signature.registerOperatorForFunction('div', '/', 30);
    signature.registerOperatorForFunction('pow', '^', 40);
    signature.registerOperatorForFunction('sqrt', '√', 40);

    /* Predicates */
    signature.registerPredicate('greater', 2);
    signature.registerPredicate('lesser', 2);
    signature.registerPredicate('eq', 2);
    signature.registerPredicate('greateroreq', 2);
    signature.registerPredicate('lesseroreq', 2);
    signature.registerPredicate('belongsin', 2);

    signature.registerOperatorForPredicate('eq', '=', 10);
    signature.registerOperatorForPredicate('greater', '>', 20);
    signature.registerOperatorForPredicate('lesser', '<', 20);
    signature.registerOperatorForPredicate('greateroreq', '≥', 20);
    signature.registerOperatorForPredicate('lesseroreq', '≤', 20);
    signature.registerOperatorForPredicate('belongsin', '∈')

    /* Quantifiers */
    signature.registerQuantifier('exists', '∃');
    signature.registerQuantifier('every', '∀');

    /* Constants */
    signature.registerConstants(['R', 'N']);
    signature.registerConstant('numbers', /^[0-9]+$/, 'number', parseInt);

    let ast = null;
    try {
        ast = parseNewFirstOrder(formulaText, signature);
        console.log('✔️Expression ' + formulaText + ' is well formed!');
        console.log('Generated abstract syntax tree: <br></br>');
    } catch (e) {
        console.log(e.name + ': ' + e.message);
        console.log('❌ Expression is not well formed')
        return;
    }
    console.log('');
    console.log(JSON.stringify(ast, null, 4));
}