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
  add(o) {
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o) {
    return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o) {
    return new Fraction(this.n * o.n, this.d * o.d);
  }
  div(o) {
    return new Fraction(this.n * o.d, this.d * o.n);
  }
  equals(val) {
    return this.n === val * this.d;
  }
  valueOf() {
    return this.n / this.d;
  }
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// ==========================================================
// AST（数式ノード）
// ==========================================================

class Node {
  constructor(op, left, right) {
    this.op = op;
    this.left = left;
    this.right = right;
  }

  // ======================================================
  // 計算
  // ======================================================

  evaluate() {
    const l =
      typeof this.left === "number"
        ? new Fraction(this.left)
        : this.left.evaluate();

    const r =
      typeof this.right === "number"
        ? new Fraction(this.right)
        : this.right.evaluate();

    switch (this.op) {
      case "+":
        return l.add(r);

      case "-":
        return l.sub(r);

      case "*":
        return l.mul(r);

      case "/":
        return l.div(r);

      default:
        throw new Error(`Unknown operator: ${this.op}`);
    }
  }

  // ======================================================
  // 表示用
  // ======================================================

  toString(parentOp = "", isRight = false) {
    const precedence = {
      "+": 1,
      "-": 1,
      "*": 2,
      "/": 2,
    };

    const lStr =
      typeof this.left === "number"
        ? String(this.left)
        : this.left.toString(this.op, false);

    const rStr =
      typeof this.right === "number"
        ? String(this.right)
        : this.right.toString(this.op, true);

    let needParentheses = false;

    // 親より優先順位が低い
    if (parentOp && precedence[this.op] < precedence[parentOp]) {
      needParentheses = true;
    }

    // a-(b+c), a-(b-c)
    else if (
      parentOp === "-" &&
      isRight &&
      (this.op === "+" || this.op === "-")
    ) {
      needParentheses = true;
    }

    // a/(b*c), a/(b/c)
    else if (parentOp === "/" && isRight) {
      needParentheses = true;
    }

    const expr = `${lStr}${this.op}${rStr}`;

    return needParentheses ? `(${expr})` : expr;
  }

  // ======================================================
  // 代数的正規化
  // ======================================================
  //
  // 「値が同じ」ではなく、
  // 「代数的に同じ式」を同一視する。
  //
  // 例えば
  //
  //   3-(2-5-4)
  //   3-(2-4-5)
  //
  // は両方
  //
  //   3-2+4+5
  //
  // なので同一。
  //
  // 一方、
  //
  //   1+2+3+4
  //   2*3/1+4
  //
  // は値が同じでも別の式なので同一視しない。
  //
  // ======================================================

  canonicalKey() {
    const normalized = normalizeExpression(this);

    return normalized.key();
  }

  // 旧コードとの互換用
  toCanonical() {
    return this;
  }

  // 旧コードとの互換用
  canonical() {
    return this;
  }
}

// ==========================================================
// 正規化用の内部表現
// ==========================================================
//
// Expression
//
//   Add
//      terms: [ Term, Term, ... ]
//
//   Mul
//      factors: [ Expression, Expression, ... ]
//
//   Div
//      numerator
//      denominator
//
//   Neg
//      value
//
//   Number
//      value
//
// ==========================================================

function normalizeExpression(node) {
  // ------------------------------------------------------
  // 数字
  // ------------------------------------------------------

  if (typeof node === "number") {
    return new CanonicalNumber(node);
  }

  // ------------------------------------------------------
  // 子を正規化
  // ------------------------------------------------------

  const left = normalizeExpression(node.left);
  const right = normalizeExpression(node.right);

  // ------------------------------------------------------
  // +
  // ------------------------------------------------------

  if (node.op === "+") {
    return CanonicalAdd.from(left, right);
  }

  // ------------------------------------------------------
  // -
  // ------------------------------------------------------

  if (node.op === "-") {
    return CanonicalAdd.from(left, new CanonicalNeg(right));
  }

  // ------------------------------------------------------
  // *
  // ------------------------------------------------------

  if (node.op === "*") {
    return CanonicalMul.from(left, right);
  }

  // ------------------------------------------------------
  // /
  // ------------------------------------------------------

  if (node.op === "/") {
    return CanonicalDiv.from(left, right);
  }

  throw new Error(`Unknown operator: ${node.op}`);
}

// ==========================================================
// Number
// ==========================================================

class CanonicalNumber {
  constructor(value) {
    this.value = value;
  }

  key() {
    return `N${this.value}`;
  }
}
function isCanonicalOne(expr) {
  return expr instanceof CanonicalNumber && expr.value === 1;
}

// ==========================================================
// Neg
// ==========================================================

class CanonicalNeg {
  constructor(value) {
    this.value = value;
  }

  key() {
    return `NEG(${this.value.key()})`;
  }
}

// ==========================================================
// Add
// ==========================================================

class CanonicalAdd {
  constructor(terms) {
    this.terms = [];

    for (const term of terms) {
      // 入れ子のADDを展開
      if (term instanceof CanonicalAdd) {
        this.terms.push(...term.terms);
      } else {
        this.terms.push(term);
      }
    }
  }

  static from(a, b) {
    const terms = [];

    addTerm(terms, a, +1);
    addTerm(terms, b, +1);

    return new CanonicalAdd(terms);
  }

  key() {
    const keys = this.terms.map((term) => {
      const sign = term.sign === 1 ? "+" : "-";

      return `${sign}${term.value.key()}`;
    });

    // 加減算では項の順番を無視
    keys.sort();

    return `ADD(${keys.join(",")})`;
  }
}

// ----------------------------------------------------------
// ADDに項を追加
// ----------------------------------------------------------

function addTerm(terms, expr, sign) {
  // --------------------------------------------
  // ADD
  // --------------------------------------------

  if (expr instanceof CanonicalAdd) {
    for (const term of expr.terms) {
      terms.push({
        sign: sign * term.sign,
        value: term.value,
      });
    }

    return;
  }

  // --------------------------------------------
  // NEG
  // --------------------------------------------

  if (expr instanceof CanonicalNeg) {
    addTerm(terms, expr.value, -sign);

    return;
  }

  // --------------------------------------------
  // 通常の項
  // --------------------------------------------

  terms.push({
    sign,
    value: expr,
  });
}

// ==========================================================
// Mul
// ==========================================================

class CanonicalMul {
  constructor(factors) {
    this.factors = [];

    for (const factor of factors) {
      // 入れ子のMULを展開
      if (factor instanceof CanonicalMul) {
        this.factors.push(...factor.factors);
      } else {
        this.factors.push(factor);
      }
    }
  }

  static from(a, b) {
    // ×1 は重複判定では無視
    if (isCanonicalOne(a)) {
      return b;
    }

    if (isCanonicalOne(b)) {
      return a;
    }

    const factors = [];

    addFactor(factors, a);
    addFactor(factors, b);

    // ★ 入れ子を展開した後にも1を除外
    const filteredFactors = factors.filter((f) => !isCanonicalOne(f));

    // 1しか残らなかった場合
    if (filteredFactors.length === 0) {
      return new CanonicalNumber(1);
    }

    if (filteredFactors.length === 1) {
      return filteredFactors[0];
    }

    return new CanonicalMul(filteredFactors);
  }

  key() {
    const keys = this.factors
      // .filter(f => !isCanonicalOne(f))
      .map((f) => f.key())
      .sort();

    return `MUL(${keys.join(",")})`;
  }
}

// ----------------------------------------------------------
// MULに因子を追加
// ----------------------------------------------------------

function addFactor(factors, expr) {
  if (expr instanceof CanonicalMul) {
    factors.push(...expr.factors);
  } else {
    factors.push(expr);
  }
}

// ==========================================================
// Div
// ==========================================================

class CanonicalDiv {
  constructor(numerator, denominator) {
    this.numerator = numerator;
    this.denominator = denominator;
  }

  static from(a, b) {
    if (isCanonicalOne(b)) {
      return a;
    }

    // A / (B / C)
    if (b instanceof CanonicalDiv) {
      return new CanonicalDiv(CanonicalMul.from(a, b.denominator), b.numerator);
    }

    return new CanonicalDiv(a, b);
  }
  key() {
    return `DIV(
        ${this.numerator.key()},
        ${this.denominator.key()}
    )`;
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
        for (let op of ["+", "-", "*", "/"]) {
          results.push(new Node(op, l, r));
        }
      }
    }
  }
  return results;
}

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
          const canonicalKey = node.canonicalKey();
          if (!uniqueCanonicalKeys.has(canonicalKey)) {
            console.log(canonicalKey);
            uniqueCanonicalKeys.add(canonicalKey);
            results.push(makeDisplayExpression(node));
          }
        }
      } catch (e) {
        // 0除算などは無視
      }
    }
  }
  return results;
}
function makeDisplayExpression(node) {
  const result = removeNeutralOne(node);

  // まず元の式を取得
  let displayNode = result.node;

  // 加減算を展開して表示
  displayNode = expandAddSub(displayNode);

  if (!result.removedOne) {
    return displayNode.toString();
  }

  // 消えた1を最後に ×1 として戻す
  return new Node("*", displayNode, 1).toString();
}

function removeNeutralOne(node) {
  // 数字
  if (typeof node === "number") {
    return {
      node,
      removedOne: false,
    };
  }

  const left = removeNeutralOne(node.left);
  const right = removeNeutralOne(node.right);

  // ×1
  if (node.op === "*") {
    if (left.node === 1) {
      return {
        node: right.node,
        removedOne: true,
      };
    }

    if (right.node === 1) {
      return {
        node: left.node,
        removedOne: true,
      };
    }
  }

  // ÷1
  if (node.op === "/") {
    if (right.node === 1) {
      return {
        node: left.node,
        removedOne: true,
      };
    }
  }

  return {
    node: new Node(node.op, left.node, right.node),
    removedOne: left.removedOne || right.removedOne,
  };
}

function expandAddSub(node) {
  if (typeof node === "number") {
    return node;
  }

  const left = expandAddSub(node.left);
  const right = expandAddSub(node.right);

  // a - (b - c)
  // → a - b + c
  if (node.op === "-" && typeof right !== "number" && right.op === "-") {
    return new Node("+", new Node("-", left, right.left), right.right);
  }

  return new Node(node.op, left, right);
}

// ==========================================
// 検索UI
// ==========================================

function searchAnswers() {
  const s1 = parseInt(document.getElementById("s1").value, 10);
  const s2 = parseInt(document.getElementById("s2").value, 10);
  const s3 = parseInt(document.getElementById("s3").value, 10);
  const s4 = parseInt(document.getElementById("s4").value, 10);

  const listContainer = document.getElementById("answer-list");

  // ==========================================
  // 入力チェック
  // ==========================================

  const numbers = [s1, s2, s3, s4];

  if (
    numbers.some(
      (num) => !Number.isInteger(num) || num < 0 || num > 9
    )
  ) {
    listContainer.innerHTML = "";

    const error = document.createElement("div");
    error.className = "empty-hint";
    error.textContent = "0～9の数字を4つ入力してください。";

    listContainer.appendChild(error);
    return;
  }

  // ==========================================
  // 検索中
  // ==========================================

  listContainer.innerHTML = "";

  const searching = document.createElement("div");
  searching.className = "empty-hint";
  searching.textContent = "10を作れる数式があるか調べています……";

  listContainer.appendChild(searching);

  // 少し待ってから検索
  // → 「検索中」の表示を画面に反映させる
  setTimeout(() => {
    const answers = solveMake10(numbers);

    // ==========================================
    // 結果をクリア
    // ==========================================

    listContainer.innerHTML = "";

    // ==========================================
    // 答えがない場合
    // ==========================================

    if (answers.length === 0) {
      const result = document.createElement("div");

      result.className = "empty-hint";
      result.textContent = "10を作れる数式はありません。";

      listContainer.appendChild(result);

      return;
    }

    // ==========================================
    // 答えがある場合
    // ==========================================

    const result = document.createElement("div");

    result.className = "search-result";
    result.textContent = "✓ 10を作れる数式があります！";

    listContainer.appendChild(result);

    // ==========================================
    // 解答を表示ボタン
    // ==========================================

    const showButton = document.createElement("button");

    showButton.className = "btn";
    showButton.textContent = "解答を表示";

    listContainer.appendChild(showButton);

    // ==========================================
    // 解答一覧
    // 最初は非表示
    // ==========================================

    const answerArea = document.createElement("div");

    answerArea.className = "answer-area";
    answerArea.style.display = "none";

    // 件数
    const count = document.createElement("div");

    count.className = "answer-count";
    count.textContent = `${answers.length}件の答えがあります。`;

    answerArea.appendChild(count);

    // ==========================================
    // 答えを追加
    // ==========================================

    answers.forEach((ans) => {
      const item = document.createElement("div");

      item.className = "answer-item";

      item.textContent = ans
        .replace(/\*/g, "×")
        .replace(/\//g, "÷");

      answerArea.appendChild(item);
    });

    listContainer.appendChild(answerArea);

    // ==========================================
    // 「解答を表示」ボタン
    // ==========================================

    showButton.onclick = () => {
      if (answerArea.style.display === "none") {
        answerArea.style.display = "block";
        showButton.textContent = "解答を隠す";
      } else {
        answerArea.style.display = "none";
        showButton.textContent = "解答を表示";
      }
    };
  }, 10);
}