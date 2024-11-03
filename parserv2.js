import { getSymbolForOperator } from './operators.js';

export function astToFormulaText(ast) {
    if (ast.type === 'atomic')
        return ast.name;

    let result = '(';

    // unary case
    if (ast.sub.length === 1)
        result += getSymbolForOperator(ast.op) + astToFormulaText(ast.sub[0]);
    else {
        // binary case
        result += ast.sub.map(subAst => astToFormulaText(subAst)).join(getSymbolForOperator(ast.op));
    }

    result += ')';
    return result;
}