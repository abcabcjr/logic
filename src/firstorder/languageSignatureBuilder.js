
export class LanguageSignature {
    constructor() {
        this.operators = {
            unary: {},
            narity: {}
        };
        this.quantifiers = {};
        this.opIdToOperator = {};
        this.functions = {};
        this.predicates = {};
        this.constants = [];
    }

    registerQuantifier(id, symbol) {
        this.quantifiers[symbol] = {
            id: id
        };
    }

    registerOperator(id, type, symbol, precedence, arity=1) {
        if (type === 'unary' && arity !== 1)
            throw new Error('Unary operator can only have arity 1'); 

        this.operators[type][symbol] = {
            id: id,
            precedence: precedence,
            arity: arity
        }
        this.opIdToOperator[id] = symbol;
    }

    registerFunction(name, arity) {
        this.functions[name] = {
            name: name,
            type: 'function',
            arity: arity
        }
    }

    registerPredicate(name, arity) {
        this.predicates[name] = {
            name: name,
            type: 'predicate',
            arity: arity
        }
    }

    registerConstants(constList) {
        this.constants = {};
        
        constList.forEach(constObj => {
            this.constants[constObj] = {
                node: 'term',
                type: 'constant',
                value: constObj,
                valueType: 'object'
            };
        });
    }

    getAllFunctionNames() {
        return Object.keys(this.functions);
    }

    getAllPredicateNames() {
        return Object.keys(this.predicates);
    }

    getFunction(name) {
        return this.functions[name];
    }

    getPredicate(name) {
        return this.predicates[name];
    }

    getAllConstants() {
        return Object.keys(this.constants);
    }

    getConstant(value) {
        return this.constants[value];
    }

    getQuantifierBySymbol(symbol) {
        return this.quantifiers[symbol];
    }

    getNarityOperatorBySymbol(symbol) {
        return this.operators.narity[symbol];
    }

    getUnaryOperatorBySymbol(symbol) {
        return this.operators.unary[symbol];
    }
}