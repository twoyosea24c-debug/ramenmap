import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  cancelReservation,
  fetchReservationById,
  sendReservationCancelledEmail,
  sendReservationConfirmationEmail,
  updateReservationAdminMemo,
  updateReservationStatus,
} from '../services/reservationService';
import type { Reservation, ReservationStatus, SupabaseReservationRow } from '../types';

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: '未確認',
  confirmed: '確認済み',
  canceled: 'キャンセル',
  visited: '来店済み',
};

const STATUS_CLASS_NAME: Record<ReservationStatus, string> = {
  pending: 'reservation-status reservation-status-pending',
  confirmed: 'reservation-status reservation-status-confirmed',
  canceled: 'reservation-status reservation-status-cancelled',
  visited: 'reservation-status reservation-status-completed',
};

const UPDATE_STATUS_OPTIONS: ReservationStatus[] = ['pending', 'confirmed', 'canceled', 'visited'];
const CANCEL_REASON_OPTIONS = ['お客様都合', '店舗都合', '連絡なし', '重複予約', 'その他'] as const;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const mapReservationRow = (row: SupabaseReservationRow): Reservation => ({
  id: row.id,
  shopId: row.shop_id,
  shopName: row.shop_name,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  customerEmail: row.customer_email,
  reservationDatetime: row.reservation_datetime,
  partySize: row.party_size,
  status: row.status,
  note: row.note,
  cancelReason: row.cancel_reason,
  adminMemo: row.admin_memo,
  cancelRequestedAt: row.cancel_requested_at,
  cancelRequestReason: row.cancel_request_reason,
  cancelCompletionEmailSentAt: row.cancel_completion_email_sent_at,
  changeRequestedAt: row.change_requested_at,
  changeRequestDatetime: row.change_request_datetime,
  changeRequestPartySize: row.change_request_party_size,
  changeRequestNote: row.change_request_note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function AdminReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusErrorMessage, setStatusErrorMessage] = useState('');
  const [memoErrorMessage, setMemoErrorMessage] = useState('');
  const [memoDraft, setMemoDraft] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isApplyingChangeRequest, setIsApplyingChangeRequest] = useState(false);

  useEffect(() => {
    const loadReservation = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await fetchReservationById(id);
        setReservation(data);
        setMemoDraft(data?.adminMemo ?? '');
      } catch {
        setErrorMessage('予約情報の取得に失敗しました。Supabase設定を確認してください。');
      } finally {
        setIsLoading(false);
      }
    };

    void loadReservation();
  }, [id]);

  const handleStatusChange = async (nextStatus: ReservationStatus) => {
    if (!reservation || nextStatus === reservation.status) return;

    if (nextStatus === 'canceled') {
      const confirmed = window.confirm('この予約をキャンセルしますか？');
      if (!confirmed) return;
    }

    setStatusErrorMessage('');
    setIsUpdatingStatus(true);
    try {
      const updated = await updateReservationStatus(reservation.id, nextStatus);
      setReservation(updated);
      setMemoDraft(updated.adminMemo ?? '');
      if (updated.status === 'canceled') {
        try {
          const emailedReservation = await sendReservationCancelledEmail(updated);
          setReservation(emailedReservation);
        } catch (notificationError) {
          console.error(notificationError);
        }
      }
    } catch {
      setStatusErrorMessage('ステータスの更新に失敗しました。Supabase設定を確認してください。');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleApplyChangeRequest = async () => {
    if (!reservation || !reservation.changeRequestedAt || !supabase) return;
    const confirmed = window.confirm('変更依頼の内容を現在の予約に反映しますか？');
    if (!confirmed) return;

    setStatusErrorMessage('');
    setIsApplyingChangeRequest(true);
    try {
      const updatePayload: Partial<SupabaseReservationRow> = {
        change_requested_at: null,
        change_request_datetime: null,
        change_request_party_size: null,
        change_request_note: null,
      };
      if (reservation.changeRequestDatetime) updatePayload.reservation_datetime = reservation.changeRequestDatetime;
      if (reservation.changeRequestPartySize) updatePayload.party_size = reservation.changeRequestPartySize;
      if (reservation.status === 'pending') updatePayload.status = 'confirmed';

      const { data, error } = await supabase
        .from('reservations')
        .update(updatePayload)
        .eq('id', reservation.id)
        .select('*')
        .single();

      if (error) throw error;
      const updated = mapReservationRow(data as SupabaseReservationRow);
      setReservation(updated);
      setMemoDraft(updated.adminMemo ?? '');
      try {
        await sendReservationConfirmationEmail({
          reservationId: updated.id,
          customerName: updated.customerName,
          customerPhone: updated.customerPhone,
          customerEmail: updated.customerEmail,
          shopName: updated.shopName,
          reservationDatetime: updated.reservationDatetime,
          partySize: updated.partySize,
          note: updated.note,
          notificationType: 'changed',
        });
      } catch (notificationError) {
        console.error(notificationError);
      }
    } catch (error) {
      console.error(error);
      setStatusErrorMessage('変更依頼の反映に失敗しました。Supabase設定を確認してください。');
    } finally {
      setIsApplyingChangeRequest(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;

    const suggested = `キャンセル理由を入力してください。\n候補: ${CANCEL_REASON_OPTIONS.join(' / ')}`;
    const input = window.prompt(suggested, reservation.cancelReason ?? '');
    if (input === null) return;

    const cancelReason = input.trim();
    if (cancelReason.length === 0) {
      setStatusErrorMessage('キャンセル理由を入力してください。');
      return;
    }

    setStatusErrorMessage('');
    setIsUpdatingStatus(true);
    try {
      const updated = await cancelReservation(reservation.id, cancelReason);
      setReservation(updated);
      setMemoDraft(updated.adminMemo ?? '');
      try {
        const emailedReservation = await sendReservationCancelledEmail(updated);
        setReservation(emailedReservation);
        setMemoDraft(emailedReservation.adminMemo ?? '');
      } catch (notificationError) {
        console.error(notificationError);
      }
    } catch {
      setStatusErrorMessage('キャンセル処理に失敗しました。Supabase設定を確認してください。');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveMemo = async () => {
    if (!reservation) return;
    setMemoErrorMessage('');
    setIsSavingMemo(true);
    try {
      const updated = await updateReservationAdminMemo(reservation.id, memoDraft);
      setReservation(updated);
      setMemoDraft(updated.adminMemo ?? '');
    } catch {
      setMemoErrorMessage('管理メモの保存に失敗しました。Supabase設定を確認してください。');
    } finally {
      setIsSavingMemo(false);
    }
  };

  return (
    <section className="card detail-wrapper">
      <div className="page-header">
        <h1>予約詳細</h1>
        <Link to="/admin/reservations" className="button-secondary">予約一覧へ戻る</Link>
      </div>

      {isLoading ? <p className="result-count">予約情報を読み込み中...</p> : null}
      {!isLoading && errorMessage ? <p className="result-count">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && !reservation ? <p className="result-count">予約が見つかりません。</p> : null}

      {!isLoading && !errorMessage && reservation?.changeRequestedAt ? (
        <section className="checklist-item-attention">
          <strong>予約変更依頼があります。</strong>
          <p>希望日時：{reservation.changeRequestDatetime ? formatDateTime(reservation.changeRequestDatetime) : '—'}</p>
          <p>希望人数：{reservation.changeRequestPartySize ? `${reservation.changeRequestPartySize}名` : '—'}</p>
          <p>ご要望：{reservation.changeRequestNote?.trim() ? reservation.changeRequestNote : '—'}</p>
          <p>依頼日時：{formatDateTime(reservation.changeRequestedAt)}</p>
          <button type="button" className="button-primary" disabled={isApplyingChangeRequest} onClick={() => void handleApplyChangeRequest()}>
            {isApplyingChangeRequest ? '変更反映中...' : 'この変更依頼を予約に反映'}
          </button>
        </section>
      ) : null}

      {!isLoading && !errorMessage && reservation?.cancelRequestedAt ? (
        <section className={reservation.status === 'canceled' ? 'checklist-item-ok' : 'checklist-item-attention'}>
          <strong>{reservation.status === 'canceled' ? 'キャンセル依頼から処理済みです。' : 'キャンセル依頼があります。'}</strong>
          <p>{reservation.cancelRequestReason?.trim() ? `依頼理由：${reservation.cancelRequestReason}` : '依頼理由：理由未入力'}</p>
          <p>依頼日時：{formatDateTime(reservation.cancelRequestedAt)}</p>
        </section>
      ) : null}

      {!isLoading && !errorMessage && reservation?.status === 'canceled' ? (
        <section className={reservation.cancelCompletionEmailSentAt ? 'checklist-item-ok' : 'checklist-item-attention'}>
          <strong>{reservation.cancelCompletionEmailSentAt ? 'キャンセル完了メール送信済み' : 'キャンセル完了メール未送信'}</strong>
          <p>{reservation.cancelCompletionEmailSentAt ? `送信日時：${formatDateTime(reservation.cancelCompletionEmailSentAt)}` : 'キャンセル完了メールはまだ送信記録がありません。'}</p>
        </section>
      ) : null}

      {!isLoading && !errorMessage && reservation ? (
        <div className="reservation-detail-grid">
          <article className="card reservation-detail-card">
            <h2>基本情報</h2>
            <dl className="reservation-detail-list">
              <div><dt>予約ID</dt><dd>{reservation.id}</dd></div>
              <div><dt>店舗名</dt><dd>{reservation.shopName}</dd></div>
              <div><dt>予約者名</dt><dd>{reservation.customerName}</dd></div>
              <div><dt>電話番号</dt><dd>{reservation.customerPhone}</dd></div>
              <div><dt>メールアドレス</dt><dd>{reservation.customerEmail}</dd></div>
              <div><dt>予約日時</dt><dd>{formatDateTime(reservation.reservationDatetime)}</dd></div>
              <div><dt>人数</dt><dd>{reservation.partySize}名</dd></div>
              <div><dt>ステータス</dt><dd><span className={STATUS_CLASS_NAME[reservation.status]}>{STATUS_LABEL[reservation.status]}</span></dd></div>
              <div><dt>備考</dt><dd>{reservation.note?.trim() ? reservation.note : '—'}</dd></div>
              <div><dt>予約変更依頼日時</dt><dd>{reservation.changeRequestedAt ? formatDateTime(reservation.changeRequestedAt) : '—'}</dd></div>
              <div><dt>変更希望日時</dt><dd>{reservation.changeRequestDatetime ? formatDateTime(reservation.changeRequestDatetime) : '—'}</dd></div>
              <div><dt>変更希望人数</dt><dd>{reservation.changeRequestPartySize ? `${reservation.changeRequestPartySize}名` : '—'}</dd></div>
              <div><dt>変更依頼のご要望</dt><dd>{reservation.changeRequestNote?.trim() ? reservation.changeRequestNote : '—'}</dd></div>
              <div><dt>キャンセル理由</dt><dd>{reservation.cancelReason?.trim() ? reservation.cancelReason : '—'}</dd></div>
              <div><dt>キャンセル完了メール</dt><dd>{reservation.cancelCompletionEmailSentAt ? `送信済み（${formatDateTime(reservation.cancelCompletionEmailSentAt)}）` : '—'}</dd></div>
              <div><dt>キャンセル依頼日時</dt><dd>{reservation.cancelRequestedAt ? formatDateTime(reservation.cancelRequestedAt) : '—'}</dd></div>
              <div><dt>キャンセル依頼理由</dt><dd>{reservation.cancelRequestReason?.trim() ? reservation.cancelRequestReason : '—'}</dd></div>
              <div><dt>申込日時</dt><dd>{formatDateTime(reservation.createdAt)}</dd></div>
              <div><dt>更新日時</dt><dd>{formatDateTime(reservation.updatedAt)}</dd></div>
            </dl>
          </article>

          <article className="card reservation-detail-card">
            <h2>管理操作</h2>
            {statusErrorMessage ? <p className="result-count reservation-update-error">{statusErrorMessage}</p> : null}
            {memoErrorMessage ? <p className="result-count reservation-update-error">{memoErrorMessage}</p> : null}

            <div className="reservation-detail-actions">
              <label htmlFor="detail-status">ステータス変更</label>
              <select
                id="detail-status"
                value={reservation.status}
                disabled={isUpdatingStatus}
                onChange={(event) => {
                  void handleStatusChange(event.target.value as ReservationStatus);
                }}
              >
                {UPDATE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                ))}
              </select>
              {reservation.status !== 'canceled' ? (
                <button type="button" className="button-danger" disabled={isUpdatingStatus} onClick={() => void handleCancel()}>
                  {isUpdatingStatus ? '処理中...' : 'キャンセルする'}
                </button>
              ) : null}
            </div>

            <div className="reservation-detail-actions">
              <label htmlFor="detail-admin-memo">管理メモ</label>
              <textarea
                id="detail-admin-memo"
                rows={5}
                value={memoDraft}
                onChange={(event) => setMemoDraft(event.target.value)}
              />
              <button type="button" className="button-primary" disabled={isSavingMemo} onClick={() => void handleSaveMemo()}>
                {isSavingMemo ? '保存中...' : '管理メモを保存'}
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
