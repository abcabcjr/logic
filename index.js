
import { printFormulaState, printFormulaStateForNInterpretations } from "./hw2.js";

console.log = function(...a) {
    document.body.innerHTML += '<div>' + a.join(' ').replace(/\n/g, '<br>') + '</div>';
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