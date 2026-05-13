const isReservationCheckPage = () => window.location.pathname === '/reservation/check';

const buildStatusLegend = () => {
  const panel = document.createElement('section');
  panel.className = 'reservation-status-legend-panel';
  panel.setAttribute('aria-label', '予約ステータスの説明');
  panel.innerHTML = `
    <strong>予約ステータスの見方</strong>
    <div class="reservation-status-legend-list">
      <span><i class="legend-dot legend-dot-yellow"></i>未確認：店舗が確認中です</span>
      <span><i class="legend-dot legend-dot-blue"></i>確認済み：予約が確認されました</span>
      <span><i class="legend-dot legend-dot-red"></i>キャンセル：予約は取り消し済みです</span>
      <span><i class="legend-dot legend-dot-green"></i>来店済み：来店処理済みです</span>
    </div>
  `;
  return panel;
};

const insertStatusLegend = () => {
  if (!isReservationCheckPage()) return;
  if (document.querySelector('.reservation-status-legend-panel')) return;

  const resultGuide = document.querySelector<HTMLElement>('article[aria-label="予約確認後の案内"]');
  if (!resultGuide) return;
  resultGuide.insertAdjacentElement('afterend', buildStatusLegend());
};

export const setupReservationStatusLegend = () => {
  const observer = new MutationObserver(() => {
    insertStatusLegend();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertStatusLegend);
  window.setTimeout(insertStatusLegend, 0);
};
