// ===== Firebase 인증 + Firestore 동기화 =====

let currentUser = null;

// 페이지 로드 시 방문자 카운터 실행
trackAndShowVisitors();

// 로그인 상태 감지 (페이지 로드 시 자동 실행)
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  renderAuthUI(user);

  if (user) {
    // 로그인됨 → Firestore에서 진행 상태 불러오기
    await loadStateFromFirestore(user.uid);
    renderLevelSelect();
  }
});

// 구글 로그인
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (e) {
    console.error('로그인 실패:', e);
    alert('로그인에 실패했습니다. 다시 시도해주세요.');
  }
}

// 로그아웃
async function signOut() {
  await auth.signOut();
  renderLevelSelect();
}

// Firestore에서 상태 불러오기
async function loadStateFromFirestore(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists && doc.data().state) {
      const saved = doc.data().state;
      // Firestore 데이터로 state 덮어쓰기
      state = saved;
      if (!state.batchComplete)       state.batchComplete       = {};
      if (!state.phase2Unlocked)      state.phase2Unlocked      = {};
      if (!state.learnedKanjiByLevel) state.learnedKanjiByLevel = {};
      if (state.currentLevel === undefined) state.currentLevel  = null;
      // localStorage도 동기화
      localStorage.setItem('hanja_state', JSON.stringify(state));
    }
  } catch (e) {
    console.error('Firestore 불러오기 실패 (localStorage 사용):', e);
  }
}

// Firestore에 상태 저장
async function saveStateToFirestore() {
  if (!currentUser) return;
  try {
    await db.collection('users').doc(currentUser.uid).set({
      state: state,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error('Firestore 저장 실패:', e);
  }
}

// ===== 방문자 카운터 =====
async function trackAndShowVisitors() {
  const ref = db.collection('stats').doc('visitors');
  try {
    // 방문 수 1 증가 (원자적 연산)
    await ref.set({
      total: firebase.firestore.FieldValue.increment(1)
    }, { merge: true });

    // 최신 값 읽어서 표시
    const doc = await ref.get();
    const total = doc.data()?.total || 0;
    const el = document.getElementById('visitor-count');
    if (el) el.textContent = `누적 방문자 ${total.toLocaleString()}명`;
  } catch (e) {
    // Firebase 미설정 시 조용히 무시
  }
}

// 로그인 UI 렌더링
function renderAuthUI(user) {
  const area = document.getElementById('auth-area');
  if (!area) return;

  if (user) {
    area.innerHTML = `
      <div class="auth-user">
        <img src="${user.photoURL || ''}" class="auth-avatar" alt="">
        <span class="auth-name">${user.displayName || '사용자'}</span>
        <button class="auth-btn" onclick="signOut()">로그아웃</button>
      </div>
    `;
  } else {
    area.innerHTML = `
      <button class="auth-btn auth-login" onclick="signInWithGoogle()">
        <svg width="18" height="18" viewBox="0 0 48 48" style="vertical-align:middle;margin-right:6px">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        구글 로그인
      </button>
    `;
  }
}
