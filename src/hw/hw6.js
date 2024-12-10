import { applyDPLL, createConjunctionAstFromClauseSet, findSatisfiabilityStateForClauseSet } from "../clausesets.js";
import { formatInterpretation, getSatisfiabilityState, isStateSatisfiable, isStateValid } from "../evaluate.js";
import { parseClauseSet, parseNew } from "../parser.js";
import { makePipeline } from "../pipeline.js";
import { convertToCNF } from "../simplifier.js";
import { astToFormulaText, astToFormulaTextWithNInputGates, formatAstAsText, formatTableInfoAsHtmlTable } from "../tools.js";

export function checkClauseSet(input) {
    let clauseSet = parseClauseSet(input);
    let clauses = clauseSet.clauses.slice(0);

    //console.log(JSON.stringify(clauseSet.clauses.map(clause => clause.toString(2))));
    console.log('Is satisfiable: ' + findSatisfiabilityStateForClauseSet(clauseSet));
    console.log('Is satisfiable by DPLL: ' + applyDPLL(clauseSet.props, clauses));

    let ast = createConjunctionAstFromClauseSet(clauseSet.props, clauseSet.clauses);
    //console.log(formatAstAsText(ast));
    return;

    let state = getSatisfiabilityState(ast);

    console.log(formatTableInfoAsHtmlTable(state.tableInfo).replace(/,/g, '').replace(/\n/g, ''));

    if (isStateValid(state)) {
        console.log('✔️Propositional formula is valid');
    } else {
        console.log('❌ Propositional formula is not valid');
        console.log('Unsatisfied by the following interpretations:');

        for (let i = 1; i <= state.satisfies.length; i++)
            console.log(`    ${i}. ${formatInterpretation(state.satisfies[i - 1])}`);

        if (isStateSatisfiable(state)) {
            console.log('✔️However, formula is satisfiable under:');

            for (let i = 1; i <= state.satisfies.length; i++)
                console.log(`    ${i}. ${formatInterpretation(state.satisfies[i - 1])}`);
        } else {
            console.log('❌Formula is not satisfiable under any interpretation');
        }
    }
}

export function cnfToClauseSet(input) {
    let ast = parseNew(input.trim());

    let pipeline = makePipeline(convertToCNF);
    let converted = pipeline.start.apply(pipeline, [ast]);

    let clauses = [];

    if (converted.type === 'atomic')
        clauses.push('{' + converted.name + '}');
    else if (converted.op.id === 'not')
        clauses.push('{¬' + converted.name + '}');
    else for (let sub of converted.sub) {
        let clause = [];

        if (sub.type === 'composite') {
            if (sub.op.id === 'not')
                clause.push('¬' + sub.sub[0].name);
            else for (let literal of sub.sub) {
                if (literal.type === 'atomic')
                    clause.push(literal.name);
                else if (literal.type === 'composite' && literal.op.id === 'not')
                    clause.push('¬' + literal.sub[0].name);
            }
        } else {
            clause.push(sub.name)
        }

        clauses.push('{' + clause.join(', ') + '}');
    }

    console.log('{' + clauses.join(', ') + '}');
}