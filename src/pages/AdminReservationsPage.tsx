import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_RESERVATIONS, type Reservation, type ReservationStatus } from '../data/reservations';

const STATUS_OPTIONS: Array<ReservationStatus | 'すべて'> = ['すべて', '未確認', '確認済み', 'キャンセル', '来店済み'];

const STATUS_CLASS_NAME: Record<ReservationStatus, string> = {
  未確認: 'reservation-status reservation-status-pending',
  確認済み: 'reservation-status reservation-status-confirmed',
  キャンセル: 'reservation-status reservation-status-cancelled',
  来店済み: 'reservation-status reservation-status-completed',
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export function AdminReservationsPage() {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'すべて'>('すべて');

  const reservations = MOCK_RESERVATIONS;

  const filteredReservations = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        reservation.shopName.toLowerCase().includes(normalizedKeyword) ||
        reservation.customerName.toLowerCase().includes(normalizedKeyword);

      const matchesStatus = statusFilter === 'すべて' || reservation.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [keyword, reservations, statusFilter]);

  const summary = useMemo(() => {
    const today = new Date();
    const todayDate = today.toLocaleDateString('sv-SE');

    const todayCount = reservations.filter((reservation) => {
      const reservationDate = new Date(reservation.reservedAt).toLocaleDateString('sv-SE');
      return reservationDate === todayDate;
    }).length;

    return {
      total: reservations.length,
      pending: reservations.filter((reservation) => reservation.status === '未確認').length,
      today: todayCount,
      cancelled: reservations.filter((reservation) => reservation.status === 'キャンセル').length,
    };
  }, [reservations]);

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
          <p>{summary.cancelled}件</p>
        </article>
      </section>

      <section className="reservation-filter-grid" aria-label="予約の検索と絞り込み">
        <div>
          <label htmlFor="reservation-search">店舗名 / 予約者名で検索</label>
          <input
            id="reservation-search"
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="例: 新宿 / 山田"
          />
        </div>
        <div>
          <label htmlFor="reservation-status-filter">ステータスで絞り込み</label>
          <select
            id="reservation-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ReservationStatus | 'すべて')}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </section>

      <p className="result-count">表示件数: {filteredReservations.length}件</p>

      <div className="reservation-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>予約ID</th><th>店舗名</th><th>予約者名</th><th>電話番号</th><th>メールアドレス</th>
              <th>予約日時</th><th>人数</th><th>ステータス</th><th>申込日時</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.map((reservation: Reservation) => (
              <tr key={reservation.id}>
                <td>{reservation.id}</td>
                <td>{reservation.shopName}</td>
                <td>{reservation.customerName}</td>
                <td>{reservation.phoneNumber}</td>
                <td>{reservation.email}</td>
                <td>{formatDateTime(reservation.reservedAt)}</td>
                <td>{reservation.partySize}名</td>
                <td>
                  <span className={STATUS_CLASS_NAME[reservation.status]}>{reservation.status}</span>
                </td>
                <td>{formatDateTime(reservation.appliedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
