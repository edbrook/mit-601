'use strict';

const SEPARATORS = ['(', ')', '+', '-', '*', '/', '='];

function evalLeftAndRight(left, right, env) {
    let l;
    let r;
    if (left instanceof Num) {
        l = left.value;
    } else {
        l = left.eval(env);
    }

    if (right instanceof Num) {
        r = right.value;
    } else {
        r = right.eval(env);
    }

    return { l, r };
}

// --------------------

function Num(val) {
    this.value = val;
    this.toString = () => {
        return `Num(${this.value})`;
    };
}

function Variable(name) {
    this.name = name;
    this.toString = () => {
        return `Var('${this.name}')`;
    };
    this.eval = (env) => {
        return env[this.name];
    };
}

// --------------------

function BinaryOp(left, right) {
    this.opStr = ''
    this.left = left;
    this.right = right;
    this.eval = (env) => {
        const {l, r} = evalLeftAndRight(this.left, this.right, env);
        return this.op(l, r);
    };
    this.toString = () => {
        return `${this.opStr}(${this.left}, ${this.right})`;
    };
}

function Assign(left, right) {
    BinaryOp.call(this, left, right);
    this.opStr = 'Assign';
    this.eval = (env) => {
        let val;
        if (this.right instanceof Num) {
            val = this.right.value;
        } else {
            val = this.right.eval(env);
        }
        env[this.left.name] = val;
    };
}
Assign.prototype = Object.create(BinaryOp.prototype);
Assign.prototype.constructor = Assign;

function Add(left, right) {
    BinaryOp.call(this, left, right);
    this.opStr = 'Add';
    this.op = (l, r) => l + r;
}
Add.prototype = Object.create(BinaryOp.prototype);
Add.prototype.constructor = Add;

function Sub(left, right) {
    BinaryOp.call(this, left, right);
    this.opStr = 'Sub';
    this.op = (l, r) => l - r;
}
Sub.prototype = Object.create(BinaryOp.prototype);
Sub.prototype.constructor = Sub;

function Mul(left, right) {
    BinaryOp.call(this, left, right);
    this.opStr = 'Mul';
    this.op = (l, r) => l * r;
}
Mul.prototype = Object.create(BinaryOp.prototype);
Mul.prototype.constructor = Mul;

function Div(left, right) {
    BinaryOp.call(this, left, right);
    this.opStr = 'Div';
    this.op = (l, r) => l / r;
}
Div.prototype = Object.create(BinaryOp.prototype);
Div.prototype.constructor = Div;

// --------------------

function tokenize(input) {
    let tokens = [];
    let word = [];
    for (let i=0; i<input.length; ++i) {
        let chr = input[i];
        if (SEPARATORS.indexOf(chr) !== -1 || chr === ' ') {
            if (word.length > 0) {
                word = word.join('');
                let n;
                if(!isNaN(n = Number.parseFloat(word))) {
                    tokens.push(n);
                } else {
                    tokens.push(word);
                }
                word = [];
            }
            if (chr !== ' ') {
                tokens.push(chr);
            }
        } else {
            word.push(chr);
        }
    }
    if (word.length > 0) {
        tokens.push(word.join(''));
    }
    return tokens;
}

function parse(tokens) {
    function parseToken(idx) {
        let token = tokens[idx];
        let expr;
        if (token === '(') {
            var { expr: l, idx } = parseToken(idx+1);
            var op = tokens[idx];
            var { expr: r, idx } = parseToken(idx+1);
            //console.log(`>>> L:${l.toString()} OP:${op} R:${r.toString()}`);
            if ( op === '=' ) {
                expr = new Assign(l, r);
            } else if ( op === '+' ) {
                expr = new Add(l, r);
            } else if ( op === '-' ) {
                expr = new Sub(l, r);
            } else if ( op === '*' ) {
                expr = new Mul(l, r);
            } else if ( op === '/' ) {
                expr = new Div(l, r);
            }
        } else if (typeof token === 'number') {
            expr = new Num(token);
        } else if (/^[a-zA-Z]+$/.test(token)) {
            expr = new Variable(token);
        } else {
            console.log('Invalid token: ', token);
        }
        return { expr, idx: idx + 1 }
    }
    const { expr, nextId } = parseToken(0);
    return expr;
}

// --------------------

function testAll() {
    let env = {};
    let expr;
    console.log("ENV: ", env);
    expr = parse(tokenize('(abc = 42)'));
    expr.eval(env);
    console.log(expr.toString());
    console.log("ENV: ", env);
    expr = parse(tokenize('(ans = (24 + (abc * ((16 / 2) - 5)))'));
    expr.eval(env);
    console.log(expr.toString());
    // *********************
    // const util = require('util');
    // console.log("\nExpression object:");
    // console.log(util.inspect(expr, false, null));
    // *********************
    console.log("ENV: ", env);
    expr = parse(tokenize('abc'));
    console.log(`${expr} = ${expr.eval(env)}`);
}

function calc() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    let env = {};
    rl.setPrompt('% ');
    rl.prompt();
    rl.on('line', (res) => {
        res = res.trim();
        if (res === 'quit') {
            console.log('bye!');
            rl.close();
            return;
        }
        let resp = parse(tokenize(res)).eval(env)
        resp && console.log(resp);
        rl.prompt();
    });
}

testAll();
calc();
