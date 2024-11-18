import { chainUpAst } from "./treebuild.js";

export function convertToNandOnly(ast) {
    if (ast.type === 'atomic')
        return ast;

    let subs = [];
    for (let sub of ast.sub)
        subs.push(convertToNandOnly(sub));
    ast.sub = subs;

    if (ast.op.id === 'not')
        return chainUpAst([ast.sub[0], ast.sub[0]], 'nand');

    if (ast.op.id === 'and')
        return chainUpAst([
            chainUpAst(ast.sub, 'nand'),
            chainUpAst(ast.sub, 'nand')
        ], 'nand');

    if (ast.op.id === 'or')
        return chainUpAst([
            chainUpAst([ast.sub[0], ast.sub[0]], 'nand'),
            chainUpAst([ast.sub[1], ast.sub[1]], 'nand')
        ], 'nand');

    return ast;
}