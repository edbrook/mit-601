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
}

BinaryOp.prototype.eval = function(env) {
    const {l, r} = evalLeftAndRight(this.left, this.right, env);
    return this.op(l, r);
};

BinaryOp.prototype.toString = function() {
    return `${this.opStr}(${this.left}, ${this.right})`;
};

function makeBinaryOp(name, fn) {
    function binOp(left, right) {
        BinaryOp.call(this, left, right);
        this.opStr = name;
        this.op = fn;
    }
    binOp.prototype = Object.create(BinaryOp.prototype);
    binOp.prototype.constructor = binOp;
    return binOp;
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
        return `SET('${this.left.name}' to ${val})`;
    };
}
Assign.prototype = Object.create(BinaryOp.prototype);
Assign.prototype.constructor = Assign;

const Add = makeBinaryOp('Add', (l,r) => l + r);
const Sub = makeBinaryOp('Sub', (l,r) => l - r);
const Mul = makeBinaryOp('Mul', (l,r) => l * r);
const Div = makeBinaryOp('Div', (l,r) => l / r);
const Pow = makeBinaryOp('Pow', Math.pow);
const Mod = makeBinaryOp('Mod', (l,r) => l % r);

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
    console.log('-----------------');
    function parseToken(idx) {
        let token = tokens[idx];
        let expr;
        if (token === '(') {
            var { expr: l, idx } = parseToken(idx+1);
            var op = tokens[idx];
            var { expr: r, idx } = parseToken(idx+1);
            console.log(`>>> L:${l.toString()} OP:${op} R:${r.toString()}`);
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
            } else if ( op === '^' ) {
                expr = new Pow(l, r);
            } else if ( op === '%' ) {
                expr = new Mod(l, r);
            } else {
                console.log('Unknown operator: ', op);
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
    console.log(`>>> EXPR: ${expr}`);
    return expr;
}

// ******************************************

(function(){
    const MAX_HISTORY_ITEMS = 10;
    const MAX_DISPLAY_LINES = 100;

    const frm = document.querySelector('#frm');
    const inp = document.querySelector('#in');
    const out = document.querySelector('#out');

    const env = {};
    const disp = [];
    const history = [];
    let histPos = 0;

    function autoScrollOutput() {
        out.scrollTop = out.scrollHeight;
    }

    function displayEnvironment() {
        disp.push('>>> ENV = ' + JSON.stringify(env));
    }

    function displayHistory() {
        disp.push('>>> HISTORY:');
        history.forEach(h => disp.push('\t' + h));
        disp.push('END');
    }

    function displayExprAndResponse(line, resp) {
        disp.push('<<< ' + line);
        disp.push('>>> ' + String(resp));
    }

    function trimDisplayLines() {
        while (disp.length > MAX_DISPLAY_LINES) {
            disp.shift();
        }
    }

    function trimHistoryItems() {
        while (history.length > MAX_HISTORY_ITEMS) {
            history.shift();
        }
    }

    function showOutput() {
        out.textContent = disp.join('\n');
        autoScrollOutput();
    }

    function updateHistory(line) {
        if (history[history.length-1] !== line) {
            history.push(line);
            trimHistoryItems();
        }
        histPos = history.length;
    }

    function processLine(line) {
        let resp;
        try {
            resp = parse(tokenize(line)).eval(env)
            displayExprAndResponse(line, resp);
            updateHistory(line);
        } catch (e) {
            window.alert('Invalid input!');
            histPos = history.length;
            return;
        }
    }

    function calc(e) {
        e.preventDefault();
        let line = inp.value.trim();
        inp.value = '';
        if (line === 'env') {
            displayEnvironment();
        } else if (line === 'history') {
            displayHistory();
        } else if (line === '') {
            return;
        } else {
            processLine(line);
        }
        trimDisplayLines();
        showOutput();
    }

    function historyUp() {
        histPos--;
        if (histPos < 0) {
            histPos = history.length;
            inp.value = ''
        } else {
            inp.value = history[histPos];
        }
    }

    function historyDown() {
        histPos++;
        if (histPos > history.length) {
            histPos = 0;
        } else if (histPos === history.length) {
            inp.value = '';
            return;
        }
        inp.value = history[histPos];
    }

    function pullHistory(e) {
        if (history.length > 0) {
            if (e.key === 'ArrowUp') {
                historyUp();
            } else if (e.key === 'ArrowDown') {
                historyDown();
            }
        }
    }

    frm.addEventListener('submit', calc);
    inp.addEventListener('keyup', pullHistory);

    inp.focus();
})();
// ******************************************