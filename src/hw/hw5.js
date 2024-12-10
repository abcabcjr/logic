import { convertToNandOnly } from "../convert.js";
import { parseNew } from "../parser.js";
import { makePipeline } from "../pipeline.js";
import { simplifyByQMC } from "../qmc.js";
import { convertToCNF, convertToDNF } from "../simplifier.js";
import { astToFormulaText, astToFormulaTextWithNInputGates, copyAst, formatAstAsText } from "../tools.js";
import { testEq } from "./hw3.js";

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

export function showDNFandCNF(formulaText) {
    let ast = parseStep(formulaText);

    if (!ast)
        return;

    let pipeline1 = makePipeline(convertToCNF);
    let cnf = pipeline1.start.apply(pipeline1, [copyAst(ast)]);
    //for (let i = 0; i < 100; i++)
    //    cnf = convertToCNF(cnf);
    let pipeline2 = makePipeline(convertToDNF);
    let dnf = pipeline2.start.apply(pipeline1, [copyAst(ast)]);
    //for (let i = 0; i < 100; i++)
    //    cnf = convertToDNF(dnf);

    //dnf = simplifyByQMC(dnf);

    console.log('DNF', astToFormulaTextWithNInputGates(dnf));
    console.log('CNF', astToFormulaTextWithNInputGates(cnf));

    console.log(formatAstAsText(dnf));
    console.log(formatAstAsText(cnf))

    testEq(astToFormulaTextWithNInputGates(dnf) + '∼' + astToFormulaTextWithNInputGates(cnf));
    testEq(formulaText + '∼' + astToFormulaTextWithNInputGates(cnf));
}

export function showNandOnly(formulaText) {
    // temp: ensure gates are binary
    let ast = parseNew(astToFormulaText(parseNew(formulaText)));

    console.log(astToFormulaText(convertToNandOnly(ast)));
}