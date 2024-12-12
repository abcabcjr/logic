const PRECEDENCE_MIN_FUNCTION = 10000000;
const PRECEDENCE_MIN_PREDICATE = 1000000;
const PRECEDENCE_MIN_LOGICAL = 0;

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

    registerOperator(id, type, symbol, precedence, arity=1, opType='logical', returnType='formula', associativity='ltr') {
        if (type === 'unary' && arity !== 1)
            throw new Error('Unary operator can only have arity 1'); 

        this.operators[type][symbol] = {
            id: id,
            opType: opType,
            expects: opType !== 'logical' ? 'term' : 'formula',
            returnType: returnType,
            precedence: precedence,
            associativity: associativity,
            arity: arity
        }
        this.opIdToOperator[id] = symbol;
    }

    registerLogicalOperator(id, type, symbol, precedence, arity=1) {
        this.registerOperator(id, type, symbol, PRECEDENCE_MIN_LOGICAL + precedence, arity, 'logical', 'formula', 'rtl');
    }

    registerOperatorForFunction(functionName, symbol, precedence, associativity='ltr') {
        let fn = this.getFunction(functionName);

        this.registerOperator(functionName, fn.arity === 1 ? 'unary' : 'narity', symbol, PRECEDENCE_MIN_FUNCTION + precedence, fn.arity, 'function', 'term', associativity)
    }

    registerOperatorForPredicate(predicateName, symbol, precedence, associativity='ltr') {
        let fn = this.getPredicate(predicateName);

        this.registerOperator(predicateName, fn.arity === 1 ? 'unary' : 'narity', symbol, PRECEDENCE_MIN_PREDICATE + precedence, fn.arity, 'predicate', 'formula', associativity)
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

    registerConstant(id, regex, valueType, parseFn) {
        this.constants[id] = {
            id: id,
            regex: regex,
            valueType: valueType,
            parseFn: parseFn
        } 
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