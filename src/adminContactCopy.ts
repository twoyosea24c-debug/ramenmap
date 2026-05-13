const isAdminReservationDetailPage = () => /^\/admin\/reservations\/[^/]+$/.test(window.location.pathname);

const COPY_TARGET_LABELS = new Set(['電話番号', 'メールアドレス']);

const copyText = async (value: string, button: HTMLButtonElement) => {
  const originalText = button.textContent ?? 'コピー';
  try {
    await navigator.clipboard.writeText(value);
    button.textContent = 'コピー済み';
  } catch {
    button.textContent = 'コピー失敗';
  }

  window.setTimeout(() => {
    button.textContent = originalText;
  }, 1600);
};

const buildCopyButton = (value: string) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button-secondary admin-contact-copy-button';
  button.textContent = 'コピー';
  button.addEventListener('click', () => {
    void copyText(value, button);
  });
  return button;
};

const insertContactCopyButtons = () => {
  if (!isAdminReservationDetailPage()) return;

  document.querySelectorAll<HTMLElement>('.reservation-detail-list div').forEach((row) => {
    if (row.querySelector('.admin-contact-copy-button')) return;

    const label = row.querySelector('dt')?.textContent?.trim();
    if (!label || !COPY_TARGET_LABELS.has(label)) return;

    const valueElement = row.querySelector('dd');
    const value = valueElement?.textContent?.trim();
    if (!valueElement || !value || value === '—') return;

    const wrapper = document.createElement('span');
    wrapper.className = 'admin-contact-copy-value';
    wrapper.append(document.createTextNode(value), buildCopyButton(value));

    valueElement.textContent = '';
    valueElement.append(wrapper);
  });
};

export const setupAdminContactCopy = () => {
  const observer = new MutationObserver(() => {
    insertContactCopyButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertContactCopyButtons);
  window.setTimeout(insertContactCopyButtons, 0);
};
