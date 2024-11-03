import { combinePropSet, formatInterpretation, getCombinedEvaluation, getSatisfiabilityState } from './evaluate.js';
import { parseNew } from './parser.js';
import { astToFormulaText } from './parserv2.js';
import { formatTableInfoAsHtmlTable } from './tools.js';

function parseStep(formulaText) {
    let ast = null;
    try {
        ast = parseNew(formulaText);
        console.log('✔️️Formula ' + formulaText + ' is well formed!');
    } catch (e) {
        console.log(e.name + ': ' + e.message);
        console.log('❌ Formula ' + formulaText + ' is not well formed')
        return;
    }

    return ast;
}

export function showFormalSyntax(formulaText) {
    let ast = null;
    try {
        ast = parseNew(formulaText);
        console.log('✔️️Formula ' + formulaText + ' is well formed!');
        console.log('Strong syntax: ' + astToFormulaText(ast));
    } catch (e) {
        console.log(e.name + ': ' + e.message);
        console.log('❌ Formula ' + formulaText + ' is not well formed')
        return;
    }

    return ast;
}

export function generateCheckableState(state) {
    return {
        satisfies: state.satisfies.map(ref => formatInterpretation(ref)),
        unsatisfies: state.satisfies.map(ref => formatInterpretation(ref)),
    }
}

export function printEqDifferences(checkable1, checkable2) {
    for (let interp of checkable1.satisfies) {
        if (checkable2.unsatisfies.includes(interp)) {
            console.log(interp + ' satisfies formula 1, but not formula 2');
        }
    }

    for (let interp of checkable2.satisfies) {
        if (checkable1.unsatisfies.includes(interp)) {
            console.log(interp + ' satisfies formula 2, but not formula 1');
        }
    }
}

export function testEq(input) {
    let [formula1, formula2] = input.split('∼');

    console.log('⏳Checking ' + input.trim() + '!');
    let ast1 = parseStep(formula1);
    let ast2 = parseStep(formula2);

    if (!ast1 || !ast2) {
        console.log('❌Failed to check, can not parse.');
    }

    let propSet = combinePropSet(ast1, ast2);

    let state1 = getSatisfiabilityState(ast1, propSet);
    let state2 = getSatisfiabilityState(ast2, propSet);

    console.log(formatTableInfoAsHtmlTable(state1.tableInfo).replace(/,/g, '').replace(/\n/g, ''));
    console.log(formatTableInfoAsHtmlTable(state2.tableInfo).replace(/,/g, '').replace(/\n/g, ''));

    let checkable1 = generateCheckableState(state1);
    let checkable2 = generateCheckableState(state2);

    if (checkable1.satisfies.length !== checkable2.satisfies.length) {
        printEqDifferences(checkable1, checkable2);
        console.log('❌Formulas are not logically equivalent');
        return;
    }

    if (checkable1.unsatisfies.length !== checkable2.unsatisfies.length) {
        printEqDifferences(checkable1, checkable2);
        console.log('❌Formulas are not logically equivalent');
        return;
    }

    for (let interp of checkable1.satisfies) {
        if (!checkable2.satisfies.includes(interp)) {
            printEqDifferences(checkable1, checkable2);
            console.log('❌Formulas are not logically equivalent');
            return;
        }
    }

    for (let interp of checkable1.unsatisfies) {
        if (!checkable2.unsatisfies.includes(interp)) {
            printEqDifferences(checkable1, checkable2);
            console.log('❌Formulas are not logically equivalent');
            return;
        }
    }

    console.log('✔️️Formulas are logically equivalent');
}

export function testLogicalConsequence(input) {
    let asts = [];
    let formulaTexts = [];

    console.log('⏳Checking ' + input.trim() + '!');

    let [leftHandSide, rightHandSide] = input.split('⊨');
    let leftSideFormulas = leftHandSide.split(',');

    for (let formula of leftSideFormulas) {
        let ast = parseStep(formula);
        if (!ast) {
            console.log('❌Logical consequence test failed to parse');
            return;
        }
        asts.push(ast);
        formulaTexts.push(astToFormulaText(ast));
    }

    let rightSideAst = parseStep(rightHandSide);
    if (!rightSideAst) {
        console.log('❌Logical consequence test failed to parse');
        return;
    }

    asts.push(rightSideAst);
    formulaTexts.push(astToFormulaText(rightSideAst));

    let table = getCombinedEvaluation.apply(null, asts);

    console.log(formatTableInfoAsHtmlTable(table).replace(/,/g, '').replace(/\n/g, ''));

    let keys = Object.keys(table);

    let doesHold = false;

    for (let i = 0; i < table[keys[0]].length; i++) {
        let holds = true;

        for (let formula of formulaTexts) {
            if (!table[formula][i]) {
                holds = false;
                break;
            }
        }
        
        if (holds) {
            doesHold = true;
            break;
        }
    }

    if (doesHold)
        console.log('✔️Logical consequence ' + input.trim() + ' holds!');
    else console.log('❌Logical consequence ' + input.trim() + ' does NOT hold!');
}