const isAdminDashboardPage = () => window.location.pathname === '/admin';

const buildFinalChecklistPanel = () => {
  const panel = document.createElement('section');
  panel.className = 'admin-final-checklist-panel';
  panel.setAttribute('aria-label', '営業前の最終確認チェックリスト');
  panel.innerHTML = `
    <div>
      <strong>営業前の最終確認チェックリスト</strong>
      <p>予約対応・店舗データ・接続状態を確認してから運用してください。</p>
    </div>
    <ol>
      <li>店舗データが登録済みか確認する</li>
      <li>今日の予約・明日の予約を確認する</li>
      <li>未確認予約が残っていないか確認する</li>
      <li>変更依頼・キャンセル依頼が残っていないか確認する</li>
      <li>Supabase接続と店舗データ取得が正常か確認する</li>
    </ol>
  `;
  return panel;
};

const insertFinalChecklistPanel = () => {
  if (!isAdminDashboardPage()) return;
  if (document.querySelector('.admin-final-checklist-panel')) return;

  const detailList = document.querySelector('.detail-list');
  if (!detailList) return;
  detailList.insertAdjacentElement('afterend', buildFinalChecklistPanel());
};

export const setupAdminFinalChecklist = () => {
  const observer = new MutationObserver(() => {
    insertFinalChecklistPanel();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertFinalChecklistPanel);
  window.setTimeout(insertFinalChecklistPanel, 0);
};
