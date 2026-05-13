const isAdminReservationDetailPage = () => /^\/admin\/reservations\/[^/]+$/.test(window.location.pathname);

const buildBackLink = () => {
  const link = document.createElement('a');
  link.href = '/admin/reservations';
  link.className = 'button-secondary admin-detail-list-back-link';
  link.textContent = '予約一覧に戻る';
  return link;
};

const insertBackLink = () => {
  if (!isAdminReservationDetailPage()) return;
  if (document.querySelector('.admin-detail-list-back-link')) return;

  const reloadButton = document.querySelector('.admin-detail-reload-button');
  const actions = reloadButton?.parentElement ?? document.querySelector('.page-header-actions, .detail-actions, .shop-form-actions');
  const header = document.querySelector('.page-header');

  if (actions) {
    actions.insertAdjacentElement('afterbegin', buildBackLink());
    return;
  }

  if (header) {
    const wrapper = document.createElement('div');
    wrapper.className = 'page-header-actions admin-detail-list-back-actions';
    wrapper.append(buildBackLink());
    header.append(wrapper);
  }
};

export const setupAdminDetailListBack = () => {
  const observer = new MutationObserver(() => {
    insertBackLink();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertBackLink);
  window.setTimeout(insertBackLink, 0);
};
