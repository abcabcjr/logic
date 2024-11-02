import { parseFormula } from './parserv2.js';
import { TextReader } from './reader.js';

console.dir(parseFormula(new TextReader('P ∧ (Q ∨ (B∨B) ∧ G)')), {
    depth: 10000
})