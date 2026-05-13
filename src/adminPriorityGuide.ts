const isAdminReservationListPage = () => window.location.pathname === '/admin/reservations';

const buildPriorityGuidePanel = () => {
  const panel = document.createElement('section');
  panel.className = 'admin-priority-guide-panel';
  panel.setAttribute('aria-label', '予約対応の優先順位');
  panel.innerHTML = `
    <strong>予約対応の優先順位</strong>
    <ol>
      <li><b>キャンセル依頼</b>：理由を確認し、必要ならキャンセル処理を行う</li>
      <li><b>変更依頼</b>：希望日時・人数を確認し、詳細画面で変更を反映する</li>
      <li><b>未確認予約</b>：予約内容を確認し、来店可能なら確認済みにする</li>
      <li><b>処理後</b>：管理メモに対応内容を残す</li>
    </ol>
  `;
  return panel;
};

const insertPriorityGuidePanel = () => {
  if (!isAdminReservationListPage()) return;
  if (document.querySelector('.admin-priority-guide-panel')) return;

  const colorLegend = document.querySelector('.admin-color-legend-panel');
  const summaryGrid = document.querySelector('.reservation-summary-grid');
  const insertTarget = colorLegend ?? summaryGrid;
  if (!insertTarget) return;

  insertTarget.insertAdjacentElement('afterend', buildPriorityGuidePanel());
};

export const setupAdminPriorityGuide = () => {
  const observer = new MutationObserver(() => {
    insertPriorityGuidePanel();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertPriorityGuidePanel);
  window.setTimeout(insertPriorityGuidePanel, 0);
};
