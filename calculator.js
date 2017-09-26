'use strict';

const SEPARATORS = ['(', ')', '+', '-', '*', '/', '='];

const parseError = msg => ({ msg });

// --------------------

const evalToken = (tok, env) => {
    if (tok.hasOwnProperty('value')) {
        return tok.value;
    }
    return tok.eval(env);
};

const evalLeftAndRight = (left, right, env) => ({
    l: evalToken(left, env),
    r: evalToken(right, env)
});

// --------------------

const num = value => ({
    value,
    toString: _ => `Num(${value})`
});

const variable = name => ({
    name,
    toString: _ => `Var('${name}')`,
    eval: env => env[name]
});

// --------------------

const binaryOp = (opStr, op) => (left, right) => ({
    eval: env => {
        const {l, r} = evalLeftAndRight(left, right, env);
        return op(l, r);
    },
    toString: _ => {
        return `${opStr}(${left}, ${right})`;
    }
});

const add = binaryOp('Add', (l,r) => l + r);
const sub = binaryOp('Sub', (l,r) => l - r);
const mul = binaryOp('Mul', (l,r) => l * r);
const div = binaryOp('Div', (l,r) => l / r);
const pow = binaryOp('Pow', Math.pow);
const mod = binaryOp('Mod', (l,r) => l % r);

const assign = (left, right) => {
    const opStr = 'Assign';
    const op = binaryOp('Assign', null);
    const ob = op(left, right);
    ob['eval'] = env => {
        let val;
        if (right.hasOwnProperty('value')) {
            val = right.value;
        } else {
            val = right.eval(env);
        }
        env[left.name] = val;
        return val;
    };
    return ob;
};

// --------------------

const processWord = word => {
    word = word.join('');
    let n = Number.parseFloat(word);
    if (!isNaN(n)) {
        return n;
    }
    return word;
}

const tokenize = input => {
    let tokens = [];
    let word = [];
    for (let i=0; i<input.length; ++i) {
        let chr = input[i];
        if (SEPARATORS.indexOf(chr) !== -1 || chr === ' ') {
            if (word.length > 0) {
                tokens.push(processWord(word));
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
        tokens.push(processWord(word));
    }
    return tokens;
}

const parse = tokens => {
    console.log('-----------------');
    function parseToken(idx) {
        let token = tokens[idx];
        let expr;
        if (token === '(') {
            var { expr: l, idx } = parseToken(idx+1);
            var op = tokens[idx];
            var { expr: r, idx } = parseToken(idx+1);
            if (tokens[idx] !== ')') {
                throw parseError('Invalid expression: missing closing bracket?');
            }
            console.log(`>>> L:${l.toString()} OP:${op} R:${r.toString()}`);
            if ( op === '=' ) {
                expr = assign(l, r);
            } else if ( op === '+' ) {
                expr = add(l, r);
            } else if ( op === '-' ) {
                expr = sub(l, r);
            } else if ( op === '*' ) {
                expr = mul(l, r);
            } else if ( op === '/' ) {
                expr = div(l, r);
            } else if ( op === '^' ) {
                expr = pow(l, r);
            } else if ( op === '%' ) {
                expr = mod(l, r);
            } else {
                throw parseError('Unknown operator: ' + op);
            }
        } else if (typeof token === 'number') {
            expr = num(token);
        } else if (/^[a-zA-Z]+$/.test(token)) {
            expr = variable(token);
        } else {
            throw parseError('Invalid token: ' + token);
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
            if (e.hasOwnProperty('msg')) {
                window.alert(e.msg);
            } else {
                window.alert('Invalid input!');
                console.log(e);
            }
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