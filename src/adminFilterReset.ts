const isAdminReservationListPage = () => window.location.pathname === '/admin/reservations';

const dispatchChange = (element: HTMLElement) => {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

const resetReservationFilters = () => {
  const searchInput = document.querySelector<HTMLInputElement>('#reservation-search');
  const statusSelect = document.querySelector<HTMLSelectElement>('#reservation-status-filter');
  const dateSelect = document.querySelector<HTMLSelectElement>('#reservation-date-filter');
  const sortSelect = document.querySelector<HTMLSelectElement>('#reservation-sort-option');
  const startDateInput = document.querySelector<HTMLInputElement>('#reservation-custom-start-date');
  const endDateInput = document.querySelector<HTMLInputElement>('#reservation-custom-end-date');

  if (searchInput) {
    searchInput.value = '';
    dispatchChange(searchInput);
  }

  if (statusSelect) {
    statusSelect.value = 'all';
    dispatchChange(statusSelect);
  }

  if (dateSelect) {
    dateSelect.value = 'all';
    dispatchChange(dateSelect);
  }

  if (sortSelect) {
    sortSelect.value = 'pendingFirst';
    dispatchChange(sortSelect);
  }

  if (startDateInput) {
    startDateInput.value = '';
    dispatchChange(startDateInput);
  }

  if (endDateInput) {
    endDateInput.value = '';
    dispatchChange(endDateInput);
  }
};

const buildFilterResetPanel = () => {
  const panel = document.createElement('section');
  panel.className = 'admin-filter-reset-panel';
  panel.setAttribute('aria-label', '予約検索条件のリセット');

  const text = document.createElement('p');
  text.textContent = '検索条件を戻す場合は、すべての絞り込みを解除できます。';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button-secondary admin-filter-reset-button';
  button.textContent = '絞り込みをリセット';
  button.addEventListener('click', resetReservationFilters);

  panel.append(text, button);
  return panel;
};

const insertFilterResetPanel = () => {
  if (!isAdminReservationListPage()) return;
  if (document.querySelector('.admin-filter-reset-panel')) return;

  const filterGrid = document.querySelector('.reservation-filter-grid');
  if (!filterGrid) return;
  filterGrid.insertAdjacentElement('afterend', buildFilterResetPanel());
};

export const setupAdminFilterReset = () => {
  const observer = new MutationObserver(() => {
    insertFilterResetPanel();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertFilterResetPanel);
  window.setTimeout(insertFilterResetPanel, 0);
};
