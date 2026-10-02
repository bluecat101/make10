// --- Fraction（分数クラス：誤差対策） ---
class Fraction {
    /**
     * Fraction constructor
     * @param {*} n Numerator(分子)
     * @param {*} d Denominator(分母)
     */
    constructor(n, d = 1) {
        if (d === 0) throw new Error("ZeroDivisionError");
        const g = gcd(Math.abs(n), Math.abs(d));
        this.n = (d < 0 ? -n : n) / g;
        this.d = Math.abs(d) / g;
    }
    add(o) { return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Fraction(this.n * o.n, this.d * o.d); }
    div(o) { return new Fraction(this.n * o.d, this.d * o.n); }
    equals(val) { return this.n === val * this.d; }
    valueOf() { return this.n / this.d; }
}

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

// --- AST（数式ノード） ---
class Node {
    constructor(op, left, right) {
        this.op = op;
        this.left = left;
        this.right = right;
    }

    evaluate() {
        const l = typeof this.left === 'number' ? new Fraction(this.left) : this.left.evaluate();
        const r = typeof this.right === 'number' ? new Fraction(this.right) : this.right.evaluate();
        switch (this.op) {
            case '+': return l.add(r);
            case '-': return l.sub(r);
            case '*': return l.mul(r);
            case '/': return l.div(r);
        }
    }

    // 表示用のきれいな文字列（最小限のカッコ）
    toString(parentOp = '', isRight = false) {
        let lStr = typeof this.left === 'number' ? this.left : this.left.toString(this.op, false);
        let rStr = typeof this.right === 'number' ? this.right : this.right.toString(this.op, true);

        let needParentheses = false;
        const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

        if (parentOp && precedence[this.op] < precedence[parentOp]) {
            needParentheses = true;
        } else if (parentOp === '-' && (this.op === '+' || this.op === '-') && isRight) {
            needParentheses = true;
        } else if (parentOp === '/' && isRight) {
            needParentheses = true;
        }
        const expr = `${lStr}${this.op}${rStr}`;
        return needParentheses ? `(${expr})` : expr;
    }

    // --- 同値判定・重複排除のための正規化ロジック ---
    toCanonical() {
        return this.canonical();
    }

    canonical() {
        const leftNorm = this.left instanceof Node ? this.left.canonical() : this.left;
        const rightNorm = this.right instanceof Node ? this.right.canonical() : this.right;

        if (this.op === '+' || this.op === '*') {
            const terms = [];

            const collect = (node) => {
                if (node instanceof Node && node.op === this.op) {
                    collect(node.left);
                    collect(node.right);
                } else {
                    terms.push(node);
                }
            };
            collect(new Node(this.op, leftNorm, rightNorm));

            terms.sort((a, b) => {
                const strA = a instanceof Node ? a.toCanonicalStringInternal() : String(a);
                const strB = b instanceof Node ? b.toCanonicalStringInternal() : String(b);
                return strA.localeCompare(strB);
            });

            let result = terms[0];
            for (let i = 1; i < terms.length; i++) {
                result = new Node(this.op, result, terms[i]);
            }
            return result;
        }

        return new Node(this.op, leftNorm, rightNorm);
    }

    // 内部正規化キー生成（必ずバッククォートを使うように修正）
    toCanonicalStringInternal() {
        const lStr = this.left instanceof Node ? this.left.toCanonicalStringInternal() : String(this.left);
        const rStr = this.right instanceof Node ? this.right.toCanonicalStringInternal() : String(this.right);
        return `(\`${lStr}\`${this.op}\`${rStr}\`)`;
    }
}

// --- 順列生成（数字の並び替え） ---
function permute(arr) {
    if (arr.length <= 1) return [arr];
    let result = [];
    for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
        for (let perm of permute(remaining)) {
            result.push([current, ...perm]);
        }
    }
    return result;
}

// --- 構文木の全パターン生成 ---
function getExpressions(nums) {
    if (nums.length === 1) return [nums[0]];
    let results = [];
    for (let i = 1; i < nums.length; i++) {
        let lefts = getExpressions(nums.slice(0, i));
        let rights = getExpressions(nums.slice(i));
        for (let l of lefts) {
            for (let r of rights) {
                for (let op of ['+', '-', '*', '/']) {
                    results.push(new Node(op, l, r));
                }
            }
        }
    }
    return results;
}

// --- 探索ロジック（重複排除・可換性の整理） ---
function solveMake10(inputNums) {
    const uniqueCanonicalKeys = new Set();
    const results = [];
    const numPerms = permute(inputNums);

    for (let nums of numPerms) {
        const exprNodes = getExpressions(nums);
        for (let node of exprNodes) {
            try {
                const ans = node.evaluate();
                if (ans.equals(10)) {
                    const canonicalNode = node.toCanonical();
                    const nodeStr = canonicalNode.toString();
                    if (!uniqueCanonicalKeys.has(nodeStr)) {
                        uniqueCanonicalKeys.add(nodeStr);
                        results.push(nodeStr);
                    }
                }
            } catch (e) {
                // ゼロ除算などはスキップ
            }
        }
    }
    console.log(uniqueCanonicalKeys);
    return results;
}


// ==========================================
// UI 操作の制御
// ==========================================

let currentNumbers = [];
let expressionTokens = [];

window.onload = () => {
    initPlayMode();
};

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));

    if (tabName === 'play') {
        document.querySelector('.tabs button:nth-child(1)').classList.add('active');
        document.getElementById('play-section').classList.add('active');
    } else {
        document.querySelector('.tabs button:nth-child(2)').classList.add('active');
        document.getElementById('search-section').classList.add('active');
    }
}

function initPlayMode() {
    currentNumbers = Array.from({length: 4}, () => Math.floor(Math.random() * 9) + 1);
    expressionTokens = [];
    updatePlayUI();
    document.getElementById('play-result').textContent = '';
}

function updatePlayUI() {
    const pool = document.getElementById('number-pool');
    pool.innerHTML = '';
    currentNumbers.forEach((num, index) => {
        const tile = document.createElement('div');
        tile.className = 'number-tile';
        tile.textContent = num;
        tile.onclick = () => addExpression(num, index, tile);
        pool.appendChild(tile);
    });

    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = '';
    if (expressionTokens.length === 0) {
        dropZone.innerHTML = 'ここをクリックまたはタップで数式を追加';
    } else {
        expressionTokens.forEach((token, idx) => {
            const span = document.createElement('span');
            span.className = 'expr-token';
            span.textContent = token.value;
            span.onclick = () => removeToken(idx);
            dropZone.appendChild(span);
        });
    }
}

function addExpression(val, poolIndex = null, tileElement = null) {
    expressionTokens.push({ value: val, poolIndex: poolIndex });
    if (tileElement) {
        tileElement.style.opacity = '0.4';
        tileElement.style.pointerEvents = 'none';
    }
    updatePlayUI();
}

function removeToken(index) {
    expressionTokens.splice(index, 1);
    updatePlayUI();
}

function checkAnswer() {
    const resultMsg = document.getElementById('play-result');
    const exprStr = expressionTokens.map(t => t.value).join(' ');

    if (!exprStr.trim()) {
        resultMsg.textContent = '数式を入力してください。';
        resultMsg.style.color = '#e74c3c';
        return;
    }

    try {
        const jsExpr = exprStr.replace(/×/g, '*').replace(/÷/g, '/');
        const evaluated = eval(jsExpr);

        if (Math.abs(evaluated - 10) < 1e-7) {
            resultMsg.textContent = '正解です！おめでとうございます！ 🎉';
            resultMsg.style.color = '#27ae60';
        } else {
            resultMsg.textContent = `残念！ 計算結果は ${evaluated} です（10ではありません）。`;
            resultMsg.style.color = '#e74c3c';
        }
    } catch (e) {
        resultMsg.textContent = '数式の形式が正しくありません。';
        resultMsg.style.color = '#e74c3c';
    }
}

function searchAnswers() {
    const s1 = parseInt(document.getElementById('s1').value);
    const s2 = parseInt(document.getElementById('s2').value);
    const s3 = parseInt(document.getElementById('s3').value);
    const s4 = parseInt(document.getElementById('s4').value);

    const listContainer = document.getElementById('answer-list');
    listContainer.innerHTML = '検索中...';

    setTimeout(() => {
    const answers = solveMake10([s1, s2, s3, s4]);
    console.log(answers);
    listContainer.innerHTML = '';
    if (answers.length === 0) {
        listContainer.innerHTML = '10を作れる組み合わせはありませんでした。';
    } else {
        const countHeader = document.createElement('div');
        countHeader.style.marginBottom = '10px';
        countHeader.style.fontWeight = 'bold';
        countHeader.textContent = `${answers.length}件の解答が見つかりました：`;
        listContainer.appendChild(countHeader);

        answers.forEach(ans => {
            const item = document.createElement('div');
            item.className = 'answer-item';
            item.textContent = ans.replace(/\*/g, '×').replace(/\//g, '÷');
            console.log(ans.replace(/\*/g, '×').replace(/\//g, '÷'));
            listContainer.appendChild(item);
        });
    }
    }, 10);
}