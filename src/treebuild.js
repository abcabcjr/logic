
export function negateFormula(ast) {
    return {
        type: 'composite',
        op: {
            id: 'not'
        },
        sub: [ast]
    }
}

export function chainUpAst(asts, operatorId) {
    if (asts.length === 1)
        return asts[0];
    return {
        type: 'composite',
        op: {
            id: operatorId
        },
        sub: asts
    }
}

export function makeAtomic(name) {
    return {
        type: 'atomic',
        name: name
    }
}