const isAdminReservationPage = () => window.location.pathname.startsWith('/admin/reservations');

let messageTimer: number | undefined;

const getMessagePanel = () => {
  let panel = document.querySelector<HTMLElement>('.admin-after-action-message');
  if (panel) return panel;

  panel = document.createElement('section');
  panel.className = 'admin-after-action-message';
  panel.setAttribute('aria-live', 'polite');
  panel.hidden = true;

  const pageHeader = document.querySelector('.page-header');
  if (pageHeader?.parentElement) {
    pageHeader.insertAdjacentElement('afterend', panel);
  }

  return panel;
};

const showAfterActionMessage = (message: string) => {
  if (!isAdminReservationPage()) return;

  const panel = getMessagePanel();
  panel.innerHTML = `
    <strong>${message}</strong>
    <p>必要に応じて管理メモを残し、キャンセル処理後は「キャンセル処理済み」表示になっているか確認してください。</p>
  `;
  panel.hidden = false;

  if (messageTimer) {
    window.clearTimeout(messageTimer);
  }

  messageTimer = window.setTimeout(() => {
    panel.hidden = true;
  }, 8000);
};

const setupStatusChangeMessage = () => {
  document.addEventListener(
    'change',
    (event) => {
      if (!isAdminReservationPage()) return;
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;

      const selectedLabel = target.selectedOptions.item(0)?.textContent?.trim() || 'ステータス';
      window.setTimeout(() => {
        showAfterActionMessage(`ステータスを「${selectedLabel}」に変更しました。`);
      }, 400);
    },
    true,
  );
};

const setupButtonActionMessage = () => {
  document.addEventListener(
    'click',
    (event) => {
      if (!isAdminReservationPage()) return;
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(button instanceof HTMLButtonElement)) return;
      const text = button.textContent?.trim() ?? '';

      if (text.includes('キャンセル')) {
        window.setTimeout(() => {
          showAfterActionMessage('キャンセル処理を実行しました。');
        }, 600);
      }

      if (text.includes('保存')) {
        window.setTimeout(() => {
          showAfterActionMessage('管理メモを保存しました。');
        }, 600);
      }

      if (text.includes('一括変更')) {
        window.setTimeout(() => {
          showAfterActionMessage('選択した予約の一括変更を実行しました。');
        }, 600);
      }
    },
    true,
  );
};

export const setupAdminAfterActionMessage = () => {
  setupStatusChangeMessage();
  setupButtonActionMessage();
};
