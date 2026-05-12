import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShops } from '../context/ShopsContext';
import { clearAdminOperationLogs, getAdminOperationLogs } from '../services/adminOperationLogService';
import { fetchReservations } from '../services/reservationService';

type DashboardAction = {
  label: string;
  to: string;
  className?: 'button-primary' | 'button-secondary';
};

type DashboardCategory = {
  title: string;
  description: string;
  actions: DashboardAction[];
};

type ReservationDashboardStats = {
  pending: number;
  changeRequests: number;
  cancelRequests: number;
  changed: number;
  canceled: number;
  visited: number;
};

const EMPTY_RESERVATION_STATS: ReservationDashboardStats = {
  pending: 0,
  changeRequests: 0,
  cancelRequests: 0,
  changed: 0,
  canceled: 0,
  visited: 0,
};

const DASHBOARD_CATEGORIES: DashboardCategory[] = [
  {
    title: '店舗管理',
    description: '店舗情報の追加・確認・品質チェックを行います。',
    actions: [
      { label: '店舗追加', to: '/shops/new', className: 'button-primary' },
      { label: '店舗一覧', to: '/shops', className: 'button-secondary' },
      { label: 'データ品質チェック', to: '/admin#data-quality-check', className: 'button-secondary' },
    ],
  },
  {
    title: 'CSV管理',
    description: 'CSV入出力・テンプレート取得・バックアップ確認を行います。',
    actions: [
      { label: 'CSVインポート', to: '/shops#csv-import', className: 'button-secondary' },
      { label: 'CSVエクスポート', to: '/shops#csv-export', className: 'button-secondary' },
      { label: 'CSVテンプレートダウンロード', to: '/shops#csv-template', className: 'button-secondary' },
      { label: 'バックアップ状況', to: '/shops#backup-status', className: 'button-secondary' },
    ],
  },
  {
    title: '運用管理',
    description: '操作履歴やSupabase接続状態の確認を行います。',
    actions: [
      { label: '予約管理', to: '/admin/reservations', className: 'button-primary' },
      { label: '公開前チェック', to: '/admin/checklist', className: 'button-secondary' },
      { label: '操作履歴', to: '/admin#operation-history', className: 'button-secondary' },
      { label: 'Supabase設定確認', to: '/settings/supabase', className: 'button-secondary' },
      { label: 'Supabase店舗確認', to: '/settings/supabase-shops', className: 'button-secondary' },
    ],
  },
];

export function AdminPage() {
  const { isLoading, isLoggedIn, isAdmin, session } = useAuth();
  const { shops } = useShops();
  const [historyVersion, setHistoryVersion] = useState(0);
  const operationLogs = useMemo(() => getAdminOperationLogs(), [historyVersion]);
  const [reservationStats, setReservationStats] = useState<ReservationDashboardStats>(EMPTY_RESERVATION_STATS);
  const [isReservationsLoading, setIsReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState('');

  useEffect(() => {
    const loadReservationStatus = async () => {
      setIsReservationsLoading(true);
      setReservationsError('');
      try {
        const data = await fetchReservations();
        setReservationStats({
          pending: data.filter((reservation) => reservation.status === 'pending').length,
          changeRequests: data.filter((reservation) => Boolean(reservation.changeRequestedAt) && reservation.status !== 'canceled' && reservation.status !== 'visited').length,
          cancelRequests: data.filter((reservation) => Boolean(reservation.cancelRequestedAt) && reservation.status !== 'canceled').length,
          changed: data.filter((reservation) => Boolean(reservation.changeAppliedAt)).length,
          canceled: data.filter((reservation) => reservation.status === 'canceled').length,
          visited: data.filter((reservation) => reservation.status === 'visited').length,
        });
      } catch {
        setReservationsError('予約状況を取得できませんでした。Supabase設定を確認してください。');
      } finally {
        setIsReservationsLoading(false);
      }
    };

    void loadReservationStatus();
  }, []);

  const taskCount = reservationStats.pending + reservationStats.changeRequests + reservationStats.cancelRequests;

  const qualityRows = [...shops]
    .map((shop) => {
      const checks = [
        { label: '住所', ok: shop.address.trim().length > 0 },
        { label: '緯度・経度', ok: shop.latitude != null && shop.longitude != null },
        {
          label: '開店時間・閉店時間',
          ok: Boolean(shop.openingTime?.trim()) && Boolean(shop.closingTime?.trim()),
        },
        { label: '定休日', ok: Array.isArray(shop.closedDays) && shop.closedDays.length > 0 },
        { label: 'おすすめポイント', ok: shop.recommendation.trim().length > 0 },
        { label: '店舗画像', ok: Boolean(shop.imageUrl?.trim()) },
      ];

      const missingCount = checks.filter((item) => !item.ok).length;
      return {
        shop,
        checks,
        missingCount,
      };
    })
    .sort((a, b) => b.missingCount - a.missingCount || a.shop.name.localeCompare(b.shop.name, 'ja'));

  const sufficientShopCount = qualityRows.filter((row) => row.missingCount === 0).length;
  const insufficientShopCount = qualityRows.length - sufficientShopCount;

  const handleClearHistory = () => {
    const confirmed = window.confirm('操作履歴をすべて削除します。よろしいですか？');
    if (!confirmed) {
      return;
    }

    clearAdminOperationLogs();
    setHistoryVersion((prev) => prev + 1);
  };

  if (isLoading) {
    return <p>認証情報を確認中です...</p>;
  }

  if (!isLoggedIn || !isAdmin) {
    return (
      <section className="card detail-wrapper">
        <h1>管理者ダッシュボード</h1>
        <section className="checklist-item-attention">
          <strong>管理画面にアクセスできません。</strong>
          <p>管理者ログインが必要です。ログイン後に、上部メニューの「管理画面」から再度開いてください。</p>
        </section>
        <div className="shop-form-actions">
          <Link to="/login" className="button-primary">ログイン画面を開く</Link>
          <Link to="/" className="button-secondary">トップへ戻る</Link>
        </div>
        <section className="admin-reservation-guide-panel" aria-label="管理画面に入れない場合の確認事項">
          <strong>確認すること</strong>
          <ol>
            <li>ログイン済みか確認してください。</li>
            <li>ログイン後、名前の横に「管理者」と表示されているか確認してください。</li>
            <li>管理者表示がない場合は、管理者権限の設定が必要です。</li>
          </ol>
        </section>
      </section>
    );
  }

  return (
    <section className="card detail-wrapper">
      <h1>管理者ダッシュボード</h1>

      <dl className="detail-list">
        <div>
          <dt>ログインユーザー</dt>
          <dd>{session?.user.email ?? 'メールアドレス未取得'}</dd>
        </div>
        <div>
          <dt>登録店舗数</dt>
          <dd>{shops.length}件</dd>
        </div>
      </dl>

      <section aria-label="本日対応が必要な予約" className="admin-reservation-notice">
        <div className="page-header">
          <div>
            <h2>本日対応が必要</h2>
            <p className="form-hint">未処理の予約・変更依頼・キャンセル依頼を確認します。</p>
          </div>
          <Link to="/admin/reservations" className="button-primary admin-reservation-cta">予約管理を開く</Link>
        </div>

        {isReservationsLoading ? <p>予約状況を読み込み中...</p> : null}
        {!isReservationsLoading && reservationsError ? <p className="status-error">{reservationsError}</p> : null}
        {!isReservationsLoading && !reservationsError ? (
          <>
            <section className="reservation-summary-grid" aria-label="対応が必要な件数">
              <article className="reservation-summary-card reservation-summary-alert">
                <h3>未確認予約</h3>
                <p>{reservationStats.pending}件</p>
              </article>
              <article className="reservation-summary-card reservation-summary-alert">
                <h3>予約変更依頼</h3>
                <p>{reservationStats.changeRequests}件</p>
              </article>
              <article className="reservation-summary-card reservation-summary-alert">
                <h3>キャンセル依頼</h3>
                <p>{reservationStats.cancelRequests}件</p>
              </article>
            </section>

            {taskCount > 0 ? (
              <div className="admin-reservation-alert-card">
                <p className="admin-reservation-alert">対応が必要な予約が {taskCount} 件あります。予約管理を開いて確認してください。</p>
                <Link to="/admin/reservations" className="button-primary admin-reservation-cta">予約管理を開く</Link>
              </div>
            ) : (
              <div className="checklist-item-ok">
                <strong>現在、緊急対応が必要な予約はありません。</strong>
              </div>
            )}

            <section className="admin-date-shortcut-panel" aria-label="予約管理ショートカット">
              <strong>予約をすばやく確認</strong>
              <div className="admin-date-shortcut-actions">
                <Link to="/admin/reservations?date=today" className="button-primary">今日の予約</Link>
                <Link to="/admin/reservations?date=tomorrow" className="button-primary">明日の予約</Link>
                <Link to="/admin/reservations?date=thisWeek" className="button-secondary">今週の予約</Link>
                <Link to="/admin/reservations" className="button-secondary">すべての予約</Link>
              </div>
            </section>
          </>
        ) : null}
      </section>

      <section aria-label="処理済み予約" className="admin-reservation-notice">
        <h2>処理済み</h2>
        <section className="reservation-summary-grid" aria-label="処理済み件数">
          <article className="reservation-summary-card">
            <h3>変更処理済み</h3>
            <p>{reservationStats.changed}件</p>
          </article>
          <article className="reservation-summary-card reservation-summary-cancelled">
            <h3>キャンセル済み</h3>
            <p>{reservationStats.canceled}件</p>
          </article>
          <article className="reservation-summary-card">
            <h3>来店済み</h3>
            <p>{reservationStats.visited}件</p>
          </article>
        </section>
      </section>

      <section className="admin-category-grid" aria-label="管理カテゴリ">
        {DASHBOARD_CATEGORIES.map((category) => (
          <article key={category.title} className="admin-category-card">
            <h2>{category.title}</h2>
            <p>{category.description}</p>
            <div className="shop-form-actions">
              {category.actions.map((action) => (
                <Link key={action.label} to={action.to} className={action.className ?? 'button-secondary'}>
                  {action.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section id="operation-history" className="data-quality-check" aria-label="操作履歴">
        <h2>操作履歴</h2>
        <p>最新20件を表示しています。</p>
        <button type="button" className="button-secondary" onClick={handleClearHistory}>
          履歴をクリア
        </button>
        {operationLogs.length === 0 ? (
          <p>履歴はありません。</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>操作日時</th><th>操作種別</th><th>店舗名/件数</th><th>結果</th><th>補足</th></tr>
              </thead>
              <tbody>
                {operationLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.operatedAt).toLocaleString('ja-JP')}</td>
                    <td>{log.operationType}</td>
                    <td>{log.target}</td>
                    <td>{log.result}</td>
                    <td>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="data-quality-check" className="data-quality-check" aria-label="データ品質チェック">
        <h2>データ品質チェック</h2>
        <p>
          情報が十分な店舗: <strong>{sufficientShopCount}件</strong> / 不足がある店舗:{' '}
          <strong>{insufficientShopCount}件</strong>
        </p>

        <div className="data-quality-list">
          {qualityRows.map(({ shop, checks, missingCount }) => (
            <article className="data-quality-card" key={shop.id}>
              <div className="data-quality-card-header">
                <h3>{shop.name}</h3>
                <span className={missingCount === 0 ? 'status-ok' : 'status-error'}>
                  {missingCount === 0 ? '✅ すべて設定済み' : `⚠️ 未設定 ${missingCount}項目`}
                </span>
              </div>
              <ul>
                {checks.map((check) => (
                  <li key={`${shop.id}-${check.label}`}>
                    <span>{check.label}</span>
                    <strong>{check.ok ? 'OK ✅' : '未設定 ⚠️'}</strong>
                  </li>
                ))}
              </ul>
              <Link to={`/shops/${shop.id}/edit`} className="button-secondary">
                編集する
              </Link>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
