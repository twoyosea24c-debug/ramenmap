const isAdminReservationListPage = () => window.location.pathname === '/admin/reservations';

const getReservationCards = () =>
  Array.from(document.querySelectorAll<HTMLElement>('section[aria-label="予約一覧"] > article.card'));

const updateRequestTypeDisplay = () => {
  if (!isAdminReservationListPage()) return;

  getReservationCards().forEach((card) => {
    const text = card.textContent ?? '';
    const hasChangeRequest = text.includes('変更依頼あり') || text.includes('予約変更依頼');
    const hasCancelRequest = text.includes('キャンセル依頼あり') || text.includes('キャンセル依頼');

    card.classList.toggle('reservation-row-change-requested', hasChangeRequest);
    card.classList.toggle('reservation-row-cancel-requested-strong', hasCancelRequest);
  });
};

export const setupAdminRequestTypeDisplay = () => {
  const observer = new MutationObserver(() => {
    updateRequestTypeDisplay();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', updateRequestTypeDisplay);
  window.setTimeout(updateRequestTypeDisplay, 0);
};
