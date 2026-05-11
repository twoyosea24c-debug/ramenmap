const STATUS_LABELS: Record<string, string> = {
  pending: '未確認',
  confirmed: '確認済み',
  canceled: 'キャンセル',
  visited: '来店済み',
};

const DEFAULT_ADMIN_CANCEL_REASON = '管理画面でキャンセル処理';

const getStatusLabel = (value: string) => STATUS_LABELS[value] ?? value;

const isAdminReservationPage = () => window.location.pathname.startsWith('/admin/reservations');

const isReservationStatusSelect = (target: EventTarget | null): target is HTMLSelectElement =>
  target instanceof HTMLSelectElement && target.getAttribute('aria-label')?.includes('ステータス変更') === true;

const rememberPreviousSelectValue = (target: EventTarget | null) => {
  if (!isReservationStatusSelect(target)) return;
  target.dataset.previousValue = target.value;
};

const setupAdminCancelReasonPromptSkip = () => {
  const originalPrompt = window.prompt.bind(window);

  window.prompt = (message?: string, defaultValue?: string) => {
    const promptMessage = String(message ?? '');
    if (isAdminReservationPage() && promptMessage.includes('キャンセル理由を入力してください')) {
      return defaultValue?.trim() || DEFAULT_ADMIN_CANCEL_REASON;
    }

    return originalPrompt(message, defaultValue);
  };
};

export const setupAdminStatusConfirmations = () => {
  setupAdminCancelReasonPromptSkip();

  document.addEventListener(
    'focusin',
    (event) => {
      if (!isAdminReservationPage()) return;
      rememberPreviousSelectValue(event.target);
    },
    true,
  );

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!isAdminReservationPage()) return;
      rememberPreviousSelectValue(event.target);
    },
    true,
  );

  document.addEventListener(
    'change',
    (event) => {
      if (!isAdminReservationPage() || !isReservationStatusSelect(event.target)) return;

      const select = event.target;
      const previousValue = select.dataset.previousValue ?? select.value;
      const nextValue = select.value;

      if (previousValue === nextValue) return;

      const confirmed = window.confirm(
        `この予約を「${getStatusLabel(nextValue)}」に変更しますか？\n\n現在の状態：${getStatusLabel(previousValue)}\n変更後：${getStatusLabel(nextValue)}`,
      );

      if (!confirmed) {
        select.value = previousValue;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      select.dataset.previousValue = nextValue;
    },
    true,
  );

  document.addEventListener(
    'click',
    (event) => {
      if (!isAdminReservationPage()) return;
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.textContent?.includes('一括変更') !== true) return;

      const bulkBar = button.closest('.reservation-bulk-action-bar');
      const bulkStatusSelect = bulkBar?.querySelector('select[aria-label="一括変更ステータス"]');
      const selectedCountText = bulkBar?.querySelector('p')?.textContent?.trim() ?? '選択中の予約';
      const nextStatus = bulkStatusSelect instanceof HTMLSelectElement ? bulkStatusSelect.value : '';

      const confirmed = window.confirm(
        `${selectedCountText}を「${getStatusLabel(nextStatus)}」に一括変更しますか？\n\n複数の予約に反映されるため、内容を確認してから実行してください。`,
      );

      if (!confirmed) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
};
