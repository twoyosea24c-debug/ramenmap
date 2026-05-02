import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cancelReservation,
  fetchReservations,
  updateReservationAdminMemo,
  updateReservationStatus,
} from '../services/reservationService';
import type { Reservation, ReservationStatus } from '../types';

const STATUS_OPTIONS: Array<ReservationStatus | 'all'> = ['all', 'pending', 'confirmed', 'canceled', 'visited'];
const UPDATE_STATUS_OPTIONS: ReservationStatus[] = ['pending', 'confirmed', 'canceled', 'visited'];

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

const FILTER_LABEL: Record<(typeof STATUS_OPTIONS)[number], string> = {
  all: 'すべて',
  pending: '未確認',
  confirmed: '確認済み',
  canceled: 'キャンセル',
  visited: '来店済み',
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const CANCEL_REASON_OPTIONS = ['お客様都合', '店舗都合', '連絡なし', '重複予約', 'その他'] as const;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const isUrgentPendingReservation = (reservation: Reservation) => {
  if (reservation.status !== 'pending') return false;
  const diff = new Date(reservation.reservationDatetime).getTime() - Date.now();
  return diff >= 0 && diff <= ONE_DAY_MS;
};

export function AdminReservationsPage() {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusErrorMessage, setStatusErrorMessage] = useState('');
  const [memoErrorMessage, setMemoErrorMessage] = useState('');
  const [updatingReservationIds, setUpdatingReservationIds] = useState<Record<string, boolean>>({});
  const [editingMemoReservationId, setEditingMemoReservationId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [savingMemoReservationIds, setSavingMemoReservationIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadReservations = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await fetchReservations();
        setReservations(data);
      } catch {
        setErrorMessage('予約状況を取得できませんでした。Supabase設定を確認してください。');
      } finally {
        setIsLoading(false);
      }
    };

    void loadReservations();
  }, []);

  const filteredReservations = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return reservations
      .filter((reservation) => {
        const matchesKeyword =
          normalizedKeyword.length === 0 ||
          reservation.shopName.toLowerCase().includes(normalizedKeyword) ||
          reservation.customerName.toLowerCase().includes(normalizedKeyword) ||
          reservation.customerPhone.toLowerCase().includes(normalizedKeyword) ||
          reservation.customerEmail.toLowerCase().includes(normalizedKeyword);

        const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
        return matchesKeyword && matchesStatus;
      })
      .sort((a, b) => {
        const aUrgent = isUrgentPendingReservation(a);
        const bUrgent = isUrgentPendingReservation(b);
        if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;

        const aPending = a.status === 'pending';
        const bPending = b.status === 'pending';
        if (aPending !== bPending) return aPending ? -1 : 1;

        return new Date(a.reservationDatetime).getTime() - new Date(b.reservationDatetime).getTime();
      });
  }, [keyword, reservations, statusFilter]);

  const summary = useMemo(() => {
    const todayDate = new Date().toLocaleDateString('sv-SE');

    const todayCount = reservations.filter((reservation) => {
      const reservationDate = new Date(reservation.reservationDatetime).toLocaleDateString('sv-SE');
      return reservationDate === todayDate;
    }).length;

    return {
      total: reservations.length,
      pending: reservations.filter((reservation) => reservation.status === 'pending').length,
      today: todayCount,
      canceled: reservations.filter((reservation) => reservation.status === 'canceled').length,
    };
  }, [reservations]);

  const commitReservationStatusChange = async (reservationId: string, nextStatus: ReservationStatus) => {
    setStatusErrorMessage('');
    setUpdatingReservationIds((prev) => ({ ...prev, [reservationId]: true }));

    try {
      const updatedReservation = await updateReservationStatus(reservationId, nextStatus);
      setReservations((prev) =>
        prev.map((reservation) => (reservation.id === updatedReservation.id ? updatedReservation : reservation)),
      );
    } catch {
      setStatusErrorMessage('ステータスの更新に失敗しました。Supabase設定を確認してください。');
    } finally {
      setUpdatingReservationIds((prev) => {
        const next = { ...prev };
        delete next[reservationId];
        return next;
      });
    }
  };

  const handleStatusChange = async (reservation: Reservation, nextStatus: ReservationStatus) => {
    if (nextStatus === reservation.status) {
      return;
    }

    if (nextStatus === 'canceled') {
      const confirmed = window.confirm('この予約をキャンセルしますか？');
      if (!confirmed) {
        return;
      }
    }

    await commitReservationStatusChange(reservation.id, nextStatus);
  };

  const handleCancelReservation = async (reservation: Reservation) => {
    const suggested = `キャンセル理由を入力してください。\n候補: ${CANCEL_REASON_OPTIONS.join(' / ')}`;
    const input = window.prompt(suggested, reservation.cancelReason ?? '');
    if (input === null) {
      return;
    }

    const cancelReason = input.trim();
    if (cancelReason.length === 0) {
      setStatusErrorMessage('キャンセル理由を入力してください。');
      return;
    }

    setStatusErrorMessage('');
    setUpdatingReservationIds((prev) => ({ ...prev, [reservation.id]: true }));
    try {
      const updated = await cancelReservation(reservation.id, cancelReason);
      setReservations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setStatusErrorMessage('キャンセル処理に失敗しました。Supabase設定を確認してください。');
    } finally {
      setUpdatingReservationIds((prev) => {
        const next = { ...prev };
        delete next[reservation.id];
        return next;
      });
    }
  };

  const handleStartMemoEdit = (reservation: Reservation) => {
    setEditingMemoReservationId(reservation.id);
    setMemoErrorMessage('');
    setMemoDraft(reservation.adminMemo ?? '');
  };

  const handleSaveMemo = async (reservationId: string) => {
    setMemoErrorMessage('');
    setSavingMemoReservationIds((prev) => ({ ...prev, [reservationId]: true }));
    try {
      const updated = await updateReservationAdminMemo(reservationId, memoDraft);
      setReservations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingMemoReservationId(null);
      setMemoDraft('');
    } catch {
      setMemoErrorMessage('管理メモの保存に失敗しました。Supabase設定を確認してください。');
    } finally {
      setSavingMemoReservationIds((prev) => {
        const next = { ...prev };
        delete next[reservationId];
        return next;
      });
    }
  };

  return (
    <section className="card detail-wrapper">
      <div className="page-header">
        <h1>予約管理</h1>
        <Link to="/admin" className="button-secondary">管理者ダッシュボードへ戻る</Link>
      </div>

      <section className="reservation-summary-grid" aria-label="予約件数サマリー">
        <article className="reservation-summary-card">
          <h2>全予約数</h2>
          <p>{summary.total}件</p>
        </article>
        <article className="reservation-summary-card reservation-summary-alert">
          <h2>未確認</h2>
          <p>{summary.pending}件</p>
        </article>
        <article className="reservation-summary-card">
          <h2>本日の予約</h2>
          <p>{summary.today}件</p>
        </article>
        <article className="reservation-summary-card reservation-summary-cancelled">
          <h2>キャンセル</h2>
          <p>{summary.canceled}件</p>
        </article>
      </section>

      <section className="reservation-filter-grid" aria-label="予約の検索と絞り込み">
        <div>
          <label htmlFor="reservation-search">店舗名 / 予約者名 / 電話番号 / メールアドレスで検索</label>
          <input
            id="reservation-search"
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="例: 新宿 / 山田 / 090 / user@example.com"
          />
        </div>
        <div>
          <label htmlFor="reservation-status-filter">ステータスで絞り込み</label>
          <select
            id="reservation-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number])}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {FILTER_LABEL[status]}
              </option>
            ))}
          </select>
        </div>
      </section>

      {isLoading ? <p className="result-count">予約状況を読み込み中...</p> : null}
      {!isLoading && errorMessage ? <p className="result-count">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && statusErrorMessage ? (
        <p className="result-count reservation-update-error">{statusErrorMessage}</p>
      ) : null}
      {!isLoading && !errorMessage && memoErrorMessage ? <p className="result-count reservation-update-error">{memoErrorMessage}</p> : null}
      {!isLoading && !errorMessage ? <p className="result-count">表示件数: {filteredReservations.length}件</p> : null}

      {!isLoading && !errorMessage && filteredReservations.length === 0 ? (
        <p className="empty-message">まだ予約はありません。</p>
      ) : null}

      {!isLoading && !errorMessage && filteredReservations.length > 0 ? (
        <div className="reservation-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>予約ID</th><th>店舗名</th><th>予約者名</th><th>電話番号</th><th>メールアドレス</th>
                <th>予約日時</th><th>人数</th><th>ステータス</th><th>操作</th><th>キャンセル理由</th><th>管理メモ</th><th>備考</th><th>申込日時</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map((reservation) => {
                const isUpdating = updatingReservationIds[reservation.id] ?? false;
                const isSavingMemo = savingMemoReservationIds[reservation.id] ?? false;
                const isEditingMemo = editingMemoReservationId === reservation.id;

                return (
                  <tr key={reservation.id} className={isUrgentPendingReservation(reservation) ? 'reservation-row-urgent-pending' : reservation.status === 'pending' ? 'reservation-row-pending' : undefined}>
                    <td>{reservation.id}</td>
                    <td>{reservation.shopName}</td>
                    <td>{reservation.customerName}</td>
                    <td>{reservation.customerPhone}</td>
                    <td>{reservation.customerEmail}</td>
                    <td>
                      {formatDateTime(reservation.reservationDatetime)}
                      {isUrgentPendingReservation(reservation) ? <span className="reservation-urgent-badge">24時間以内の予約</span> : null}
                    </td>
                    <td>{reservation.partySize}名</td>
                    <td>
                      <div className="reservation-status-actions">
                        <span className={STATUS_CLASS_NAME[reservation.status]}>{STATUS_LABEL[reservation.status]}</span>
                        <select
                          aria-label={`予約ID ${reservation.id} のステータス変更`}
                          value={reservation.status}
                          disabled={isUpdating}
                          onChange={(event) => {
                            const nextStatus = event.target.value as ReservationStatus;
                            void handleStatusChange(reservation, nextStatus);
                          }}
                        >
                          {UPDATE_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABEL[status]}
                            </option>
                          ))}
                        </select>
                        {isUpdating ? <p className="reservation-status-updating">更新中...</p> : null}
                      </div>
                    </td>
                    <td>
                      {reservation.status === 'canceled' ? (
                        <span className="reservation-action-muted">キャンセル済み</span>
                      ) : (
                        <button
                          type="button"
                          className="button-danger reservation-cancel-button"
                          disabled={isUpdating}
                          onClick={() => {
                            void handleCancelReservation(reservation);
                          }}
                        >
                          キャンセル
                        </button>
                      )}
                    </td>
                    <td>{reservation.status === 'canceled' ? reservation.cancelReason ?? '—' : '—'}</td>
                    <td>
                      {isEditingMemo ? (
                        <div className="reservation-memo-editor">
                          <textarea
                            value={memoDraft}
                            onChange={(event) => setMemoDraft(event.target.value)}
                            rows={3}
                          />
                          <div className="reservation-memo-actions">
                            <button type="button" className="button-primary" disabled={isSavingMemo} onClick={() => void handleSaveMemo(reservation.id)}>
                              {isSavingMemo ? '保存中...' : '保存'}
                            </button>
                            <button
                              type="button"
                              className="button-secondary"
                              disabled={isSavingMemo}
                              onClick={() => {
                                setEditingMemoReservationId(null);
                                setMemoDraft('');
                              }}
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="reservation-memo-display">
                          <p>{reservation.adminMemo?.trim() ? reservation.adminMemo : '—'}</p>
                          <button type="button" className="button-secondary" onClick={() => handleStartMemoEdit(reservation)}>
                            メモ編集
                          </button>
                        </div>
                      )}
                    </td>
                    <td>{reservation.note?.trim() ? reservation.note : '—'}</td>
                    <td>{formatDateTime(reservation.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
