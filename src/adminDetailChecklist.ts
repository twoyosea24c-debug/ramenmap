const isAdminReservationDetailPage = () => /^\/admin\/reservations\/[^/]+$/.test(window.location.pathname);

const getReservationId = () => {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  return pathParts[pathParts.length - 1] ?? 'unknown';
};

const getStorageKey = () => `admin-reservation-detail-checklist:${getReservationId()}`;

const CHECKLIST_ITEMS = [
  '予約日時・人数・連絡先を確認した',
  '変更依頼・キャンセル依頼の有無を確認した',
  '必要なステータス更新を行った',
  '管理メモに対応内容を残した',
] as const;

const loadCheckedItems = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(getStorageKey()) ?? '[]') as string[]);
  } catch {
    return new Set<string>();
  }
};

const saveCheckedItems = (checkedItems: Set<string>) => {
  localStorage.setItem(getStorageKey(), JSON.stringify(Array.from(checkedItems)));
};

const resetChecklist = (panel: HTMLElement) => {
  localStorage.removeItem(getStorageKey());
  panel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = false;
  });
};

const buildDetailChecklist = () => {
  const checkedItems = loadCheckedItems();
  const panel = document.createElement('section');
  panel.className = 'admin-final-checklist-panel admin-detail-checklist-panel';
  panel.setAttribute('aria-label', '予約詳細の対応チェックリスト');

  const title = document.createElement('strong');
  title.textContent = '対応完了チェックリスト';

  const description = document.createElement('p');
  description.textContent = '対応漏れを防ぐため、処理した項目にチェックを入れてください。';

  const list = document.createElement('div');
  list.className = 'admin-detail-checklist-list';

  CHECKLIST_ITEMS.forEach((item, index) => {
    const label = document.createElement('label');
    label.className = 'admin-detail-checklist-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checkedItems.has(item);
    checkbox.id = `admin-detail-checklist-${index}`;
    checkbox.addEventListener('change', () => {
      const currentCheckedItems = loadCheckedItems();
      if (checkbox.checked) {
        currentCheckedItems.add(item);
      } else {
        currentCheckedItems.delete(item);
      }
      saveCheckedItems(currentCheckedItems);
    });

    const text = document.createElement('span');
    text.textContent = item;

    label.append(checkbox, text);
    list.append(label);
  });

  const actions = document.createElement('div');
  actions.className = 'admin-detail-checklist-actions';

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'button-secondary admin-detail-checklist-reset-button';
  resetButton.textContent = 'チェックをリセット';
  resetButton.addEventListener('click', () => resetChecklist(panel));

  actions.append(resetButton);
  panel.append(title, description, list, actions);
  return panel;
};

const insertDetailChecklist = () => {
  if (!isAdminReservationDetailPage()) return;
  if (document.querySelector('.admin-detail-checklist-panel')) return;

  const detailGuide = document.querySelector('.admin-detail-guide-panel');
  const header = document.querySelector('.page-header');
  const insertTarget = detailGuide ?? header;
  if (!insertTarget) return;

  insertTarget.insertAdjacentElement('afterend', buildDetailChecklist());
};

export const setupAdminDetailChecklist = () => {
  const observer = new MutationObserver(() => {
    insertDetailChecklist();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertDetailChecklist);
  window.setTimeout(insertDetailChecklist, 0);
};
