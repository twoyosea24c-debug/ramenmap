const isReservationCheckPage = () => window.location.pathname === '/reservation/check';

const buildReservationCheckGuide = () => {
  const panel = document.createElement('section');
  panel.className = 'reservation-check-guide-panel';
  panel.setAttribute('aria-label', '予約確認ページの使い方');
  panel.innerHTML = `
    <strong>予約確認ページでできること</strong>
    <ol>
      <li>予約時のメールアドレスに認証コードを送ります。</li>
      <li>認証コードを入力すると、自分の予約内容を確認できます。</li>
      <li>日時や人数を変えたい場合は「予約変更依頼」を送れます。</li>
      <li>取り消したい場合は「キャンセル依頼」を送れます。</li>
      <li>変更・キャンセルは即時確定ではなく、店舗確認後に処理されます。</li>
    </ol>
  `;
  return panel;
};

const insertReservationCheckGuide = () => {
  if (!isReservationCheckPage()) return;
  if (document.querySelector('.reservation-check-guide-panel')) return;

  const heading = document.querySelector('.reservation-check-wrapper > h1');
  if (!heading) return;
  heading.insertAdjacentElement('afterend', buildReservationCheckGuide());
};

export const setupReservationCheckGuide = () => {
  const observer = new MutationObserver(() => {
    insertReservationCheckGuide();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertReservationCheckGuide);
  window.setTimeout(insertReservationCheckGuide, 0);
};
