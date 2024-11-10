import { parseNew } from '../parser.js';
import { simplifyByQMC } from '../qmc.js';
import { simplifyFormula } from '../simplifier.js';
import { convertToDNF } from '../simplifierv2.js';
import { parseTsvTable, astToFormulaText, formatAstAsText, astToFormulaTextWithNInputGates } from '../tools.js';
import { testEq } from './hw3.js';

export function truthFunctionToFormula(tsvFn) {
    let parsed = parseTsvTable(tsvFn);
    
    let args = [];

    let keys = Object.keys(parsed);
    let inputKeys = keys.slice();
    inputKeys.pop(); // get rid of output key
    let tableLength = parsed[keys[0]].length;

    let outputKey = keys[keys.length-1];

    for (let i = 0; i < tableLength; i++) {
        // result has to be true
        if (!parsed[outputKey][i])
            continue;

        let conjuctionArgs = [];
        
        for (let variableName of inputKeys)
            conjuctionArgs.push(parsed[variableName][i] ? {
                type: 'atomic',
                name: variableName
            } : {
                type: 'composite',
                op: {
                    id: 'not'
                },
                sub: [
                    {
                        type: 'atomic',
                        name: variableName
                    }
                ]
            });

        args.push(conjuctionArgs.length === 1 ? conjuctionArgs[0] : {
            type: 'composite',
            op: {
                id: 'and'
            },
            sub: conjuctionArgs
        });
    }

    let formulaAst = args.length === 1 ? args[0] : {
        type: 'composite',
        op: {
            id: 'or'
        },
        sub: args
    };

    console.log('Output: ' + astToFormulaText(formulaAst))
    console.log('Simplified: ' + astToFormulaText(simplifyFormula(formulaAst)));
}

export function runSimplifier(formulaText) {
    let parsed = parseNew(formulaText);

    let simplified = simplifyFormula(parsed);
    console.log(formatAstAsText(simplified));
    console.log(astToFormulaText(simplified));
    testEq(formulaText + '∼' + astToFormulaText(simplified));
}

export function runDNF(formulaText) {
    let parsed = parseNew(formulaText);

    console.log('OG:')
    console.log(formatAstAsText(parsed));
    console.log('NEW:');
    let simplified = convertToDNF(parsed);
    console.log(formatAstAsText(simplified));
    console.log(astToFormulaTextWithNInputGates(simplified));
    let qmced = simplifyByQMC(simplified);
    console.log(formatAstAsText(qmced));
    console.log(astToFormulaText(qmced));
    testEq(formulaText + '∼' + astToFormulaText(simplified));
}