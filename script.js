// タブ切り替え
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));

    if (tabName === 'play') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('play-section').classList.add('active');
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('search-section').classList.add('active');
    }
}

// --- 【遊ぶモードのロジック】 ---
let currentNumbers = [];
let currentExpression = [];

function initPlayMode() {
    currentNumbers = [];
    for (let i = 0; i < 4; i++) {
        currentNumbers.push(Math.floor(Math.random() * 9) + 1);
    }
    currentExpression = [];
    renderPlayBoard();
    document.getElementById('play-result').textContent = '';
}

function renderPlayBoard() {
    const pool = document.getElementById('number-pool');
    pool.innerHTML = '';
    
    currentNumbers.forEach((num, index) => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.textContent = num;
        tile.onclick = () => addNumberToExpression(num, index, tile);
        pool.appendChild(tile);
    });

    renderExpression();
}

function addNumberToExpression(num, index, tileElement) {
    if (currentExpression.some(i => i.type === 'num' && i.index === index)) return;
    currentExpression.push({ type: 'num', val: num, index: index });
    refreshPoolState();
}

function addExpression(val) {
    currentExpression.push({ type: 'op', val: val });
    renderExpression();
}

function renderExpression() {
    const zone = document.getElementById('drop-zone');
    zone.innerHTML = '';

    if (currentExpression.length === 0) {
        zone.innerHTML = '<span class="placeholder-text" id="placeholder-text">ここをクリックまたはタップで数式を追加</span>';
        return;
    }

    currentExpression.forEach((item, idx) => {
        const span = document.createElement('div');
        span.className = 'expression-item';
        let displayVal = item.val;
        if (displayVal === '*') displayVal = '×';
        if (displayVal === '/') displayVal = '÷';
        
        span.innerHTML = `${displayVal} <span class="remove" onclick="removeExpression(${idx})">&times;</span>`;
        zone.appendChild(span);
    });
}

function refreshPoolState() {
    const usedIndices = currentExpression.filter(i => i.type === 'num').map(i => i.index);
    const tiles = document.querySelectorAll('#number-pool .tile');
    tiles.forEach((tile, idx) => {
        if (usedIndices.includes(idx)) {
            tile.style.opacity = '0.3';
            tile.style.pointerEvents = 'none';
        } else {
            tile.style.opacity = '1';
            tile.style.pointerEvents = 'auto';
        }
    });
    renderExpression();
}

function removeExpression(idx) {
    currentExpression.splice(idx, 1);
    refreshPoolState();
}

function checkAnswer() {
    const resultMsg = document.getElementById('play-result');
    const usedNums = currentExpression.filter(i => i.type === 'num');
    if (usedNums.length !== 4) {
        resultMsg.style.color = '#ef4444';
        resultMsg.textContent = '4つの数字すべてを使ってください！';
        return;
    }

    const exprStr = currentExpression.map(i => i.val).join('');
    try {
        const ans = Function('"use strict";return (' + exprStr + ')')();
        if (Math.abs(ans - 10) < 1e-5) {
            resultMsg.style.color = '#22c55e';
            resultMsg.textContent = '🎉 正解です！お見事！';
        } else {
            resultMsg.style.color = '#ef4444';
            resultMsg.textContent = `残念！ 計算結果は ${ans} です。`;
        }
    } catch (e) {
        resultMsg.style.color = '#ef4444';
        resultMsg.textContent = '数式の形式が正しくありません。';
    }
}

// --- 【探すモードのロジック（自動計算）】 ---
function searchAnswers() {
    const n1 = parseInt(document.getElementById('s1').value);
    const n2 = parseInt(document.getElementById('s2').value);
    const n3 = parseInt(document.getElementById('s3').value);
    const n4 = parseInt(document.getElementById('s4').value);

    const nums = [n1, n2, n3, n4];
    const listContainer = document.getElementById('answer-list');
    listContainer.innerHTML = '<div class="empty-hint">計算中...</div>';

    setTimeout(() => {
        const answers = findAllMake10(nums);
        listContainer.innerHTML = '';

        if (answers.length === 0) {
            listContainer.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">10にできる組み合わせはありませんでした。</div>';
            return;
        }

        answers.forEach(ans => {
            const div = document.createElement('div');
            div.className = 'answer-item';
            div.textContent = ans.replace(/\*/g, '×').replace(/\//g, '÷') + ' = 10';
            listContainer.appendChild(div);
        });
    }, 50);
}

function permute(arr) {
    if (arr.length <= 1) return [arr];
    let res = [];
    for (let i = 0; i < arr.length; i++) {
        let current = arr[i];
        let remaining = arr.slice(0, i).concat(arr.slice(i + 1));
        let remainingPerms = permute(remaining);
        for (let p of remainingPerms) {
            res.push([current].concat(p));
        }
    }
    return res;
}

function findAllMake10(nums) {
    let results = new Set();
    const ops = ['+', '-', '*', '/'];
    const numPerms = permute(nums);

    const patterns = [
        (a,b,c,d,o1,o2,o3) => `${a} ${o1} ${b} ${o2} ${c} ${o3} ${d}`,
        (a,b,c,d,o1,o2,o3) => `(${a} ${o1} ${b}) ${o2} ${c} ${o3} ${d}`,
        (a,b,c,d,o1,o2,o3) => `${a} ${o1} (${b} ${o2} ${c}) ${o3} ${d}`,
        (a,b,c,d,o1,o2,o3) => `${a} ${o1} ${b} ${o2} (${c} ${o3} ${d})`,
        (a,b,c,d,o1,o2,o3) => `(${a} ${o1} ${b} ${o2} ${c}) ${o3} ${d}`,
        (a,b,c,d,o1,o2,o3) => `${a} ${o1} (${b} ${o2} ${c} ${o3} ${d})`,
        (a,b,c,d,o1,o2,o3) => `(${a} ${o1} ${b}) ${o2} (${c} ${o3} ${d})`,
        (a,b,c,d,o1,o2,o3) => `((${a} ${o1} ${b}) ${o2} ${c}) ${o3} ${d}`,
        (a,b,c,d,o1,o2,o3) => `${a} ${o1} ((${b} ${o2} ${c}) ${o3} ${d})`
    ];

    for (let p of numPerms) {
        let [a, b, c, d] = p;
        for (let o1 of ops) {
            for (let o2 of ops) {
                for (let o3 of ops) {
                    for (let fn of patterns) {
                        let expr = fn(a, b, c, d, o1, o2, o3);
                        try {
                            let val = Function('"use strict";return (' + expr + ')')();
                            if (Math.abs(val - 10) < 1e-5) {
                                results.add(expr);
                            }
                        } catch (e) {}
                    }
                }
            }
        }
    }
    return Array.from(results);
}

// 初期化実行
initPlayMode();
