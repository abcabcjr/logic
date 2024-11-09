import { getSymbolForOperator } from './operators.js';

export function formatTableInfoAsHtmlTable(tableInfo) {
    let formulas = Object.keys(tableInfo);

    return `
    <table>
        <tr>
            ${formulas.map(formula => `<th>${formula}</th>`)}
        </tr>
        ${tableInfo[formulas[0]].map((_, index) => `
            <tr>
                ${formulas.map(entry => `<td>${tableInfo[entry][index] ? '✔️️' : '❌'}</td>`)}
            </tr>
        `)}
    </table>
    `;
}

/* Tree viewing */

function formatAst(ast, indent, pre = '', last='├─ ') {
    let indentText = indent;

    if (ast.type === 'atomic')
        return pre + indentText + last + `<span style="font-weight:bold;">${ast.name}</span>` + '<br><br/>';
    else {
        let text = '';
        text += indentText + last + `<span style="font-weight:bold;">${getSymbolForOperator(ast.op)}</span>` + '<br><br/>';
        for (let i = 0; i < ast.sub.length; i++)
            text += formatAst(ast.sub[i], indent + `${i < ast.sub.length-1 ? ' ' : ' '}   `, '', (i === ast.sub.length - 1) ? '└─ ' : '├─ ');
        return text;
    }
}

export function formatAstAsText(ast) {
    return '<div style="line-height: 0.5em;">' + formatAst(ast, '') + '</div>';
}

/* Tables */

export function parseTsvTable(tsvData) {
    let lines = tsvData.split('\n');

    let tableInfo = {};

    let entries = lines[0].split('\t');
    lines = lines.slice(1);
    for (let entry of entries)
        tableInfo[entry] = [];

    for (let line of lines) {
        let split = line.split('\t');
        for (let entryIdx in entries)
            tableInfo[entries[entryIdx]].push(split[entryIdx] === '1');
    }

    return tableInfo;
}