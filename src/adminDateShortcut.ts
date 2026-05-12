const isAdminReservationListPage = () => window.location.pathname === '/admin/reservations';

const setDateFilter = (value: string) => {
  const select = document.querySelector<HTMLSelectElement>('#reservation-date-filter');
  if (!select) return;

  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

const buildDateShortcutPanel = () => {
  const panel = document.createElement('section');
  panel.className = 'admin-date-shortcut-panel';
  panel.setAttribute('aria-label', '予約日のショートカット');

  const label = document.createElement('strong');
  label.textContent = '予約日のクイック表示';

  const actions = document.createElement('div');
  actions.className = 'admin-date-shortcut-actions';

  const shortcuts = [
    { label: '今日の予約', value: 'today' },
    { label: '明日の予約', value: 'tomorrow' },
    { label: '今週の予約', value: 'thisWeek' },
    { label: 'すべて表示', value: 'all' },
  ];

  shortcuts.forEach((shortcut) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = shortcut.value === 'all' ? 'button-secondary' : 'button-primary';
    button.textContent = shortcut.label;
    button.addEventListener('click', () => setDateFilter(shortcut.value));
    actions.append(button);
  });

  panel.append(label, actions);
  return panel;
};

const insertDateShortcutPanel = () => {
  if (!isAdminReservationListPage()) return;
  if (document.querySelector('.admin-date-shortcut-panel')) return;

  const filterGrid = document.querySelector('.reservation-filter-grid');
  if (!filterGrid) return;
  filterGrid.insertAdjacentElement('beforebegin', buildDateShortcutPanel());
};

export const setupAdminDateShortcuts = () => {
  const observer = new MutationObserver(() => {
    insertDateShortcutPanel();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertDateShortcutPanel);
  window.setTimeout(insertDateShortcutPanel, 0);
};
