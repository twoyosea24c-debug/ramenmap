import { type FormEvent, useEffect, useMemo, useState } from 'react';
import type { Reservation, ReservationStatus } from '../types';
import {
  fetchReservationsByCustomerEmail,
  sendReservationVerificationCode,
  verifyReservationCode,
} from '../services/reservationService';

const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: '未確認',
  confirmed: '確認済み',
  canceled: 'キャンセル',
  visited: '来店済み',
};

const formatReservationDatetime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
};

export function ReservationCheckPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (!codeSentAt) return;
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [codeSentAt]);

  const resendCooldownSeconds = useMemo(() => {
    if (!codeSentAt) return 0;
    const elapsed = Math.floor((nowTick - codeSentAt) / 1000);
    return Math.max(0, 30 - elapsed);
  }, [codeSentAt, nowTick]);

  const sortedReservations = useMemo(() => {
    const now = Date.now();
    return [...reservations].sort((a, b) => {
      const aDiff = Math.abs(new Date(a.reservationDatetime).getTime() - now);
      const bDiff = Math.abs(new Date(b.reservationDatetime).getTime() - now);
      return aDiff - bDiff;
    });
  }, [reservations]);

  const sendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setReservations([]);

    if (!email.trim()) {
      setErrorMessage('メールアドレスを入力してください。');
      return;
    }

    setIsSendingCode(true);
    try {
      await sendReservationVerificationCode(email.trim());
      setCodeSentAt(Date.now());
      setCode('');
      setSuccessMessage('認証コードを送信しました。メールをご確認ください。');
    } catch (error) {
      console.error(error);
      setErrorMessage('認証コード送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyCodeAndFetchReservations = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setReservations([]);

    if (!email.trim()) return setErrorMessage('メールアドレスを入力してください。');
    if (!code.trim()) return setErrorMessage('認証コードを入力してください。');

    setIsVerifying(true);
    try {
      const verificationResult = await verifyReservationCode(email.trim(), code.trim());
      if (verificationResult === 'invalid') return setErrorMessage('認証コードが正しくありません。');
      if (verificationResult === 'expired') return setErrorMessage('認証コードの有効期限が切れています。再送信してください。');

      const fetchedReservations = await fetchReservationsByCustomerEmail(email.trim(), code.trim());
      setReservations(fetchedReservations);
      setSuccessMessage(fetchedReservations.length === 0 ? '該当する予約はありませんでした。' : null);
    } catch (error) {
      console.error(error);
      setErrorMessage('予約情報の確認に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <section className="detail-wrapper reservation-check-wrapper">
      <h1>予約確認</h1>
      <article className="card reservation-check-card">
        <p className="form-hint">メールアドレスへ認証コードを送り、予約内容を確認できます。</p>

        <form className="shop-form" noValidate onSubmit={(e) => void sendCode(e)}>
          <div>
            <label htmlFor="customerEmail">メールアドレス</label>
            <input id="customerEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="shop-form-actions">
            <button type="submit" className="button-primary" disabled={isSendingCode || resendCooldownSeconds > 0}>
              {codeSentAt ? '認証コードを再送信' : '認証コードを送信'}
            </button>
            {codeSentAt && resendCooldownSeconds > 0 ? <p>再送信まで {resendCooldownSeconds} 秒</p> : null}
          </div>
        </form>

        {isSendingCode ? <p>認証コードを送信中...</p> : null}

        {codeSentAt ? (
          <form className="shop-form" noValidate onSubmit={(e) => void verifyCodeAndFetchReservations(e)}>
            <div>
              <label htmlFor="verificationCode">認証コード</label>
              <input id="verificationCode" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            </div>
            <div className="shop-form-actions">
              <button type="submit" className="button-primary" disabled={isVerifying}>予約を確認する</button>
            </div>
          </form>
        ) : null}

        {isVerifying ? <p>予約情報を確認中...</p> : null}
        {errorMessage ? <p className="status-error">{errorMessage}</p> : null}
        {successMessage ? <p>{successMessage}</p> : null}
      </article>

      {sortedReservations.map((reservation) => (
        <article key={reservation.id} className="card reservation-result-card" aria-label="予約確認結果">
          <h2>{reservation.shopName}</h2>
          <dl className="detail-list reservation-result-list">
            <div><dt>予約者名</dt><dd>{reservation.customerName}</dd></div>
            <div><dt>予約日時</dt><dd>{formatReservationDatetime(reservation.reservationDatetime)}</dd></div>
            <div><dt>人数</dt><dd>{reservation.partySize}名</dd></div>
            <div><dt>ステータス</dt><dd>{RESERVATION_STATUS_LABELS[reservation.status]}</dd></div>
            <div><dt>備考</dt><dd>{reservation.note || '—'}</dd></div>
            <div><dt>キャンセル理由</dt><dd>{reservation.cancelReason || '—'}</dd></div>
            <div><dt>申込日時</dt><dd>{formatReservationDatetime(reservation.createdAt)}</dd></div>
          </dl>
        </article>
      ))}
    </section>
  );
}
