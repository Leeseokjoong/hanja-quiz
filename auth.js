// ===== 방문자 카운터 =====
(async function () {
  try {
    const res = await fetch('https://api.counterapi.dev/v1/hanja-quiz-subrain/visits/up');
    const data = await res.json();
    const el = document.getElementById('visitor-count');
    if (el) el.textContent = `누적 방문자 ${data.count.toLocaleString()}명`;
  } catch (e) {
    // 네트워크 오류 시 조용히 무시
  }
})();
