const isAdminReservationDetailPage = () => /^\/admin\/reservations\/[^/]+$/.test(window.location.pathname);

const normalizePhoneNumber = (value: string) => value.replace(/[^0-9+]/g, '');

const buildPhoneLink = (phoneNumber: string) => {
  const link = document.createElement('a');
  link.href = `tel:${normalizePhoneNumber(phoneNumber)}`;
  link.className = 'button-primary admin-phone-link-button';
  link.textContent = '電話する';
  return link;
};

const insertPhoneLink = () => {
  if (!isAdminReservationDetailPage()) return;

  document.querySelectorAll<HTMLElement>('.reservation-detail-list div').forEach((row) => {
    if (row.querySelector('.admin-phone-link-button')) return;

    const label = row.querySelector('dt')?.textContent?.trim();
    if (label !== '電話番号') return;

    const valueElement = row.querySelector('dd');
    const phoneNumber = valueElement?.textContent?.replace('コピー', '').replace('コピー済み', '').trim();
    if (!valueElement || !phoneNumber || phoneNumber === '—') return;

    const target = valueElement.querySelector('.admin-contact-copy-value') ?? valueElement;
    target.append(buildPhoneLink(phoneNumber));
  });
};

export const setupAdminPhoneLink = () => {
  const observer = new MutationObserver(() => {
    insertPhoneLink();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', insertPhoneLink);
  window.setTimeout(insertPhoneLink, 0);
};
