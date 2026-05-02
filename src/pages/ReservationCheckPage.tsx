import { type FormEvent, useState } from 'react';
import type { Reservation, ReservationStatus } from '../types';
import { fetchReservationForCustomer } from '../services/reservationService';

const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: '未確認',
  confirmed: '確認済み',
  canceled: 'キャンセル',
  visited: '来店済み',
};

const formatReservationDatetime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export function ReservationCheckPage() {
  const [reservationId, setReservationId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setReservation(null);

    const trimmedReservationId = reservationId.trim();
    const trimmedCustomerEmail = customerEmail.trim();

    if (!trimmedReservationId && !trimmedCustomerEmail) {
      setErrorMessage('予約IDとメールアドレスを入力してください。');
      return;
    }

    if (!trimmedReservationId) {
      setErrorMessage('予約IDを入力してください。');
      return;
    }

    if (!trimmedCustomerEmail) {
      setErrorMessage('メールアドレスを入力してください。');
      return;
    }

    setIsLoading(true);

    try {
      const matchedReservation = await fetchReservationForCustomer(trimmedReservationId, trimmedCustomerEmail);
      if (!matchedReservation) {
        setErrorMessage('予約が見つかりません。予約IDとメールアドレスをご確認ください。');
        return;
      }

      setReservation(matchedReservation);
    } catch (error) {
      console.error(error);
      setErrorMessage('予約情報の確認に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="detail-wrapper reservation-check-wrapper">
      <h1>予約確認</h1>
      <article className="card reservation-check-card">
        <p className="form-hint">予約完了時に案内された予約IDと、入力したメールアドレスを入力してください。</p>
        <form className="shop-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <label htmlFor="reservationId">予約ID</label>
            <input id="reservationId" name="reservationId" value={reservationId} onChange={(event) => setReservationId(event.target.value)} />
          </div>
          <div>
            <label htmlFor="customerEmail">メールアドレス</label>
            <input id="customerEmail" name="customerEmail" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
          </div>
          <div className="shop-form-actions">
            <button type="submit" className="button-primary" disabled={isLoading}>
              予約を確認する
            </button>
          </div>
        </form>

        {isLoading ? <p>予約情報を確認中...</p> : null}
        {errorMessage ? <p className="status-error">{errorMessage}</p> : null}
      </article>

      {reservation ? (
        <article className="card reservation-result-card" aria-label="予約確認結果">
          <h2>予約内容</h2>
          <dl className="detail-list reservation-result-list">
            <div><dt>予約ID</dt><dd>{reservation.id}</dd></div>
            <div><dt>店舗名</dt><dd>{reservation.shopName}</dd></div>
            <div><dt>予約者名</dt><dd>{reservation.customerName}</dd></div>
            <div><dt>予約日時</dt><dd>{formatReservationDatetime(reservation.reservationDatetime)}</dd></div>
            <div><dt>人数</dt><dd>{reservation.partySize}名</dd></div>
            <div><dt>ステータス</dt><dd>{RESERVATION_STATUS_LABELS[reservation.status]}</dd></div>
            <div><dt>備考</dt><dd>{reservation.note || '—'}</dd></div>
            <div><dt>キャンセル理由</dt><dd>{reservation.cancelReason || '—'}</dd></div>
          </dl>
        </article>
      ) : null}
    </section>
  );
}
