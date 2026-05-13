const isReservationCheckPage = () => window.location.pathname === '/reservation/check';

const setInputAttributes = () => {
  if (!isReservationCheckPage()) return;

  const emailInput = document.querySelector<HTMLInputElement>('#customerEmail');
  if (emailInput) {
    emailInput.placeholder = '例：example@example.com';
    emailInput.autocomplete = 'email';
  }

  const codeInput = document.querySelector<HTMLInputElement>('#verificationCode');
  if (codeInput) {
    codeInput.autocomplete = 'one-time-code';
    codeInput.pattern = '[0-9]*';
    codeInput.setAttribute('aria-describedby', 'verification-code-help');
  }
};

const insertCodeHelp = () => {
  if (!isReservationCheckPage()) return;
  if (document.querySelector('#verification-code-help')) return;

  const codeInput = document.querySelector<HTMLInputElement>('#verificationCode');
  if (!codeInput) return;

  const help = document.createElement('p');
  help.id = 'verification-code-help';
  help.className = 'form-hint verification-code-help';
  help.textContent = 'スマホではメールに届いた認証コードの自動入力候補が表示される場合があります。';
  codeInput.insertAdjacentElement('afterend', help);
};

const applyReservationInputHelp = () => {
  setInputAttributes();
  insertCodeHelp();
};

export const setupReservationInputHelp = () => {
  const observer = new MutationObserver(() => {
    applyReservationInputHelp();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', applyReservationInputHelp);
  window.setTimeout(applyReservationInputHelp, 0);
};
