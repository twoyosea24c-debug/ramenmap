import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  bulkUpdateReservationStatus,
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
const DATE_FILTER_OPTIONS = ['all', 'today', 'tomorrow', 'thisWeek', 'thisMonth', 'custom'] as const;
const SORT_OPTIONS = ['reservationAsc', 'reservationDesc', 'createdDesc', 'createdAsc', 'pendingFirst'] as const;
type DateFilter = (typeof DATE_FILTER_OPTIONS)[number];
type SortOption = (typeof SORT_OPTIONS)[number];

const DATE_FILTER_LABEL: Record<DateFilter, string> = {
  all: 'すべて',
  today: '今日',
  tomorrow: '明日',
  thisWeek: '今週',
  thisMonth: '今月',
  custom: '任意期間',
};

const SORT_LABEL: Record<SortOption, string> = {
  reservationAsc: '予約日時が近い順',
  reservationDesc: '予約日時が遠い順',
  createdDesc: '申込日時が新しい順',
  createdAsc: '申込日時が古い順',
  pendingFirst: '未確認を優先',
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const isUrgentPendingReservation = (reservation: Reservation) => {
  if (reservation.status !== 'pending') return false;
  const diff = new Date(reservation.reservationDatetime).getTime() - Date.now();
  return diff >= 0 && diff <= ONE_DAY_MS;
};

export function AdminReservationsPage() {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('pendingFirst');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusErrorMessage, setStatusErrorMessage] = useState('');
  const [memoErrorMessage, setMemoErrorMessage] = useState('');
  const [updatingReservationIds, setUpdatingReservationIds] = useState<Record<string, boolean>>({});
  const [editingMemoReservationId, setEditingMemoReservationId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [savingMemoReservationIds, setSavingMemoReservationIds] = useState<Record<string, boolean>>({});
  const [selectedReservationIds, setSelectedReservationIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ReservationStatus>('confirmed');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

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
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrowStart = new Date(tomorrowStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);
    const weekStart = new Date(todayStart);
    const day = weekStart.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return reservations
      .filter((reservation) => {
        const matchesKeyword =
          normalizedKeyword.length === 0 ||
          reservation.shopName.toLowerCase().includes(normalizedKeyword) ||
          reservation.customerName.toLowerCase().includes(normalizedKeyword) ||
          reservation.customerPhone.toLowerCase().includes(normalizedKeyword) ||
          reservation.customerEmail.toLowerCase().includes(normalizedKeyword);

        const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
        const reservationDate = new Date(reservation.reservationDatetime);
        const matchesDateFilter =
          dateFilter === 'all' ||
          (dateFilter === 'today' && reservationDate >= todayStart && reservationDate < tomorrowStart) ||
          (dateFilter === 'tomorrow' && reservationDate >= tomorrowStart && reservationDate < dayAfterTomorrowStart) ||
          (dateFilter === 'thisWeek' && reservationDate >= weekStart && reservationDate < nextWeekStart) ||
          (dateFilter === 'thisMonth' && reservationDate >= monthStart && reservationDate < nextMonthStart) ||
          (dateFilter === 'custom' &&
            (!customStartDate || reservationDate >= new Date(`${customStartDate}T00:00:00`)) &&
            (!customEndDate || reservationDate < new Date(`${customEndDate}T23:59:59.999`)));
        return matchesKeyword && matchesStatus && matchesDateFilter;
      })
      .sort((a, b) => {
        const aReservationTime = new Date(a.reservationDatetime).getTime();
        const bReservationTime = new Date(b.reservationDatetime).getTime();
        const aCreatedTime = new Date(a.createdAt).getTime();
        const bCreatedTime = new Date(b.createdAt).getTime();

        if (sortOption === 'reservationAsc') return aReservationTime - bReservationTime;
        if (sortOption === 'reservationDesc') return bReservationTime - aReservationTime;
        if (sortOption === 'createdDesc') return bCreatedTime - aCreatedTime;
        if (sortOption === 'createdAsc') return aCreatedTime - bCreatedTime;

        const aPending = a.status === 'pending';
        const bPending = b.status === 'pending';
        if (aPending !== bPending) return aPending ? -1 : 1;
        return aReservationTime - bReservationTime;
      });
  }, [keyword, reservations, statusFilter, dateFilter, customStartDate, customEndDate, sortOption]);

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

  const allVisibleSelected =
    filteredReservations.length > 0 && filteredReservations.every((reservation) => selectedReservationIds.includes(reservation.id));


  useEffect(() => {
    const visibleReservationIds = new Set(filteredReservations.map((reservation) => reservation.id));
    setSelectedReservationIds((prev) => prev.filter((id) => visibleReservationIds.has(id)));
  }, [filteredReservations]);


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
    if (isBulkUpdating) {
      return;
    }
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
    if (isBulkUpdating) {
      return;
    }
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

  const toggleReservationSelection = (reservationId: string) => {
    if (isBulkUpdating) return;
    setSelectedReservationIds((prev) =>
      prev.includes(reservationId) ? prev.filter((id) => id !== reservationId) : [...prev, reservationId],
    );
  };

  const toggleSelectAllVisibleReservations = () => {
    if (isBulkUpdating) return;
    if (allVisibleSelected) {
      setSelectedReservationIds((prev) =>
        prev.filter((id) => !filteredReservations.some((reservation) => reservation.id === id)),
      );
      return;
    }
    setSelectedReservationIds((prev) => {
      const visibleIds = filteredReservations.map((reservation) => reservation.id);
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedReservationIds.length === 0) return;
    let cancelReason: string | undefined;
    if (bulkStatus === 'canceled') {
      const confirmed = window.confirm('選択した予約をすべてキャンセルしますか？');
      if (!confirmed) return;
      const input = window.prompt('キャンセル理由を入力してください', '');
      if (input === null) return;
      const trimmedReason = input.trim();
      if (trimmedReason.length === 0) {
        setStatusErrorMessage('キャンセル理由を入力してください。');
        return;
      }
      cancelReason = trimmedReason;
    }

    setStatusErrorMessage('');
    setIsBulkUpdating(true);
    try {
      const updatedReservations = await bulkUpdateReservationStatus(selectedReservationIds, bulkStatus, cancelReason);
      const updatedById = new Map(updatedReservations.map((reservation) => [reservation.id, reservation]));
      setReservations((prev) =>
        prev.map((reservation) => updatedById.get(reservation.id) ?? reservation),
      );
      setSelectedReservationIds([]);
    } catch {
      setStatusErrorMessage('一括ステータス変更に失敗しました。Supabase設定を確認してください。');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredReservations.length === 0) return;
    const headers = [
      '予約ID',
      '店舗名',
      '予約者名',
      '電話番号',
      'メールアドレス',
      '予約日時',
      '人数',
      'ステータス',
      'キャンセル理由',
      '管理メモ',
      '備考',
      '申込日時',
    ];
    const escapeCsvField = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredReservations.map((reservation) => [
      reservation.id,
      reservation.shopName,
      reservation.customerName,
      reservation.customerPhone,
      reservation.customerEmail,
      reservation.reservationDatetime,
      reservation.partySize,
      STATUS_LABEL[reservation.status],
      reservation.cancelReason ?? '',
      reservation.adminMemo ?? '',
      reservation.note ?? '',
      reservation.createdAt,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((field) => escapeCsvField(field)).join(','))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const now = new Date();
    anchor.href = url;
    anchor.download = `ramenmap-reservations-${now.toISOString().slice(0, 10)}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card detail-wrapper">
      <div className="page-header">
        <h1>予約管理</h1>
        <div className="page-header-actions">
          <button type="button" className="button-primary" disabled={filteredReservations.length === 0} onClick={handleExportCsv}>
            CSV出力
          </button>
          <Link to="/admin" className="button-secondary">管理者ダッシュボードへ戻る</Link>
        </div>
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
        <div>
          <label htmlFor="reservation-date-filter">予約日で絞り込み</label>
          <select id="reservation-date-filter" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
            {DATE_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {DATE_FILTER_LABEL[option]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="reservation-sort-option">並び替え</label>
          <select id="reservation-sort-option" value={sortOption} onChange={(event) => setSortOption(event.target.value as SortOption)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SORT_LABEL[option]}
              </option>
            ))}
          </select>
        </div>
      </section>
      {dateFilter === 'custom' ? (
        <section className="reservation-filter-grid" aria-label="予約日の任意期間指定">
          <div>
            <label htmlFor="reservation-custom-start-date">開始日</label>
            <input
              id="reservation-custom-start-date"
              type="date"
              value={customStartDate}
              onChange={(event) => setCustomStartDate(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="reservation-custom-end-date">終了日</label>
            <input
              id="reservation-custom-end-date"
              type="date"
              value={customEndDate}
              onChange={(event) => setCustomEndDate(event.target.value)}
            />
          </div>
        </section>
      ) : null}

      {isLoading ? <p className="result-count">予約状況を読み込み中...</p> : null}
      {!isLoading && errorMessage ? <p className="result-count">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && statusErrorMessage ? (
        <p className="result-count reservation-update-error">{statusErrorMessage}</p>
      ) : null}
      {!isLoading && !errorMessage && memoErrorMessage ? <p className="result-count reservation-update-error">{memoErrorMessage}</p> : null}
      {!isLoading && !errorMessage ? <p className="result-count">表示件数: {filteredReservations.length}件</p> : null}
      {!isLoading && !errorMessage && selectedReservationIds.length > 0 ? (
        <section className="reservation-bulk-action-bar" aria-label="予約の一括操作">
          <p>{selectedReservationIds.length}件選択中</p>
          <select
            aria-label="一括変更ステータス"
            value={bulkStatus}
            disabled={isBulkUpdating}
            onChange={(event) => setBulkStatus(event.target.value as ReservationStatus)}
          >
            {UPDATE_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <button type="button" className="button-primary" disabled={isBulkUpdating} onClick={() => void handleBulkStatusUpdate()}>
            {isBulkUpdating ? '一括変更中...' : '一括変更'}
          </button>
        </section>
      ) : null}

      {!isLoading && !errorMessage && filteredReservations.length === 0 ? (
        <p className="empty-message">条件に一致する予約はありません。</p>
      ) : null}

      {!isLoading && !errorMessage && filteredReservations.length > 0 ? (
        <div className="reservation-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="表示中の予約をすべて選択"
                    checked={allVisibleSelected}
                    disabled={isBulkUpdating}
                    onChange={toggleSelectAllVisibleReservations}
                  />
                </th>
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
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`予約ID ${reservation.id} を選択`}
                        checked={selectedReservationIds.includes(reservation.id)}
                        disabled={isBulkUpdating}
                        onChange={() => toggleReservationSelection(reservation.id)}
                      />
                    </td>
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
                          disabled={isUpdating || isBulkUpdating}
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
                      <div className="reservation-row-actions">
                        <Link to={`/admin/reservations/${reservation.id}`} className="button-secondary">詳細</Link>
                        {reservation.status === 'canceled' ? (
                          <span className="reservation-action-muted">キャンセル済み</span>
                        ) : (
                          <button
                            type="button"
                            className="button-danger reservation-cancel-button"
                            disabled={isUpdating || isBulkUpdating}
                            onClick={() => {
                              void handleCancelReservation(reservation);
                            }}
                          >
                            キャンセル
                          </button>
                        )}
                      </div>
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
