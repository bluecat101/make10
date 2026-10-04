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

  if (numbers.some((num) => !Number.isInteger(num) || num < 0 || num > 9)) {
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

      item.textContent = ans.replace(/\*/g, "×").replace(/\//g, "÷");

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
