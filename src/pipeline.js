import { astToFormulaText } from "./tools.js";

export function makePipeline(startFn) {
    return {
        startFn: startFn,
        originalAst: [],
        steps: [],
        record: function (step, msg) {
            let newAst = astToFormulaText(step);
            let oldAst = this.originalAst.pop();

            if (msg) {
                this.steps.push({
                    step: msg,
                    new: newAst,
                    original: oldAst
                });
            }

            this.originalAst.push(newAst);

            return this.startFn(step, this);
        },
        start: function (ast) {
            ast = structuredClone(ast);
            this.originalAst.push(astToFormulaText(ast));
            return this.startFn(ast, this);
        }
    }
}