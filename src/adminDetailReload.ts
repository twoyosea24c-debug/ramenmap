const isAdminReservationDetailPage = () => /^\/admin\/reservations\/[^/]+$/.test(window.location.pathname);

const buildDetailReloadButton = () => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button-secondary admin-detail-reload-button';
  button.textContent = 'この予約を再読み込み';
  button.addEventListener('click', () => {
    button.disabled = true;
    button.textContent = '再読み込み中...';
    window.location.reload();
  });
  return button;
};

const insertDetailReloadButton = () => {
  if (!isAdminReservationDetailPage()) return;
  if (document.querySelector('.admin-detail-reload-button')) return;

  const actions = document.querySelector('.page-header-actions, .detail-actions, .shop-form-actions');
  const header = document.querySelector('.page-header');

  if (actions) {
    actions.insertAdjacentElement('afterbegin', buildDetailReloadButton());
    return;
  }

  if (header) {
    const wrapper = document.createElement('div');
    wrapper.className = 'page-header-actions admin-detail-reload-actions';
    wrapper.append(buildDetailReloadButton());
    header.append(wrapper);
  }
};

export const setupAdminDetailReload = () => {
  const observer = new MutationObserver(() => {
    insertDetailReloadButton();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertDetailReloadButton);
  window.setTimeout(insertDetailReloadButton, 0);
};
