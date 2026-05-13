const isAdminReservationDetailPage = () => /^\/admin\/reservations\/[^/]+$/.test(window.location.pathname);

const buildDetailGuide = () => {
  const panel = document.createElement('section');
  panel.className = 'admin-reservation-guide-panel admin-detail-guide-panel';
  panel.setAttribute('aria-label', '予約詳細画面の操作案内');
  panel.innerHTML = `
    <strong>予約詳細画面で確認すること</strong>
    <ol>
      <li>予約日時・人数・連絡先を確認します。</li>
      <li>変更依頼やキャンセル依頼がある場合は、希望内容と理由を確認します。</li>
      <li>対応後はステータスを更新し、管理メモに対応内容を残します。</li>
      <li>処理後は「この予約を再読み込み」で最新状態を確認できます。</li>
    </ol>
  `;
  return panel;
};

const insertDetailGuide = () => {
  if (!isAdminReservationDetailPage()) return;
  if (document.querySelector('.admin-detail-guide-panel')) return;

  const header = document.querySelector('.page-header');
  const heading = document.querySelector('.detail-wrapper > h1');
  const insertTarget = header ?? heading;
  if (!insertTarget) return;

  insertTarget.insertAdjacentElement('afterend', buildDetailGuide());
};

export const setupAdminDetailGuide = () => {
  const observer = new MutationObserver(() => {
    insertDetailGuide();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertDetailGuide);
  window.setTimeout(insertDetailGuide, 0);
};
