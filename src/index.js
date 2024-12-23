
import { findSatisfiabilityStateForClauseSet } from "./clausesets.js";
import { printFormulaState, printFormulaStateForNInterpretations } from "./hw/hw2.js";
import { showFormalSyntax, testEq, testLogicalConsequence } from './hw/hw3.js';
import { runDNF, truthFunctionToFormula } from './hw/hw4.js';
import { showDNFandCNF, showNandOnly } from "./hw/hw5.js";
import { checkClauseSet, cnfToClauseSet } from "./hw/hw6.js";
import { runFOPExpression } from "./hw/hw7.js";
import { runFOPExpressionHW8 } from "./hw/hw8.js";

let contentElem = document.getElementById('content');

console.log = function(...a) {
    contentElem.innerHTML += '<div>' + a.join(' ').replace(/\n/g, '<br>') + '</div>';
}

let inputElem = document.getElementById('input-text');
let runBtn = document.getElementById('run')
let runBtn2 = document.getElementById('run2')

runBtn.onclick = function () {
    let inputs = inputElem.value.split('\n');

    for (let input of inputs)
        if (input.trim() !== '')
            printFormulaState(input);    
}

runBtn2.onclick = function () {
    let inputs = inputElem.value.split('\n');

    for (let input of inputs)
        if (input.trim() !== '')
            printFormulaStateForNInterpretations(input, 3);    
}

let formalBtn = document.getElementById('formalbtn');

formalBtn.onclick = function () {
    let inputs = inputElem.value.split('\n');

    for (let input of inputs) {
        showFormalSyntax(input);
    }
}

let eqBtn = document.getElementById('eqtest');

eqBtn.onclick = function () {
    let inputs = inputElem.value.split('\n');

    for (let input of inputs) {
        testEq(input);
    }
}

let lcBtn = document.getElementById('lctest');

lcBtn.onclick = function () {
    let inputs = inputElem.value.split('\n');

    for (let input of inputs) {
        testLogicalConsequence(input);
    }
}

let helperWrapper = document.getElementById('helper');
let logicSymbols = ['∧', '∨', '¬', '⇔', '⇒', '∼', '⊨', '⊥', '⊤', '∃', '∀', '≥', '≤', '∈']

for (let symbol of logicSymbols) {
    let btn = document.createElement('button');
    btn.innerHTML = symbol;

    btn.onclick = function () {
        inputElem.value += symbol;
    }

    helperWrapper.appendChild(btn);
}

let truthfnBtn = document.getElementById('truthfn');

truthfnBtn.onclick = function () {
    truthFunctionToFormula(inputElem.value.trim());
}

/*let simplifierBtn = document.getElementById('simplifierbtn');

simplifierBtn.onclick = function () {
    runSimplifier(inputElem.value.trim());
}*/

let dnfBtn = document.getElementById('dnftest');

dnfBtn.onclick = function () {
    runDNF(inputElem.value.trim());
}

let dnfcnfBtn = document.getElementById('dnfandcnf');

dnfcnfBtn.onclick = function () {
    showDNFandCNF(inputElem.value.trim());
}

let nandonlyBtn = document.getElementById('nandonly');

nandonlyBtn.onclick = function () {
    showNandOnly(inputElem.value.trim())
}

let checkClauseSetBtn = document.getElementById('clausesethw6');

checkClauseSetBtn.onclick = function () {
    checkClauseSet(inputElem.value.trim());
}

let cnfToClauseBtn = document.getElementById('cnftoclause');

cnfToClauseBtn.onclick = function () {
    cnfToClauseSet(inputElem.value.trim());
}

let fopparseBtn = document.getElementById('fopparse');

fopparseBtn.onclick = function () {
    runFOPExpression(inputElem.value.trim());
}

let fopparseBtnHW8 = document.getElementById('fopparsehw8');

fopparseBtnHW8.onclick = function () {
    runFOPExpressionHW8(inputElem.value.trim());
}