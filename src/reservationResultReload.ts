const isReservationCheckPage = () => window.location.pathname === '/reservation/check';

const buildResultReloadButton = () => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button-secondary reservation-result-reload-button';
  button.textContent = '予約情報を再読み込み';
  button.addEventListener('click', () => {
    button.disabled = true;
    button.textContent = '再読み込み中...';
    window.location.reload();
  });
  return button;
};

const insertResultReloadButton = () => {
  if (!isReservationCheckPage()) return;
  if (document.querySelector('.reservation-result-reload-button')) return;

  const resultGuide = document.querySelector<HTMLElement>('article[aria-label="予約確認後の案内"]');
  if (!resultGuide) return;

  const actions = document.createElement('div');
  actions.className = 'shop-form-actions reservation-result-reload-actions';
  actions.append(buildResultReloadButton());
  resultGuide.append(actions);
};

export const setupReservationResultReload = () => {
  const observer = new MutationObserver(() => {
    insertResultReloadButton();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertResultReloadButton);
  window.setTimeout(insertResultReloadButton, 0);
};
