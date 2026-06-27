// ===== チュートリアルシステム =====

const TUTORIAL_KEY = 'driver_support_tutorial_done';

// 各ページのチュートリアルステップ定義
const TUTORIALS = {

  welcome: [
    {
      icon: '🚕',
      title: 'Driver Support へようこそ！',
      subtitle: 'タクシー運転手サポートアプリ',
      stepLabel: 'はじめに',
      stepTitle: 'このアプリでできること',
      desc: '売上管理・乗降記録・地域分析・ルート最適化の4つの機能があります。まずは画面の説明を見てみましょう！',
      showPageList: true,
      tip: null
    },
    {
      icon: '📊',
      title: '売上管理',
      subtitle: '毎日の売上を記録しよう',
      stepLabel: 'ページ① 売上管理',
      stepTitle: '1日の売上を入力するだけ',
      desc: '日付・売上金額・メモを入力して「登録」ボタンを押すだけで記録できます。月別グラフや期間比較で売上の傾向が一目でわかります。',
      tip: '<strong>グラフ切替</strong>：棒グラフ・折れ線・円グラフを自由に切り替えられます'
    },
    {
      icon: '🗺️',
      title: '乗降記録',
      subtitle: '乗った場所・降りた場所を残そう',
      stepLabel: 'ページ② 乗降記録',
      stepTitle: '住所を入力するだけで自動判定',
      desc: '乗車地・降車地の住所（駅名・地名でもOK）を入力すると、Google マップで自動検索して市区町村を判定します。料金・人数も一緒に記録できます。',
      tip: '<strong>入力例</strong>：「渋谷駅」「新宿3丁目」「羽田空港第1ターミナル」など、大まかな住所でもOK'
    },
    {
      icon: '📈',
      title: '地域分析',
      subtitle: 'どのエリアが稼ぎやすい？',
      stepLabel: 'ページ③ 地域分析',
      stepTitle: '乗降記録から自動で集計',
      desc: '乗降記録をもとに、どの市区町村で多くのお客様を乗せているかをグラフで表示します。期間を絞って分析することもできます。',
      tip: '<strong>グラフ切替</strong>：円グラフと棒グラフを切り替えられます'
    },
    {
      icon: '🧭',
      title: 'ルート最適化',
      subtitle: '複数のお客様を効率よく回ろう',
      stepLabel: 'ページ④ ルート最適化',
      stepTitle: '乗客情報を入れるだけで最短順を計算',
      desc: '複数の乗客の乗車地・降車地を入力して「ルートを最適化」ボタンを押すと、効率的な順番とルートをGoogle マップ上に表示します。',
      tip: '<strong>使い方</strong>：「乗客を追加」ボタンで乗客を追加し、それぞれの乗車地・降車地・料金を入力してください'
    },
    {
      icon: '✅',
      title: '準備完了！',
      subtitle: 'さっそく使ってみましょう',
      stepLabel: 'スタート',
      stepTitle: 'まずは今日の売上を登録してみよう',
      desc: '「売上管理」ページが表示されています。今日の売上金額を入力して「登録」ボタンを押してみてください。困ったときは画面左下の ❓ ボタンでいつでもこのガイドを見られます。',
      tip: null,
      isLast: true
    }
  ]
};

// ===== チュートリアル状態 =====
let tutorialStep = 0;
let tutorialSteps = [];
let tutorialActive = false;

// ===== チュートリアル起動 =====
function startTutorial(force = false) {
  if (!force && localStorage.getItem(TUTORIAL_KEY)) return;
  tutorialSteps = TUTORIALS.welcome;
  tutorialStep = 0;
  tutorialActive = true;
  renderTutorial();
}

// ===== モーダル描画 =====
function renderTutorial() {
  // 既存のオーバーレイを削除
  const existing = document.getElementById('tutorial-overlay');
  if (existing) existing.remove();

  const step = tutorialSteps[tutorialStep];
  const total = tutorialSteps.length;
  const isFirst = tutorialStep === 0;
  const isLast = step.isLast || tutorialStep === total - 1;

  // ドット生成
  const dots = Array.from({ length: total }, (_, i) => `
    <div class="tutorial-dot ${i === tutorialStep ? 'active' : i < tutorialStep ? 'done' : ''}"></div>
  `).join('');

  // ページリスト（ウェルカム画面のみ）
  const pageList = step.showPageList ? `
    <div class="tutorial-page-list">
      <div class="tutorial-page-item">
        <div class="tutorial-page-emoji">📊</div>
        <div>
          <div class="tutorial-page-name">売上管理</div>
          <div class="tutorial-page-desc">日次売上・グラフ・期間比較</div>
        </div>
      </div>
      <div class="tutorial-page-item">
        <div class="tutorial-page-emoji">🗺️</div>
        <div>
          <div class="tutorial-page-name">乗降記録</div>
          <div class="tutorial-page-desc">乗車地・降車地・料金を記録</div>
        </div>
      </div>
      <div class="tutorial-page-item">
        <div class="tutorial-page-emoji">📈</div>
        <div>
          <div class="tutorial-page-name">地域分析</div>
          <div class="tutorial-page-desc">エリア別の売上・乗降分布</div>
        </div>
      </div>
      <div class="tutorial-page-item">
        <div class="tutorial-page-emoji">🧭</div>
        <div>
          <div class="tutorial-page-name">ルート最適化</div>
          <div class="tutorial-page-desc">複数乗客の効率ルートを計算</div>
        </div>
      </div>
    </div>
  ` : '';

  // チップ
  const tip = step.tip ? `
    <div class="tutorial-tip">💡 ${step.tip}</div>
  ` : '';

  const overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.className = 'tutorial-overlay';
  overlay.innerHTML = `
    <div class="tutorial-modal">
      <div class="tutorial-header">
        <div class="tutorial-header-top">
          <div class="tutorial-icon">${step.icon}</div>
          <div>
            <div class="tutorial-title">${step.title}</div>
            <div class="tutorial-subtitle">${step.subtitle}</div>
          </div>
        </div>
      </div>
      <div class="tutorial-body">
        <div class="tutorial-step-label">${step.stepLabel}　${tutorialStep + 1} / ${total}</div>
        <div class="tutorial-step-title">${step.stepTitle}</div>
        <div class="tutorial-step-desc">${step.desc}</div>
        ${pageList}
        ${tip}
        <div class="tutorial-dots">${dots}</div>
      </div>
      <div class="tutorial-footer">
        <label class="tutorial-no-show">
          <input type="checkbox" id="tutorial-no-show-check" ${localStorage.getItem(TUTORIAL_KEY) ? 'checked' : ''} onchange="toggleNoShow(this.checked)">
          <span>以降は表示しない</span>
        </label>
        <div class="tutorial-nav">
          ${!isFirst ? `<button class="tutorial-prev" onclick="tutorialPrev()">← 戻る</button>` : ''}
          <button class="tutorial-next" onclick="${isLast ? 'closeTutorial()' : 'tutorialNext()'}">
            ${isLast ? 'はじめる 🚀' : '次へ →'}
          </button>
        </div>
      </div>
    </div>
  `;

  // オーバーレイ外クリックで閉じない（誤操作防止）
  document.body.appendChild(overlay);
}

function tutorialNext() {
  if (tutorialStep < tutorialSteps.length - 1) {
    tutorialStep++;
    renderTutorial();
  }
}

function tutorialPrev() {
  if (tutorialStep > 0) {
    tutorialStep--;
    renderTutorial();
  }
}

function toggleNoShow(checked) {
  if (checked) {
    localStorage.setItem(TUTORIAL_KEY, '1');
  } else {
    localStorage.removeItem(TUTORIAL_KEY);
  }
}

function closeTutorial() {
  // チェックボックスの状態を反映
  const cb = document.getElementById('tutorial-no-show-check');
  if (cb && cb.checked) {
    localStorage.setItem(TUTORIAL_KEY, '1');
  } else {
    localStorage.removeItem(TUTORIAL_KEY);
  }
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 200);
  }
  tutorialActive = false;
}

// ===== ヘルプボタン（常時表示） =====
function addHelpButton() {
  const btn = document.createElement('button');
  btn.className = 'help-btn';
  btn.title = 'ヘルプ・使い方を見る';
  btn.textContent = '❓';
  btn.onclick = () => startTutorial(true);
  document.body.appendChild(btn);
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
  addHelpButton();
  // 少し遅らせてページ描画後に表示
  setTimeout(() => startTutorial(), 400);
});
