const isAdminReservationListPage = () => window.location.pathname === '/admin/reservations';

const buildColorLegendPanel = () => {
  const panel = document.createElement('section');
  panel.className = 'admin-color-legend-panel';
  panel.setAttribute('aria-label', '予約カードの色分け説明');
  panel.innerHTML = `
    <strong>予約カードの色分け</strong>
    <div class="admin-color-legend-list">
      <span><i class="legend-dot legend-dot-blue"></i>青：変更依頼あり</span>
      <span><i class="legend-dot legend-dot-red"></i>赤：キャンセル依頼あり</span>
      <span><i class="legend-dot legend-dot-purple"></i>紫：変更依頼とキャンセル依頼の両方あり</span>
      <span><i class="legend-dot legend-dot-yellow"></i>黄色：未確認予約</span>
    </div>
  `;
  return panel;
};

const insertColorLegendPanel = () => {
  if (!isAdminReservationListPage()) return;
  if (document.querySelector('.admin-color-legend-panel')) return;

  const summaryGrid = document.querySelector('.reservation-summary-grid');
  if (!summaryGrid) return;
  summaryGrid.insertAdjacentElement('afterend', buildColorLegendPanel());
};

export const setupAdminColorLegend = () => {
  const observer = new MutationObserver(() => {
    insertColorLegendPanel();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertColorLegendPanel);
  window.setTimeout(insertColorLegendPanel, 0);
};
