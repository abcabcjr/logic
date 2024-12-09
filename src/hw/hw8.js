import { parseNewFirstOrder } from "../firstorder/fopParser.js";
import { LanguageSignature } from "../firstorder/languageSignatureBuilder.js";

export function runFOPExpressionHW8(formulaText) {

    let signature = new LanguageSignature();

    /* Logical connectives */
    signature.registerOperator('not', 'unary', '¬', 50);
    signature.registerOperator('and', 'narity', '∧', 30, 2);
    signature.registerOperator('or', 'narity', '∨', 40, 2);
    signature.registerOperator('eq', 'narity', '⇔', 10, 2);
    signature.registerOperator('implies', 'narity', '⇒', 20, 2);

    /* Functions */
    signature.registerFunction('add', 2);
    signature.registerFunction('sub', 2);
    signature.registerFunction('mul', 2);
    signature.registerFunction('div', 2);

    signature.registerOperatorForFunction('add', '+', 10);
    signature.registerOperatorForFunction('sub', '-', 10);
    signature.registerOperatorForFunction('mul', '*', 20);
    signature.registerOperatorForFunction('div', '/', 20);

    signature.registerPredicate('P', 2);
    signature.registerPredicate('Q', 2);
    signature.registerPredicate('R', 3);
    signature.registerConstants(['a', 'b', 'c']);

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