const isAdminReservationDetailPage = () => /^\/admin\/reservations\/[^/]+$/.test(window.location.pathname);

const MEMO_TEMPLATES = [
  '電話連絡済み。予約内容を確認。',
  'メール連絡済み。返信待ち。',
  '変更依頼を確認。店舗側で対応済み。',
  'キャンセル依頼を確認。処理済み。',
] as const;

const insertTextToTextarea = (textarea: HTMLTextAreaElement, text: string) => {
  const currentValue = textarea.value.trim();
  textarea.value = currentValue ? `${currentValue}\n${text}` : text;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
};

const buildTemplateButton = (textarea: HTMLTextAreaElement, text: string) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button-secondary admin-memo-template-button';
  button.textContent = text;
  button.addEventListener('click', () => insertTextToTextarea(textarea, text));
  return button;
};

const insertMemoTemplates = () => {
  if (!isAdminReservationDetailPage()) return;
  if (document.querySelector('.admin-memo-template-panel')) return;

  const textarea = document.querySelector<HTMLTextAreaElement>('#detail-admin-memo');
  if (!textarea) return;

  const panel = document.createElement('div');
  panel.className = 'admin-memo-template-panel';

  const title = document.createElement('strong');
  title.textContent = 'よく使う管理メモ';

  const actions = document.createElement('div');
  actions.className = 'admin-memo-template-actions';
  MEMO_TEMPLATES.forEach((template) => {
    actions.append(buildTemplateButton(textarea, template));
  });

  panel.append(title, actions);
  textarea.insertAdjacentElement('afterend', panel);
};

export const setupAdminMemoTemplate = () => {
  const observer = new MutationObserver(() => {
    insertMemoTemplates();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertMemoTemplates);
  window.setTimeout(insertMemoTemplates, 0);
};
