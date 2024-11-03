import { evaluateAst, formatInterpretation, getAllInterpretationsForAst, getSatisfiabilityState, isStateSatisfiable, isStateValid } from "./evaluate.js";
import { parseNew } from "./parser.js";
import { formatAstAsText, formatTableInfoAsHtmlTable } from './tools.js';

export function printFormulaState(formulaText) {
    let ast = null;
    try {
        ast = parseNew(formulaText);
        console.log('✔️️Formula ' + formulaText + ' is well formed!');
        console.log('Generated abstract syntax tree: <br></br>' + formatAstAsText(ast));
    } catch (e) {
        console.log(e.name + ': ' + e.message);
        console.log('❌ Formula is not well formed')
        return;
    }
    console.log('');

    let state = getSatisfiabilityState(ast);

    console.log(formatTableInfoAsHtmlTable(state.tableInfo).replace(/,/g, '').replace(/\n/g, ''));

    if (isStateValid(state)) {
        console.log('✔️Propositional formula ' + formulaText.trim() + ' is valid');
    } else {
        console.log('❌ Propositional formula ' + formulaText.trim() + ' is not valid');
        console.log('Unsatisfied by the following interpretations:');

        for (let i = 1; i <= state.satisfies.length; i++)
            console.log(`    ${i}. ${formatInterpretation(state.satisfies[i-1])}`);

        if (isStateSatisfiable(state)) {
            console.log('✔️However, formula is satisfiable under:');
        
            for (let i = 1; i <= state.satisfies.length; i++)
                console.log(`    ${i}. ${formatInterpretation(state.satisfies[i-1])}`);    
        } else {
            console.log('❌Formula is not satisfiable under any interpretation');
        }
    }
}

export function printFormulaStateForNInterpretations(formulaText, n) {
    let ast = null;
    try {
        ast = parseNew(formulaText);
        console.log('✔️Formula ' + formulaText + ' is well formed!');
        console.log('Generated abstract syntax tree: <br></br>' + formatAstAsText(ast));
    } catch (e) {
        console.log(e.name + ': ' + e.message);
        console.log('❌ Formula is not well formed')
        return;
    }
    console.log('');

    let interpretations = getAllInterpretationsForAst(ast);

    let interpIndices = [];

    for (let i = 0; i < n; i++) {
        let idx = -1;
        do {
            idx = Math.floor((Math.random()*interpretations.length));
            if (!interpIndices.includes(idx))
                interpIndices.push(idx);
            else idx = -1;
        } while (idx < 0);
    }

    for (let idx of interpIndices) {
        let evaluation = evaluateAst(ast, interpretations[idx]);

        if (evaluation)
            console.log('✔️Formula ' + formulaText + ' is TRUE for interpretation ' + formatInterpretation(interpretations[idx]));
        else console.log('❌Formula ' + formulaText + ' is FALSE for interpretation ' + formatInterpretation(interpretations[idx]));
    }
}