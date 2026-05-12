const isAdminReservationListPage = () => window.location.pathname === '/admin/reservations';

let showOnlyAttention = false;

const isAttentionReservationCard = (card: Element) =>
  card.classList.contains('reservation-row-pending') ||
  card.classList.contains('reservation-row-cancel-requested') ||
  card.textContent?.includes('変更依頼あり') === true ||
  card.textContent?.includes('キャンセル依頼あり') === true;

const getReservationCards = () =>
  Array.from(document.querySelectorAll('section[aria-label="予約一覧"] > article.card'));

const updateAttentionFilterButton = () => {
  const button = document.querySelector<HTMLButtonElement>('.admin-attention-filter-button');
  const count = document.querySelector<HTMLElement>('.admin-attention-filter-count');
  const cards = getReservationCards();
  const attentionCount = cards.filter((card) => isAttentionReservationCard(card)).length;

  if (button) {
    button.textContent = showOnlyAttention ? 'すべての予約を表示' : '対応が必要な予約だけ見る';
    button.className = showOnlyAttention
      ? 'button-secondary admin-attention-filter-button'
      : 'button-primary admin-attention-filter-button';
  }

  if (count) {
    count.textContent = showOnlyAttention
      ? `対応が必要な予約を表示中：${attentionCount}件`
      : `対応が必要な予約：${attentionCount}件`;
  }
};

const applyAttentionFilter = () => {
  if (!isAdminReservationListPage()) return;

  getReservationCards().forEach((card) => {
    const shouldShow = !showOnlyAttention || isAttentionReservationCard(card);
    if (card instanceof HTMLElement) {
      card.hidden = !shouldShow;
    }
  });

  updateAttentionFilterButton();
};

const buildAttentionFilterPanel = () => {
  const panel = document.createElement('section');
  panel.className = 'admin-attention-filter-panel';
  panel.setAttribute('aria-label', '対応が必要な予約の絞り込み');

  const text = document.createElement('p');
  text.className = 'admin-attention-filter-count';
  text.textContent = '対応が必要な予約：0件';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button-primary admin-attention-filter-button';
  button.textContent = '対応が必要な予約だけ見る';
  button.addEventListener('click', () => {
    showOnlyAttention = !showOnlyAttention;
    applyAttentionFilter();
  });

  panel.append(text, button);
  return panel;
};

const insertAttentionFilterPanel = () => {
  if (!isAdminReservationListPage()) return;
  if (document.querySelector('.admin-attention-filter-panel')) return;

  const summaryGrid = document.querySelector('.reservation-summary-grid');
  if (!summaryGrid) return;
  summaryGrid.insertAdjacentElement('afterend', buildAttentionFilterPanel());
};

export const setupAdminAttentionFilter = () => {
  const observer = new MutationObserver(() => {
    insertAttentionFilterPanel();
    applyAttentionFilter();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', () => {
    showOnlyAttention = false;
    insertAttentionFilterPanel();
    applyAttentionFilter();
  });
  window.setTimeout(() => {
    insertAttentionFilterPanel();
    applyAttentionFilter();
  }, 0);
};
