
import { printFormulaState, printFormulaStateForNInterpretations } from "./hw2.js";
import { showFormalSyntax, testEq, testLogicalConsequence } from './hw3.js';
import { truthFunctionToFormula } from './hw4.js';

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
    let formula = truthFunctionToFormula(inputElem.value.trim());
}