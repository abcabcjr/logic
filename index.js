import { parseNew } from './parser.js';
import fs from 'fs';

let exprInput = [
    '(((P ⇒ Q) ∨ S) ⇔ T)',
    /*'((P ⇒ (Q ∧ (S ⇒ T))))',
    '(¬(B(¬Q)) ∧ R)',
    '(P ∧ ((¬Q) ∧ (¬(¬(Q ⇔ (¬R))))))',
    '((P ∨ Q) ⇒ ¬(P ∨ Q)) ∧ (P ∨ (¬(¬Q)))'*/
]

let output = '';

function out(str) {
    output += str + '\n';
}

let counter = 'a'

for (let expr of exprInput) {
    try {
        let parsed = parseNew(expr);
        out('(' + counter + ') ✔️ Formula ' + expr + ' is valid!');
        out('Generated abstract syntax tree: ' + JSON.stringify(parsed, null, 4));
    } catch (e) {
        out(e.name + ': ' + e.message);
        out('(' + counter + ') ❌ Formula is not valid')
    }
    out('\n');
    counter = String.fromCharCode(counter.charCodeAt(0) + 1)
}

fs.writeFileSync('out.txt', output);
