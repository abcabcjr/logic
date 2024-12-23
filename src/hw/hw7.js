import { parseNewFirstOrder } from "../firstorder/fopParser.js";
import { LanguageSignature } from "../firstorder/languageSignatureBuilder.js";

export function runFOPExpression(formulaText) {

    let signature = new LanguageSignature();

    signature.registerOperator('not', 'unary', '¬', 50);
    signature.registerOperator('and', 'narity', '∧', 30, 2);
    signature.registerOperator('or', 'narity', '∨', 40, 2);
    signature.registerOperator('nand', 'narity', '|', 30, 2);
    signature.registerOperator('nor', 'narity', '▽', 40, 2);
    signature.registerOperator('eq', 'narity', '⇔', 10, 2);
    signature.registerOperator('implies', 'narity', '⇒', 20, 2);

    signature.registerFunction('f', 2);
    signature.registerFunction('g', 1);
    signature.registerFunction('h', 3);

    signature.registerPredicate('P', 2);
    signature.registerPredicate('Q', 2);
    signature.registerPredicate('R', 3);

    signature.registerConstants(['a', 'b', 'c']);

    signature.registerQuantifier('exists', '∃');
    signature.registerQuantifier('every', '∀');

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