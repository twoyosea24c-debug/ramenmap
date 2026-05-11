const isAdminReservationListPage = () => window.location.pathname === '/admin/reservations';

const buildGuidePanel = () => {
  const panel = document.createElement('section');
  panel.className = 'admin-reservation-guide-panel';
  panel.setAttribute('aria-label', '予約管理の操作案内');
  panel.innerHTML = `
    <strong>予約管理の操作手順</strong>
    <ol>
      <li>未確認の予約は、内容を確認してから「確認済み」に変更してください。</li>
      <li>変更依頼・キャンセル依頼がある予約は、「詳細」から内容を確認してください。</li>
      <li>キャンセル済みは「キャンセル処理済み」と表示され、二重操作を防ぎます。</li>
    </ol>
  `;
  return panel;
};

const insertAdminReservationGuide = () => {
  if (!isAdminReservationListPage()) return;
  if (document.querySelector('.admin-reservation-guide-panel')) return;

  const pageHeader = document.querySelector('.page-header');
  if (!pageHeader?.parentElement) return;

  pageHeader.insertAdjacentElement('afterend', buildGuidePanel());
};

export const setupAdminReservationGuide = () => {
  const observer = new MutationObserver(() => {
    insertAdminReservationGuide();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertAdminReservationGuide);
  window.setTimeout(insertAdminReservationGuide, 0);
};
