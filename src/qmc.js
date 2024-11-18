import { getAllAtomicNamesFromAst } from './evaluate.js';
import { isFormulaSingleTerm } from './simplifier.js';
import { chainUpAst, makeAtomic, negateFormula } from './treebuild.js';

function assert(condition) {
    if (!condition)
        throw new Error('Assertion failed');
}

export function simplifyByQMC(ast) {
    let propSet = new Set();
    getAllAtomicNamesFromAst(ast, propSet);
    let propList = Array.from(propSet);
    let propIdxMap = {};

    for (let i = 0; i < propList.length; i++)
        propIdxMap[propList[i]] = i;

    if (isFormulaSingleTerm(ast))
        return ast;

    // Formula must be a SOP
    if (ast.op.id === 'and') {
        ast = {
            type: 'composite',
            op: {
                id: 'or'
            },
            sub: [ast]
        }
    }
    assert(ast.op.id === 'or');

    let minTerms = new Set();

    for (let product of ast.sub) {
        let term = (new Array(propList.length)).fill('-');

        if (isFormulaSingleTerm(product)) {
            let name = product.name || (product.sub[0].name);
            term[propIdxMap[name]] = product.type === 'atomic' ? '1' : '0';
        } else {
            assert(product.op.id === 'and');
            for (let subTerm of product.sub) {
                let name = subTerm.name || (subTerm.sub[0].name);
                term[propIdxMap[name]] = subTerm.type === 'atomic' ? '1' : '0';
            }
        }

        let newTerms = [];

        expandMinterm(term, newTerms);

        for (let newMinterm of newTerms)
            minTerms.add(newMinterm.join(''));
    }

    let minTermsArr = Array.from(minTerms);

    let primeImplicants = getPrimeImplicants(minTermsArr);

    let chart = createPrimeImplicantChart(primeImplicants, minTermsArr);

    let essentialImplicants = [];

    for (let i = 0; i < minTermsArr.length; i++) {
        let implicant = null;
        let allowed = true;

        for (let testImplicant in chart) {
            if (implicant === null && chart[testImplicant][i] === '1')
                implicant = testImplicant;
            else if (implicant && chart[testImplicant][i] === '1') {
                allowed = false;
                break;
            }
        }

        if (implicant && allowed) {
            if (!essentialImplicants.includes(implicant))
                essentialImplicants.push(implicant);
        }
    }

    // it's tree building time
    let conjunctionNodes = [];

    for (let implicant of essentialImplicants) {
        let nodes = [];

        for (let charIdx in implicant) {
            let atomic = makeAtomic(propList[charIdx]);
            let value = implicant[charIdx];
            if (value === '-')
                continue;

            nodes.push(value === '1' ? atomic : negateFormula(atomic));
        }

        conjunctionNodes.push(chainUpAst(nodes, 'and'));
    }

    if (conjunctionNodes.length === 0 || (conjunctionNodes.length === 1 && conjunctionNodes[0].type === 'composite' && conjunctionNodes[0].sub.length === 0))
        return makeAtomic('⊤');

    return chainUpAst(conjunctionNodes, 'or');
}

function expandMinterm(minTerm, list) {
    for (let i = 0; i < minTerm.length; i++) {
        if (minTerm[i] === '-') {
            minTerm[i] = '0';
            expandMinterm(minTerm.slice(0), list);
            minTerm[i] = '1';
            expandMinterm(minTerm.slice(0), list);
            return;
        }
    }

    list.push(minTerm.slice(0));
}

// https://en.wikipedia.org/wiki/Quine%E2%80%93McCluskey_algorithm

function getPrimeImplicants(minTerms) {
    let primeImplicants = [];
    let merges = (new Array(minTerms.length)).fill(false);
    let numberOfMerges = 0;
    let mergedMinTerm = '', minterm1 = '', minterm2 = '';

    for (let i = 0; i < minTerms.length; i++) {
        for (let c = i + 1; c < minTerms.length; c++) {
            minterm1 = minTerms[i];
            minterm2 = minTerms[c];

            if (checkDashesAlign(minterm1, minterm2) && checkMinTermDifferences(minterm1, minterm2)) {
                mergedMinTerm = mergeMinterms(minterm1, minterm2);

                if (!primeImplicants.includes(mergedMinTerm))
                    primeImplicants.push(mergedMinTerm);
                numberOfMerges++;
                merges[i] = true;
                merges[c] = true;
            }
        }
    }

    for (let j = 0; j < minTerms.length; j++) {
        if (!merges[j] && !primeImplicants.includes(minTerms[j]))
            primeImplicants.push(minTerms[j]);
    }

    if (numberOfMerges == 0)
        return primeImplicants;
    else return getPrimeImplicants(primeImplicants);
}

function checkDashesAlign(minterm1, minterm2) {
    for (let i = 0; i < minterm1.length; i++)
        if (minterm1[i] !== '-' && minterm2[i] === '-')
            return false;
    return true;
}

function strMintermToInt(minterm) {
    return parseInt(minterm.replace(/-/g, '0'), 2);
}

function checkMinTermDifferences(minterm1, minterm2) {
    let res = strMintermToInt(minterm1) ^ strMintermToInt(minterm2);
    return res !== 0 && (res & res - 1) == 0;
}

function mergeMinterms(minterm1, minterm2) {
    let mergedMinTerm = '';

    for (let i = 0; i < minterm1.length; i++)
        if (minterm1[i] !== minterm2[i])
            mergedMinTerm += '-';
        else mergedMinTerm += minterm1[i];

    return mergedMinTerm;
}

function createPrimeImplicantChart(primeImplicants, minTerms) {
    let chart = {};

    for (let implicant of primeImplicants)
        chart[implicant] = '';

    for (let implicant in chart) {
        let regexp = convertToRegExp(implicant);

        for (let minterm of minTerms) {
            if (implicant === minterm || regexp.test(minterm))
                chart[implicant] += '1';
            else chart[implicant] += '0';
        }
    }

    return chart;
}

function convertToRegExp(implicant) {
    let regexp = '';
    for (let i = 0; i < implicant.length; i++)
        if (implicant[i] === '-')
            regexp += '\\d';
        else regexp += implicant[i];

    return new RegExp(regexp);
}