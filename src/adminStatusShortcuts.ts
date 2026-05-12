const isAdminReservationListPage = () => window.location.pathname === '/admin/reservations';

const setStatusFilter = (value: string) => {
  const select = document.querySelector<HTMLSelectElement>('#reservation-status-filter');
  if (!select) return;

  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

const buildStatusShortcutPanel = () => {
  const panel = document.createElement('section');
  panel.className = 'admin-status-shortcut-panel';
  panel.setAttribute('aria-label', '予約ステータスのショートカット');

  const label = document.createElement('strong');
  label.textContent = 'ステータス別にすばやく表示';

  const actions = document.createElement('div');
  actions.className = 'admin-status-shortcut-actions';

  const shortcuts = [
    { label: '未確認だけ', value: 'pending' },
    { label: '確認済みだけ', value: 'confirmed' },
    { label: 'キャンセルだけ', value: 'canceled' },
    { label: '来店済みだけ', value: 'visited' },
    { label: 'すべて表示', value: 'all' },
  ];

  shortcuts.forEach((shortcut) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = shortcut.value === 'pending' ? 'button-primary' : 'button-secondary';
    button.textContent = shortcut.label;
    button.addEventListener('click', () => setStatusFilter(shortcut.value));
    actions.append(button);
  });

  panel.append(label, actions);
  return panel;
};

const insertStatusShortcutPanel = () => {
  if (!isAdminReservationListPage()) return;
  if (document.querySelector('.admin-status-shortcut-panel')) return;

  const filterGrid = document.querySelector('.reservation-filter-grid');
  if (!filterGrid) return;
  filterGrid.insertAdjacentElement('beforebegin', buildStatusShortcutPanel());
};

export const setupAdminStatusShortcuts = () => {
  const observer = new MutationObserver(() => {
    insertStatusShortcutPanel();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertStatusShortcutPanel);
  window.setTimeout(insertStatusShortcutPanel, 0);
};
