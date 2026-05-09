import { type FormEvent, useMemo, useState } from 'react';
import type { Reservation, ReservationStatus } from '../types';
import {
  fetchReservationsByCustomerEmail,
  requestReservationCancellation,
  requestReservationChange,
  sendCancelRequestAdminNotification,
  sendReservationVerificationCode,
  verifyReservationCode,
} from '../services/reservationService';

const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: '未確認',
  confirmed: '確認済み',
  canceled: 'キャンセル',
  visited: '来店済み',
};

const RESERVATION_STATUS_CLASS_NAMES: Record<ReservationStatus, string> = {
  pending: 'reservation-status-pending',
  confirmed: 'reservation-status-confirmed',
  canceled: 'reservation-status-cancelled',
  visited: 'reservation-status-completed',
};

const formatReservationDatetime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
};

const parseRequestedDatetime = (value: string): string | null => {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatDatetimeLocalValue = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
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
  const [submittingCancelRequestId, setSubmittingCancelRequestId] = useState<string | null>(null);
  const [submittingChangeRequestId, setSubmittingChangeRequestId] = useState<string | null>(null);
  const [editingChangeRequestId, setEditingChangeRequestId] = useState<string | null>(null);
  const [changeRequestDatetime, setChangeRequestDatetime] = useState('');
  const [changeRequestPartySize, setChangeRequestPartySize] = useState('');
  const [changeRequestNote, setChangeRequestNote] = useState('');

  const CANCEL_REQUEST_REASON_OPTIONS = ['予定が合わなくなった', '人数が変わった', '間違えて予約した', '体調不良', 'その他'] as const;

  const openChangeRequestForm = (reservation: Reservation) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingChangeRequestId(reservation.id);
    setChangeRequestDatetime(reservation.changeRequestDatetime ? formatDatetimeLocalValue(reservation.changeRequestDatetime) : '');
    setChangeRequestPartySize(reservation.changeRequestPartySize ? String(reservation.changeRequestPartySize) : '');
    setChangeRequestNote(reservation.changeRequestNote ?? '');
  };

  const closeChangeRequestForm = () => {
    setEditingChangeRequestId(null);
    setChangeRequestDatetime('');
    setChangeRequestPartySize('');
    setChangeRequestNote('');
  };

  const handleChangeRequestSubmit = async (event: FormEvent<HTMLFormElement>, reservation: Reservation) => {
    event.preventDefault();
    if (reservation.status === 'canceled' || reservation.status === 'visited') return;

    const requestedDatetime = parseRequestedDatetime(changeRequestDatetime);
    if (changeRequestDatetime.trim() && !requestedDatetime) {
      setErrorMessage('希望日時の形式が正しくありません。カレンダーから日時を選択してください。');
      return;
    }

    const requestedPartySize = changeRequestPartySize.trim() ? Number(changeRequestPartySize.trim()) : null;
    if (requestedPartySize !== null && (!Number.isInteger(requestedPartySize) || requestedPartySize <= 0)) {
      setErrorMessage('希望人数は1以上の数字で入力してください。');
      return;
    }

    const requestNote = changeRequestNote.trim();

    if (!requestedDatetime && !requestedPartySize && !requestNote) {
      setErrorMessage('希望日時・希望人数・ご要望のいずれかを入力してください。');
      return;
    }

    const confirmed = window.confirm('この内容で予約変更依頼を送信しますか？');
    if (!confirmed) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmittingChangeRequestId(reservation.id);
    try {
      const updated = await requestReservationChange({ reservationId: reservation.id, requestedDatetime, requestedPartySize, requestNote });
      setReservations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccessMessage('予約変更依頼を送信しました。店舗からの確認連絡をお待ちください。');
      closeChangeRequestForm();
    } catch (error) {
      console.error(error);
      setErrorMessage('予約変更依頼の送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmittingChangeRequestId(null);
    }
  };

  const handleCancelRequest = async (reservation: Reservation) => {
    if (reservation.status === 'canceled' || reservation.status === 'visited' || reservation.cancelRequestedAt) return;

    const suggested = `キャンセル依頼理由を入力してください。\n候補: ${CANCEL_REQUEST_REASON_OPTIONS.join(' / ')}`;
    const input = window.prompt(suggested, reservation.cancelRequestReason ?? '');
    if (input === null) return;

    const reason = input.trim();
    if (!reason) {
      setErrorMessage('キャンセル依頼の理由を入力してください。');
      return;
    }

    const confirmed = window.confirm('この予約のキャンセル依頼を送信しますか？');
    if (!confirmed) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmittingCancelRequestId(reservation.id);
    try {
      const updated = await requestReservationCancellation(reservation.id, reason);
      setReservations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccessMessage('キャンセル依頼を送信しました。店舗からの確認連絡をお待ちください。');
      try {
        await sendCancelRequestAdminNotification(updated);
      } catch (notificationError) {
        console.error(notificationError);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('キャンセル依頼の送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmittingCancelRequestId(null);
    }
  };

  const sortedReservations = useMemo(() => {
    const now = Date.now();
    return [...reservations].sort((a, b) => {
      const aDiff = Math.abs(new Date(a.reservationDatetime).getTime() - now);
      const bDiff = Math.abs(new Date(b.reservationDatetime).getTime() - now);
      return aDiff - bDiff;
    });
  }, [reservations]);

  const requestCode = async (options?: { isResend?: boolean }) => {
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
      setSuccessMessage(options?.isResend ? '認証コードを再送信しました。メールをご確認ください。' : '認証コードを送信しました。メールをご確認ください。');
    } catch (error) {
      console.error(error);
      setErrorMessage('認証コード送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSendingCode(false);
    }
  };

  const sendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await requestCode();
  };

  const resendCode = async () => {
    await requestCode({ isResend: true });
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
      setSuccessMessage(
        fetchedReservations.length === 0
          ? '該当する予約はありませんでした。予約時に入力したメールアドレスと同じメールアドレスで確認してください。'
          : '予約情報を表示しました。',
      );
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
        <p className="form-hint">
          {codeSentAt ? 'メールアドレスへ認証コードを送りました。予約内容を確認できます。' : 'メールアドレスへ認証コードを送ります。予約内容を確認できます。'}
        </p>

        <form className="shop-form" noValidate onSubmit={(e) => void sendCode(e)}>
          <div>
            <label htmlFor="customerEmail">メールアドレス</label>
            <input id="customerEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="shop-form-actions">
            <button type="submit" className="button-primary" disabled={isSendingCode || Boolean(codeSentAt)}>
              認証コードを送信
            </button>
            {codeSentAt ? (
              <button type="button" className="button-secondary" disabled={isSendingCode} onClick={() => { void resendCode(); }}>
                認証コードを再送信
              </button>
            ) : null}
          </div>
        </form>

        {isSendingCode ? <p>認証コードを送信中...</p> : null}

        {codeSentAt ? (
          <form className="shop-form" noValidate onSubmit={(e) => void verifyCodeAndFetchReservations(e)}>
            <div>
              <label htmlFor="verificationCode">認証コード</label>
              <p className="form-hint">メールに届いた6桁の数字を入力してください。</p>
              <input
                id="verificationCode"
                inputMode="numeric"
                maxLength={6}
                placeholder="例：123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
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
            <div>
              <dt>ステータス</dt>
              <dd>
                <span className={`reservation-status ${RESERVATION_STATUS_CLASS_NAMES[reservation.status]}`}>
                  {RESERVATION_STATUS_LABELS[reservation.status]}
                </span>
              </dd>
            </div>
            <div><dt>備考</dt><dd>{reservation.note || '—'}</dd></div>
            <div><dt>キャンセル理由</dt><dd>{reservation.cancelReason || '—'}</dd></div>
            <div><dt>申込日時</dt><dd>{formatReservationDatetime(reservation.createdAt)}</dd></div>
            <div><dt>キャンセル依頼</dt><dd>{reservation.cancelRequestedAt ? 'キャンセル依頼済み' : '—'}</dd></div>
            {reservation.cancelRequestedAt ? <div><dt>キャンセル依頼理由</dt><dd>{reservation.cancelRequestReason || '—'}</dd></div> : null}
            <div><dt>予約変更依頼</dt><dd>{reservation.changeRequestedAt ? '変更依頼済み' : '—'}</dd></div>
            {reservation.changeRequestedAt ? <div><dt>希望日時</dt><dd>{reservation.changeRequestDatetime ? formatReservationDatetime(reservation.changeRequestDatetime) : '—'}</dd></div> : null}
            {reservation.changeRequestedAt ? <div><dt>希望人数</dt><dd>{reservation.changeRequestPartySize ? `${reservation.changeRequestPartySize}名` : '—'}</dd></div> : null}
            {reservation.changeRequestedAt ? <div><dt>変更依頼内容</dt><dd>{reservation.changeRequestNote || '—'}</dd></div> : null}
          </dl>
          <div className="reservation-check-actions">
            {reservation.status === 'canceled' ? (
              <p
                className="checklist-item-attention"
                style={{ borderWidth: 2, fontSize: '1rem', fontWeight: 800, marginTop: '0.8rem', padding: '0.85rem' }}
              >
                この予約はキャンセル済みです。
              </p>
            ) : reservation.status === 'visited' ? (
              <p
                className="checklist-item-ok"
                style={{ borderWidth: 2, fontSize: '1rem', fontWeight: 800, marginTop: '0.8rem', padding: '0.85rem' }}
              >
                この予約は来店済みです。
              </p>
            ) : (
              <>
                {reservation.changeRequestedAt ? (
                  <p
                    className="checklist-item-attention"
                    style={{ borderWidth: 2, fontSize: '1rem', fontWeight: 800, marginTop: '0.8rem', padding: '0.85rem' }}
                  >
                    予約変更依頼を送信済みです。店舗からの確認連絡をお待ちください。
                  </p>
                ) : editingChangeRequestId === reservation.id ? (
                  <form className="shop-form" onSubmit={(event) => { void handleChangeRequestSubmit(event, reservation); }}>
                    <div>
                      <label htmlFor={`change-datetime-${reservation.id}`}>希望日時</label>
                      <p className="form-hint">カレンダーから希望する日付と時間を選択してください。日時変更が不要な場合は空欄で構いません。</p>
                      <input
                        id={`change-datetime-${reservation.id}`}
                        type="datetime-local"
                        value={changeRequestDatetime}
                        onChange={(event) => setChangeRequestDatetime(event.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor={`change-party-size-${reservation.id}`}>希望人数</label>
                      <input
                        id={`change-party-size-${reservation.id}`}
                        type="number"
                        min="1"
                        inputMode="numeric"
                        placeholder="例：2"
                        value={changeRequestPartySize}
                        onChange={(event) => setChangeRequestPartySize(event.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor={`change-note-${reservation.id}`}>ご要望はこちら</label>
                      <p className="form-hint">ご希望や店舗への連絡事項があれば入力してください。</p>
                      <textarea
                        id={`change-note-${reservation.id}`}
                        rows={4}
                        placeholder="例：30分遅らせたい、子ども連れです、カウンター以外を希望します"
                        value={changeRequestNote}
                        onChange={(event) => setChangeRequestNote(event.target.value)}
                      />
                    </div>
                    <div className="shop-form-actions">
                      <button type="submit" className="button-primary" disabled={submittingChangeRequestId === reservation.id}>
                        {submittingChangeRequestId === reservation.id ? '送信中...' : '変更依頼を送信'}
                      </button>
                      <button type="button" className="button-secondary" disabled={submittingChangeRequestId === reservation.id} onClick={closeChangeRequestForm}>
                        閉じる
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="form-hint">
                      予約日時や人数の変更をご希望の場合は、店舗へ変更依頼を送信できます。
                    </p>
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={submittingChangeRequestId === reservation.id}
                      onClick={() => { openChangeRequestForm(reservation); }}
                    >
                      予約変更依頼
                    </button>
                  </>
                )}
                {reservation.cancelRequestedAt ? (
                  <p
                    className="checklist-item-attention"
                    style={{ borderWidth: 2, fontSize: '1rem', fontWeight: 800, marginTop: '0.8rem', padding: '0.85rem' }}
                  >
                    キャンセル依頼を送信済みです。店舗からの確認連絡をお待ちください。
                  </p>
                ) : (
                  <>
                    <p className="form-hint">
                      キャンセルをご希望の場合は、店舗へキャンセル依頼を送信できます。
                      店舗確認後にキャンセル処理が行われます。
                    </p>
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={submittingCancelRequestId === reservation.id}
                      onClick={() => { void handleCancelRequest(reservation); }}
                    >
                      {submittingCancelRequestId === reservation.id ? '送信中...' : 'キャンセル依頼'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
