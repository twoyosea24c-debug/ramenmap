const isAdminReservationListPage = () => window.location.pathname === '/admin/reservations';

const buildReloadButton = () => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button-secondary admin-reservations-reload-button';
  button.textContent = '予約一覧を再読み込み';
  button.addEventListener('click', () => {
    button.disabled = true;
    button.textContent = '再読み込み中...';
    window.location.reload();
  });
  return button;
};

const insertReloadButton = () => {
  if (!isAdminReservationListPage()) return;
  if (document.querySelector('.admin-reservations-reload-button')) return;

  const actions = document.querySelector('.page-header-actions');
  if (!actions) return;
  actions.insertAdjacentElement('afterbegin', buildReloadButton());
};

export const setupAdminReservationsReload = () => {
  const observer = new MutationObserver(() => {
    insertReloadButton();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertReloadButton);
  window.setTimeout(insertReloadButton, 0);
};
