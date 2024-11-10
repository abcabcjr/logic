
import { printFormulaState, printFormulaStateForNInterpretations } from "./hw/hw2.js";
import { showFormalSyntax, testEq, testLogicalConsequence } from './hw/hw3.js';
import { runDNF, runSimplifier, truthFunctionToFormula } from './hw/hw4.js';

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
let logicSymbols = ['∧', '∨', '¬', '⇔', '⇒', '∼', '⊨', '⊥', '⊤']

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

let simplifierBtn = document.getElementById('simplifierbtn');

simplifierBtn.onclick = function () {
    runSimplifier(inputElem.value.trim());
}

let dnfBtn = document.getElementById('dnftest');

dnfBtn.onclick = function () {
    runDNF(inputElem.value.trim());
}