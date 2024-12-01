import { chainUpAst, makeAtomic, negateFormula } from "./treebuild.js";

function getBitAtPos(num, pos) {
    return (num >> pos) & 1;
}

function clearBitAtPos(num, pos) {
    num &= ~(1 << pos);
    return num;
}

function getClausePropState(propIndex, clause) {
    if (!getBitAtPos(clause, propIndex*2+1))
        return { exists: false };

    return { exists: true, value: (getBitAtPos(clause, propIndex*2) ? true : false) }
}

function printClause(props, clause) {
    let values = [];

    for (let i = 0; i < props.length; i++) {
        let state = getClausePropState(i, clause);

        if (state.exists)
            values.push(state.value ? props[i] : ('¬' + props[i]));
    }

    return '{ ' + values.join(', ') + ' }';
}

function mergeClauses(props, clause1, clause2) {
    for (let i = 0; i < props.length; i++) {
        let state1 = getClausePropState(i, clause1);
        let state2 = getClausePropState(i, clause2);

        // we have A or notA, scrap this
        if (state1.exists && state2.exists && state1.value !== state2.value)
            return -1;
    }

    return clause1 | clause2;
}

function getResolvents(props, clause1, clause2) {
    let resolvents = [];

    for (let i = 0; i < props.length; i++) {
        let clause1State = getClausePropState(i, clause1);
        let clause2State = getClausePropState(i, clause2);

        if (clause1State.exists && clause2State.exists && (clause1State.value !== clause2State.value)) {
            let newClause1 = clearBitAtPos(clause1, i*2);
            newClause1 = clearBitAtPos(clause1, i*2+1);
            let newClause2 = clearBitAtPos(clause2, i*2);
            newClause2 = clearBitAtPos(clause2, i*2+1);

            let resolvent = mergeClauses(props, newClause1, newClause2);
            // resolvent is a tautalogy => -1
            if (resolvent !== -1) {
                resolvent = clearBitAtPos(resolvent, i*2);
                resolvent = clearBitAtPos(resolvent, i*2+1);
                resolvents.push(resolvent);
            }
        }
    }

    return resolvents;
}

function getSingleLiteral(props, clause) {
    let curPropState = null;
    let index = 0;

    for (let i = 0; i < props.length; i++) {
        let propState = getClausePropState(i, clause);

        if (propState.exists && !curPropState) {
            curPropState = propState;
            index = i;
        } else if (propState.exists)
            return null;
    }

    if (curPropState)
        curPropState.index = index;
    return curPropState;
}

function applyDP(props, clauses) {
    //return clauses;
    console.log('Before DP clauses: ' + clauses.map(clause => printClause(props, clause)).join(', '));

    // literal rule
    for (let clause of clauses) {
        if (clause === null)
            continue;

        let literal = getSingleLiteral(props, clause);

        if (!literal)
            continue;

        // delete literal from all clauses
        for (let i = 0; i < clauses.length; i++) {
            if (clauses[i] === null)
                continue;

            let literalState = getClausePropState(literal.index, clauses[i]);

            if (literalState.exists && literalState.value !== literal.value) {
                clauses[i] = clearBitAtPos(clauses[i], literal.index*2);
                clauses[i] = clearBitAtPos(clauses[i], literal.index*2+1);
            }

            // check if we should delete clause
            if (literalState.exists && literalState.value === literal.value) {
                clauses[i] = null;
            }
        }
    }

    // pure literal rule
    for (let i = 0; i < props.length; i++) {
        let propStateCur = null;
        let ok = true;

        for (let j = 0; j < clauses.length; j++) {
            if (clauses[j] === null)
                continue;

            let propState = getClausePropState(i, clauses[j]);

            if (propStateCur === null && propState.exists)
                propStateCur = propState;
            else if (propStateCur !== null && propState.exists && propStateCur.value !== propState.value) {
                ok = false;
            }
        }

        if (ok && propStateCur !== null) {
            // Delete clauses containing pure literal
            for (let j = 0; j < clauses.length; j++)
                if (clauses[j] !== null && getClausePropState(i, clauses[j]).exists)
                    clauses[j] = null;
        }
    }

    const newClauses = clauses.filter(clause => clause !== null);
    console.log('After DP clauses (Rule I, II): ' + (newClauses.length > 0 ? newClauses.map(clause => printClause(props, clause)).join(', ') : 'none remaining'));
    return newClauses;
}

export function findSatisfiabilityStateForClauseSet({ props, clauses }) {
    let clauseSetCopy = applyDP(props, JSON.parse(JSON.stringify(clauses)));

    for (let clause of clauseSetCopy)
        if (clause === 0)
            return false;

    let stop = false;

    while (!stop) {
        let changed = false;

        for (let i = 0; i < clauseSetCopy.length; i++) {
            for (let j = i+1; j < clauseSetCopy.length; j++) {
                let clause1 = clauseSetCopy[i];
                let clause2 = clauseSetCopy[j];

                if (clause1 === 0 || clause2 === 0)
                    return false;

                let resolvents = getResolvents(props, clause1, clause2);

                for (let resolvent of resolvents) {
                    console.log('Resolvent: ' + printClause(props, clause1) + ' + ' + printClause(props, clause2) + ' -> ' + printClause(props, resolvent));
                    if (!clauseSetCopy.includes(resolvent)) {
                        if (resolvent === 0)
                            return false;
                        clauseSetCopy.push(resolvent);
                        changed = true;
                    }
                }

                // apply DP continously
                if (changed)
                    clauseSetCopy = applyDP(props, clauseSetCopy);

            }
        }

        if (!changed)
            stop = true;
    }

    // check one last time after DP
    for (let clause of clauseSetCopy)
        if (clause === 0)
            return false;

    return true;
}

export function createConjunctionAstFromClauseSet(props, clauses) {
    let nodes = [];

    for (let clause of clauses) {
        let literals = [];

        for (let i = 0; i < props.length; i++) {
            let propState = getClausePropState(i, clause);

            if (propState.exists)
                literals.push(propState.value ? makeAtomic(props[i]) : negateFormula(makeAtomic(props[i])));
        }

        nodes.push(chainUpAst(literals, 'or'));
    }

    return chainUpAst(nodes, 'and');
}

function getFirstLiteral(props, clauses) {
    for (let i = 0; i < props.length; i++) {
        for (let clause of clauses) {
            let state = getClausePropState(i, clause);

            if (state.exists)
                return {
                    index: i,
                    value: state.value
                }
        }
    }
}

export function applyDPLL(props, clauses) {
    if (clauses.length === 0)
        return true;

    console.log('Before DPLL clauses: ' + clauses.map(clause => printClause(props, clause)).join(', '));

    // literal rule
    for (let clause of clauses) {
        if (clause === null)
            continue;

        let literal = getSingleLiteral(props, clause);

        if (!literal)
            continue;

        // delete literal from all clauses
        for (let i = 0; i < clauses.length; i++) {
            if (clauses[i] === null)
                continue;

            let literalState = getClausePropState(literal.index, clauses[i]);

            if (literalState.exists && literalState.value !== literal.value) {
                clauses[i] = clearBitAtPos(clauses[i], literal.index*2);
                clauses[i] = clearBitAtPos(clauses[i], literal.index*2+1);
            }

            // check if we should delete clause
            if (literalState.exists && literalState.value === literal.value) {
                clauses[i] = null;
            }
        }

        console.log('Applied literal rule for ' + props[literal.index] + ' := ' + literal.value + ' => ' + clauses.filter(clause => clause !== null).map(clause => printClause(props, clause)).join(', '));
    }

    // pure literal rule
    for (let i = 0; i < props.length; i++) {
        let propStateCur = null;
        let ok = true;

        for (let j = 0; j < clauses.length; j++) {
            if (clauses[j] === null)
                continue;

            let propState = getClausePropState(i, clauses[j]);

            if (propStateCur === null && propState.exists)
                propStateCur = propState;
            else if (propStateCur !== null && propState.exists && propStateCur.value !== propState.value) {
                ok = false;
            }
        }

        if (ok && propStateCur !== null) {
            // Delete clauses containing pure literal
            for (let j = 0; j < clauses.length; j++)
                if (clauses[j] !== null && getClausePropState(i, clauses[j]).exists)
                    clauses[j] = null;

            console.log('Applied pure literal rule for ' + props[i] + ' := ' + propStateCur.value + ' => ' + clauses.filter(clause => clause !== null).map(clause => printClause(props, clause)).join(', '));
        }
    }

    const newClauses = clauses.filter(clause => clause !== null);

    if (newClauses.length === 0)
        return true;

    for (let newClause of newClauses)
        if (newClause === 0)
            return false;

    // Branch out

    let firstLiteral = getFirstLiteral(props, newClauses);
    
    if (firstLiteral) {
        console.log('Proceeding to branch out for literal ' + props[firstLiteral.index]);
        let copy1 = newClauses.slice(0);
        let newClause = 0;
        newClause |= (1 << (firstLiteral.index*2+1));
        copy1.push(newClause);

        let result1 = applyDPLL(props, copy1);

        if (result1)
            return true;

        newClause |= (1 << (firstLiteral.index*2));
        let copy2 = newClauses.slice(0);
        copy2.push(newClause);

        let result2 = applyDPLL(props, copy2);

        if (result2)
            return true;
    }

    return false;
}