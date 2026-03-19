// ===== 상수 =====
const BATCH_SIZE = 10;
const LEVEL_ORDER = ['9급', '8급', '7급', '6급', '5급', '4급'];

// ===== 상태 관리 =====
let state = {
  currentLevel: null,
  batchComplete: {},
  phase2Unlocked: {},
  learnedKanjiByLevel: {}  // { '9급': ['人','日',...], '8급': [...] }
};

// Phase 1 런타임 변수
let phase1Data = [];
let phase1Batches = [];
let currentBatchIdx = 0;
let quizItems = [];
let quizIndex = 0;
let quizScore = 0;

// Phase 2 런타임 변수
let phase2Data = [];
let phase2Index = 0;
let phase2Score = 0;
let phase2Total = 0;

// ===== 유틸: "사람 인" → { hoon: "사람", eum: "인" } =====
function parseMeaning(meaning) {
  const first = meaning.split('/')[0].trim();
  const parts = first.trim().split(/\s+/);
  const eum = parts[parts.length - 1];
  const hoon = parts.slice(0, parts.length - 1).join(' ');
  return { hoon: hoon || first, eum };
}

// ===== 데이터 로딩 =====
async function loadPhase1Data(level) {
  try {
    const levelNum = level.replace('급', '');
    const response = await fetch(`data/${levelNum}급.json`);
    if (!response.ok) throw new Error('load failed');
    const data = await response.json();

    const seen = new Set();
    const allKanji = [];
    data.categories.forEach(cat => {
      cat.kanji_list.forEach(k => {
        if (!seen.has(k.kanji)) {
          seen.add(k.kanji);
          allKanji.push(k);
        }
      });
    });
    phase1Data = allKanji;
  } catch (e) {
    phase1Data = [
      { kanji: '人', meaning: '사람 인' }, { kanji: '日', meaning: '날 일' },
      { kanji: '火', meaning: '불 화' }, { kanji: '水', meaning: '물 수' },
      { kanji: '木', meaning: '나무 목' }, { kanji: '金', meaning: '쇠 금' },
      { kanji: '土', meaning: '흙 토' }, { kanji: '月', meaning: '달 월' },
      { kanji: '山', meaning: '뫼 산' }, { kanji: '川', meaning: '내 천' },
      { kanji: '心', meaning: '마음 심' }, { kanji: '口', meaning: '입 구' },
      { kanji: '耳', meaning: '귀 이' }, { kanji: '目', meaning: '눈 목' },
      { kanji: '手', meaning: '손 수' }, { kanji: '大', meaning: '큰 대' },
      { kanji: '小', meaning: '작을 소' }, { kanji: '上', meaning: '윗 상' },
      { kanji: '下', meaning: '아래 하' }, { kanji: '中', meaning: '가운데 중' },
    ];
  }

  phase1Batches = [];
  for (let i = 0; i < phase1Data.length; i += BATCH_SIZE) {
    phase1Batches.push(phase1Data.slice(i, i + BATCH_SIZE));
  }
}

// ===== 단계 선택 화면 =====
function renderBatchSelect() {
  const level = state.currentLevel;
  const completed = state.batchComplete[level] || [];
  const totalBatches = phase1Batches.length;
  const completedCount = completed.length;
  const allDone = completedCount === totalBatches;
  const progressPct = Math.round((completedCount / totalBatches) * 100);

  let batchButtons = '';
  phase1Batches.forEach((batch, idx) => {
    const isDone = completed.includes(idx);
    const isUnlocked = idx === 0 || completed.includes(idx - 1);
    const start = idx * BATCH_SIZE + 1;
    const end = start + batch.length - 1;

    let cls = 'batch-btn';
    let icon = '';
    let onclick = '';

    if (isDone) {
      cls += ' batch-done';
      icon = '✓';
      onclick = `onclick="renderStudy(${idx})"`;
    } else if (isUnlocked) {
      cls += ' batch-current';
      icon = '▶';
      onclick = `onclick="renderStudy(${idx})"`;
    } else {
      cls += ' batch-locked';
      icon = '—';
    }

    batchButtons += `
      <button class="${cls}" ${onclick}>
        <span class="batch-icon">${icon}</span>
        <strong>${idx + 1}단계</strong>
        <small>${start}~${end}번</small>
      </button>
    `;
  });

  // 한자어 퀴즈 출제 범위 설명
  const currentIdx = LEVEL_ORDER.indexOf(level);
  const rangeLabel = currentIdx === 0
    ? `${level} 한자어`
    : `${LEVEL_ORDER[0]}~${level} 한자어`;

  document.getElementById('app').innerHTML = `
    <div class="batch-select slideIn">
      <div class="batch-header">
        <button class="back-link" onclick="renderLevelSelect()">← 급수 선택</button>
        <h2>${level} 한자 학습</h2>
        <p class="batch-progress-text">${completedCount} / ${totalBatches} 단계 완료</p>
      </div>

      <div class="progress-wrap">
        <div class="progress-track">
          <div class="progress-fill-bar" style="width:${progressPct}%"></div>
        </div>
        <span class="progress-pct">${progressPct}%</span>
      </div>

      <div class="batch-grid">
        ${batchButtons}
      </div>

      ${allDone ? `
        <div class="phase2-unlock">
          <p>모든 단계를 완료했어요!</p>
          <p class="unlock-range">${rangeLabel} 퀴즈에 도전해보세요.</p>
          <button class="btn-success" onclick="startPhase2('${level}')">한자어 퀴즈 시작</button>
        </div>
      ` : `
        <p class="unlock-hint">모든 단계를 완료하면 한자어 퀴즈가 열려요.</p>
      `}
    </div>
  `;
}

// ===== 학습 화면 (10개 한자 카드) =====
function renderStudy(batchIdx) {
  currentBatchIdx = batchIdx;
  const level = state.currentLevel;
  const batch = phase1Batches[batchIdx];
  const start = batchIdx * BATCH_SIZE + 1;
  const isDone = (state.batchComplete[level] || []).includes(batchIdx);

  const cards = batch.map(item => {
    const { hoon, eum } = parseMeaning(item.meaning);
    return `
      <div class="study-card">
        <span class="study-kanji">${item.kanji}</span>
        <span class="study-eum">${eum}</span>
        <span class="study-hoon">${hoon}</span>
      </div>
    `;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="study-screen slideIn">
      <div class="study-header">
        <button class="back-link" onclick="renderBatchSelect()">← 단계 선택</button>
        <h2>${level} · ${batchIdx + 1}단계 (${start}~${start + batch.length - 1}번)</h2>
      </div>
      <p class="study-guide">아래 한자 ${batch.length}개를 익힌 다음 퀴즈를 풀어보세요.</p>
      <div class="study-grid">
        ${cards}
      </div>
      <button class="btn-success start-quiz-btn" onclick="startBatchQuiz(${batchIdx})">
        퀴즈 시작 (음·훈 각 ${batch.length}문제, 총 ${batch.length * 2}문제)
      </button>
      ${isDone ? `<button class="btn-secondary" style="margin-top:12px;width:100%" onclick="renderBatchSelect()">단계 선택으로</button>` : ''}
    </div>
  `;
}

// ===== 퀴즈 생성 및 시작 =====
function startBatchQuiz(batchIdx) {
  currentBatchIdx = batchIdx;
  const batch = phase1Batches[batchIdx];
  const readingQ = batch.map(item => ({ item, type: 'reading' }));
  const meaningQ = batch.map(item => ({ item, type: 'meaning' }));
  quizItems = shuffle([...readingQ, ...meaningQ]);
  quizIndex = 0;
  quizScore = 0;
  renderQuiz();
}

function renderQuiz() {
  if (quizIndex >= quizItems.length) {
    renderBatchComplete();
    return;
  }

  const { item, type } = quizItems[quizIndex];
  const { hoon, eum } = parseMeaning(item.meaning);
  const total = quizItems.length;

  let questionHTML, optionsHTML;

  if (type === 'reading') {
    const correct = eum;
    const opts = shuffle([correct, ...getWrongEums(correct, 3)]);
    questionHTML = `
      <div class="quiz-content">
        <p class="quiz-type-label">음(독음)을 고르세요</p>
        <h2 class="kanji">${item.kanji}</h2>
        <p class="meaning">${hoon}</p>
      </div>`;
    optionsHTML = opts.map(opt =>
      `<button class="option-btn" onclick="checkQuiz('${escQ(opt)}','${escQ(correct)}')">${opt}</button>`
    ).join('');
  } else {
    const correct = hoon;
    const opts = shuffle([correct, ...getWrongHoons(correct, 3)]);
    questionHTML = `
      <div class="quiz-content">
        <p class="quiz-type-label">뜻(훈)을 고르세요</p>
        <h2 class="kanji">${item.kanji}</h2>
      </div>`;
    optionsHTML = opts.map(opt =>
      `<button class="option-btn" onclick="checkQuiz('${escQ(opt)}','${escQ(correct)}')">${opt}</button>`
    ).join('');
  }

  const progressPct = Math.round((quizIndex / total) * 100);

  document.getElementById('app').innerHTML = `
    <div class="quiz-screen slideIn">
      <div class="quiz-header">
        <span>${state.currentLevel} · ${currentBatchIdx + 1}단계</span>
        <span>${quizIndex + 1} / ${total}</span>
        <span>정답 ${quizScore}</span>
      </div>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${progressPct}%"></div>
      </div>
      ${questionHTML}
      <div class="options-grid">
        ${optionsHTML}
      </div>
    </div>
  `;
}

function checkQuiz(answer, correct) {
  const isCorrect = answer === correct;
  if (isCorrect) quizScore++;
  playAudio(isCorrect);

  const { item } = quizItems[quizIndex];
  const { hoon, eum } = parseMeaning(item.meaning);
  const resultText = isCorrect ? '정답' : `오답 — 정답: <strong>${correct}</strong>`;

  document.getElementById('app').innerHTML = `
    <div class="quiz-screen">
      <div class="quiz-header">
        <span>${state.currentLevel} · ${currentBatchIdx + 1}단계</span>
        <span>${quizIndex + 1} / ${quizItems.length}</span>
        <span>정답 ${quizScore}</span>
      </div>
      <div class="feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}">
        <h2>${resultText}</h2>
        <div class="kanji-review">
          <span class="kanji-big">${item.kanji}</span>
          <span class="kanji-info">${eum} · ${hoon}</span>
        </div>
      </div>
      <button class="btn-primary next-btn" onclick="nextQuiz()">다음 문제</button>
    </div>
  `;
}

function nextQuiz() {
  quizIndex++;
  renderQuiz();
}

// ===== 단계 완료 화면 =====
function renderBatchComplete() {
  const level = state.currentLevel;
  const total = quizItems.length;
  const pct = Math.round((quizScore / total) * 100);

  if (!state.batchComplete[level]) state.batchComplete[level] = [];
  if (!state.batchComplete[level].includes(currentBatchIdx)) {
    state.batchComplete[level].push(currentBatchIdx);
  }

  const completedCount = state.batchComplete[level].length;
  const totalBatches = phase1Batches.length;
  const allDone = completedCount === totalBatches;

  // 전체 완료 시 학습한 한자 목록 저장 (한자어 퀴즈 필터링용)
  if (allDone) {
    if (!state.learnedKanjiByLevel) state.learnedKanjiByLevel = {};
    state.learnedKanjiByLevel[level] = phase1Data.map(k => k.kanji);
  }

  localStorage.setItem('hanja_state', JSON.stringify(state));

  document.getElementById('app').innerHTML = `
    <div class="result-screen slideUp">
      <div class="result-card">
        <h2>${currentBatchIdx + 1}단계 완료</h2>
        <div class="result-stats">
          <p>정답률: <strong>${pct}%</strong></p>
          <p>${quizScore} / ${total} 정답</p>
          <p class="batch-total-progress">${completedCount} / ${totalBatches} 단계 완료</p>
        </div>
        <div class="button-group">
          <button class="btn-primary" onclick="renderStudy(${currentBatchIdx})">이 단계 다시 풀기</button>
          ${allDone
            ? `<button class="btn-success" onclick="startPhase2('${level}')">한자어 퀴즈 시작</button>`
            : (currentBatchIdx + 1 < totalBatches
                ? `<button class="btn-success" onclick="renderStudy(${currentBatchIdx + 1})">다음 단계 (${currentBatchIdx + 2}단계)</button>`
                : '')
          }
          <button class="btn-secondary" onclick="renderBatchSelect()">단계 선택으로</button>
        </div>
      </div>
    </div>
  `;
}

// ===== 오답 보기 생성 =====
function getWrongEums(correctEum, count) {
  const pool = [...new Set(
    phase1Data.map(k => parseMeaning(k.meaning).eum).filter(e => e !== correctEum)
  )];
  return shuffle(pool).slice(0, count);
}

function getWrongHoons(correctHoon, count) {
  const pool = [...new Set(
    phase1Data.map(k => parseMeaning(k.meaning).hoon).filter(h => h !== correctHoon && h.length > 0)
  )];
  return shuffle(pool).slice(0, count);
}

// ===== Phase 2: 한자어 퀴즈 =====

// 현재 레벨까지 학습한 한자 집합 반환 (9급 ~ 현재 레벨)
function getLearnedKanjiSet(level) {
  const currentIdx = LEVEL_ORDER.indexOf(level);
  const kanjiSet = new Set();
  for (let i = 0; i <= currentIdx; i++) {
    const lv = LEVEL_ORDER[i];
    ((state.learnedKanjiByLevel || {})[lv] || []).forEach(k => kanjiSet.add(k));
  }
  return kanjiSet;
}

function startPhase2(level) {
  state.currentLevel = level;
  localStorage.setItem('hanja_state', JSON.stringify(state));

  const currentIdx = LEVEL_ORDER.indexOf(level);
  const kanjiSet = getLearnedKanjiSet(level);

  // 9급부터 현재 레벨까지의 한자어 모두 수집
  let allQuizData = [];
  for (let i = 0; i <= currentIdx; i++) {
    const lv = LEVEL_ORDER[i];
    (HanjaQuizData[lv] || []).forEach(entry => allQuizData.push(entry));
  }

  // required_kanji가 모두 학습된 한자인 항목만 필터링
  const filtered = kanjiSet.size > 0
    ? allQuizData.filter(entry => entry.required_kanji.every(k => kanjiSet.has(k)))
    : allQuizData;

  phase2Data = shuffle(filtered.length > 0 ? filtered : allQuizData);
  phase2Index = 0;
  phase2Score = 0;
  phase2Total = phase2Data.length;

  if (phase2Total === 0) {
    alert('출제할 한자어가 없습니다.');
    renderBatchSelect();
    return;
  }
  renderPhase2();
}

function renderPhase2() {
  if (phase2Index >= phase2Data.length) {
    renderPhase2Complete();
    return;
  }

  const quiz = phase2Data[phase2Index];
  const opts = shuffle([quiz.word_hanja, ...generateWrongHanjaOptions(quiz.word_hanja, 3)]);
  const pct = Math.round((phase2Index / phase2Total) * 100);

  document.getElementById('app').innerHTML = `
    <div class="quiz-screen slideIn">
      <div class="quiz-header">
        <span>${state.currentLevel} · 한자어</span>
        <span>${phase2Index + 1} / ${phase2Total}</span>
        <span>정답 ${phase2Score}</span>
      </div>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="quiz-content">
        <p class="quiz-question">다음 뜻에 맞는 한자어를 고르세요:</p>
        <p class="meaning-large">${quiz.word_hangul}</p>
        <p class="script">${quiz.game_script}</p>
      </div>
      <div class="options-grid">
        ${opts.map(opt => `<button class="option-btn" onclick="checkPhase2('${escQ(opt)}')">${opt}</button>`).join('')}
      </div>
      <button class="skip-btn" onclick="skipPhase2()">건너뛰기</button>
    </div>
  `;
}

function checkPhase2(answer) {
  const quiz = phase2Data[phase2Index];
  const isCorrect = quiz.word_hanja === answer;
  if (isCorrect) phase2Score++;
  playAudio(isCorrect);

  const resultText = isCorrect
    ? `정답 — <strong>${quiz.word_hanja}</strong>(${quiz.word_hangul})`
    : `오답 — 정답: <strong>${quiz.word_hanja}</strong>(${quiz.word_hangul})`;

  document.getElementById('app').innerHTML = `
    <div class="quiz-screen">
      <div class="quiz-header">
        <span>${state.currentLevel} · 한자어</span>
        <span>${phase2Index + 1} / ${phase2Total}</span>
        <span>정답 ${phase2Score}</span>
      </div>
      <div class="feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}">
        <h2>${resultText}</h2>
        <p class="feedback-meaning">${quiz.meaning}</p>
        <div class="hint-box">
          <p>${quiz.literacy_hint}</p>
        </div>
      </div>
      <button class="btn-primary next-btn" onclick="nextPhase2()">다음 문제</button>
    </div>
  `;
}

function nextPhase2() { phase2Index++; renderPhase2(); }
function skipPhase2()  { phase2Index++; renderPhase2(); }

function renderPhase2Complete() {
  const level = state.currentLevel;
  const pct = Math.round((phase2Score / phase2Total) * 100);

  document.getElementById('app').innerHTML = `
    <div class="result-screen slideUp">
      <div class="result-card">
        <h2>한자어 퀴즈 완료</h2>
        <div class="result-stats">
          <p>정답률: <strong>${pct}%</strong></p>
          <p>${phase2Score} / ${phase2Total} 정답</p>
        </div>
        <div class="button-group">
          <button class="btn-primary" onclick="startPhase2('${level}')">다시 풀기</button>
          <button class="btn-secondary" onclick="renderBatchSelect()">단계 선택으로</button>
          <button class="btn-secondary" onclick="renderLevelSelect()">급수 선택으로</button>
        </div>
      </div>
    </div>
  `;
}

// ===== 급수 선택 =====
function renderLevelSelect() {
  state.currentLevel = null;
  localStorage.setItem('hanja_state', JSON.stringify(state));

  const buttons = LEVEL_ORDER.map(level => {
    const completed = (state.batchComplete[level] || []).length;
    const badge = completed > 0 ? `${completed}단계 완료` : '시작하기';
    return `
      <button class="level-btn" onclick="selectLevel('${level}')">
        <div>${level}</div>
        <small>${badge}</small>
      </button>
    `;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="level-select slideIn">
      <h2>급수 선택</h2>
      <div class="level-buttons">${buttons}</div>
    </div>
  `;
}

async function selectLevel(level) {
  state.currentLevel = level;
  localStorage.setItem('hanja_state', JSON.stringify(state));

  document.getElementById('app').innerHTML = `
    <div class="quiz-screen">
      <p class="loading-msg">${level} 한자 데이터 불러오는 중...</p>
    </div>`;

  await loadPhase1Data(level);
  renderBatchSelect();
}

// ===== 공통 유틸 =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escQ(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function generateWrongHanjaOptions(correct, count) {
  const pool = [];
  for (const lv in HanjaQuizData) {
    HanjaQuizData[lv].forEach(q => {
      if (q.word_hanja !== correct && !pool.includes(q.word_hanja)) pool.push(q.word_hanja);
    });
  }
  return shuffle(pool).slice(0, count);
}

function playAudio(isCorrect) {
  const audio = document.getElementById(isCorrect ? 'audio-correct' : 'audio-wrong');
  if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
}

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  try {
    const saved = localStorage.getItem('hanja_state');
    state = saved ? JSON.parse(saved) : {};
  } catch (e) {
    state = {};
    localStorage.removeItem('hanja_state');
  }

  // 필수 키 보정 (구버전 또는 손상된 상태 대응)
  if (!state.batchComplete)       state.batchComplete       = {};
  if (!state.phase2Unlocked)      state.phase2Unlocked      = {};
  if (!state.learnedKanjiByLevel) state.learnedKanjiByLevel = {};
  if (state.currentLevel === undefined) state.currentLevel  = null;

  // 구버전 상태 키 정리
  delete state.currentPhase;
  delete state.phase1Complete;
  delete state.phase2Complete;

  renderLevelSelect();
});
