const isAdminReservationPage = () => window.location.pathname.startsWith('/admin/reservations');

const hideCancelledActionButtons = () => {
  if (!isAdminReservationPage()) return;

  document.querySelectorAll('tr').forEach((row) => {
    if (!(row instanceof HTMLTableRowElement)) return;

    const statusBadge = row.querySelector('.reservation-status-cancelled');
    if (!statusBadge) return;

    row.classList.add('reservation-row-cancelled-processed');

    const actionCell = row.children.item(9);
    if (!actionCell) return;

    actionCell.querySelectorAll('button').forEach((button) => {
      if (button.textContent?.includes('キャンセル') === true) {
        button.remove();
      }
    });

    if (!actionCell.querySelector('.reservation-cancelled-processed-label')) {
      const label = document.createElement('span');
      label.className = 'reservation-cancelled-processed-label';
      label.textContent = 'キャンセル処理済み';
      actionCell.append(label);
    }
  });
};

export const setupAdminCancelledDisplay = () => {
  const observer = new MutationObserver(() => {
    hideCancelledActionButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', hideCancelledActionButtons);
  window.setTimeout(hideCancelledActionButtons, 0);
};
