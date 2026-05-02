import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useShops } from '../context/ShopsContext';
import { useAuth } from '../context/AuthContext';
import { getLocalStorageItem } from '../lib/localStorage';
import { googleMapsEmbedApiKey } from '../services/geocodingService';
import { getAdminOperationLogs } from '../services/adminOperationLogService';

const LAST_CSV_EXPORT_AT_KEY = 'ramenmap:last-csv-export-at';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type ChecklistStatus = 'OK' | '要確認' | '未設定';

type ChecklistItem = {
  label: string;
  status: ChecklistStatus;
  detail?: string;
  to?: string;
};

type ChecklistCategory = {
  title: string;
  items: ChecklistItem[];
};

const statusClassName: Record<ChecklistStatus, string> = {
  OK: 'status-ok',
  要確認: 'status-error',
  未設定: 'status-error',
};

export function AdminChecklistPage() {
  const { shops } = useShops();
  const { isAdmin, isLoggedIn } = useAuth();

  const shopsWithImageCount = shops.filter((shop) => Boolean(shop.imageUrl?.trim())).length;
  const shopsWithCoordinatesCount = shops.filter((shop) => shop.latitude != null && shop.longitude != null).length;
  const shopsWithBusinessHoursCount = shops.filter(
    (shop) => Boolean(shop.openingTime?.trim()) && Boolean(shop.closingTime?.trim()),
  ).length;
  const shopsWithMissingDataCount = shops.filter((shop) => {
    const hasImage = Boolean(shop.imageUrl?.trim());
    const hasCoordinates = shop.latitude != null && shop.longitude != null;
    const hasBusinessHours = Boolean(shop.openingTime?.trim()) && Boolean(shop.closingTime?.trim());
    return !(hasImage && hasCoordinates && hasBusinessHours);
  }).length;

  const lastCsvExportAtRaw = getLocalStorageItem(LAST_CSV_EXPORT_AT_KEY);
  const lastCsvExportAtMs = lastCsvExportAtRaw ? Number(lastCsvExportAtRaw) : Number.NaN;
  const hasLastCsvExport = Number.isFinite(lastCsvExportAtMs) && lastCsvExportAtMs > 0;
  const isExportStale = hasLastCsvExport ? Date.now() - lastCsvExportAtMs >= THIRTY_DAYS_MS : true;
  const lastCsvExportLabel = hasLastCsvExport ? new Date(lastCsvExportAtMs).toLocaleString('ja-JP') : '記録なし';

  const hasMapsApiKey = Boolean(googleMapsEmbedApiKey);
  const hasMapShops = shopsWithCoordinatesCount > 0;

  const latestExportOperation = useMemo(
    () => getAdminOperationLogs().find((log) => log.operationType === 'CSVエクスポート'),
    [],
  );

  const categories: ChecklistCategory[] = [
    {
      title: '1. 基本公開設定',
      items: [
        { label: 'トップページが表示できる', status: 'OK', to: '/' },
        { label: '店舗一覧が表示できる', status: 'OK', to: '/shops' },
        { label: 'プライバシーポリシーが表示できる', status: 'OK', to: '/privacy' },
        { label: '利用規約が表示できる', status: 'OK', to: '/terms' },
        { label: 'robots.txt が存在する', status: 'OK', to: '/robots.txt' },
        { label: 'sitemap.xml が存在する', status: 'OK', to: '/sitemap.xml' },
      ],
    },
    {
      title: '2. 店舗データ',
      items: [
        { label: '店舗数', status: shops.length > 0 ? 'OK' : '要確認', detail: `${shops.length}件` },
        { label: '画像あり店舗数', status: shopsWithImageCount > 0 ? 'OK' : '要確認', detail: `${shopsWithImageCount}件` },
        {
          label: '緯度経度あり店舗数',
          status: shopsWithCoordinatesCount > 0 ? 'OK' : '要確認',
          detail: `${shopsWithCoordinatesCount}件`,
        },
        {
          label: '営業時間あり店舗数',
          status: shopsWithBusinessHoursCount > 0 ? 'OK' : '要確認',
          detail: `${shopsWithBusinessHoursCount}件`,
        },
        {
          label: 'データ不足店舗数',
          status: shopsWithMissingDataCount === 0 ? 'OK' : '要確認',
          detail: `${shopsWithMissingDataCount}件`,
        },
      ],
    },
    {
      title: '3. 管理機能',
      items: [
        { label: '管理者ログイン中である', status: isLoggedIn && isAdmin ? 'OK' : '未設定' },
        { label: 'CSVインポート機能への導線', status: 'OK', to: '/shops#csv-import' },
        { label: 'CSVエクスポート機能への導線', status: 'OK', to: '/shops#csv-export' },
        { label: 'データ品質チェックへの導線', status: 'OK', to: '/admin#data-quality-check' },
        { label: '操作履歴への導線', status: 'OK', to: '/admin#operation-history' },
      ],
    },
    {
      title: '4. 地図・位置情報',
      items: [
        {
          label: 'Google Maps APIキー設定済みか',
          status: hasMapsApiKey ? 'OK' : '未設定',
          detail: hasMapsApiKey ? '設定済み' : '未設定',
        },
        {
          label: '緯度経度あり店舗があるか',
          status: hasMapShops ? 'OK' : '要確認',
          detail: `${shopsWithCoordinatesCount}件`,
        },
        { label: '複数店舗マップへ移動できるか', status: hasMapShops ? 'OK' : '要確認', to: '/shops#shops-map' },
      ],
    },
    {
      title: '5. バックアップ',
      items: [
        {
          label: '最終CSVエクスポート日時',
          status: hasLastCsvExport ? (isExportStale ? '要確認' : 'OK') : '未設定',
          detail: lastCsvExportLabel,
        },
        {
          label: '30日以上エクスポートしていない場合は注意表示',
          status: isExportStale ? '要確認' : 'OK',
          detail: isExportStale
            ? '⚠️ 最終エクスポートから30日以上経過しています。'
            : '直近30日以内にエクスポート済みです。',
        },
        {
          label: '操作履歴上の最新CSVエクスポート',
          status: latestExportOperation ? 'OK' : '要確認',
          detail: latestExportOperation ? new Date(latestExportOperation.operatedAt).toLocaleString('ja-JP') : '履歴なし',
        },
      ],
    },
  ];

  return (
    <section className="card detail-wrapper">
      <h1>公開前チェック</h1>
      <p>本番公開前に、機能・データ・運用状態をこの画面で確認できます。</p>
      <div className="shop-form-actions">
        <Link to="/admin" className="button-secondary">
          管理画面に戻る
        </Link>
      </div>

      <div className="data-quality-list">
        {categories.map((category) => (
          <article key={category.title} className="data-quality-card">
            <h2>{category.title}</h2>
            <ul>
              {category.items.map((item) => (
                <li key={`${category.title}-${item.label}`}>
                  <div>
                    <span>{item.label}</span>
                    {item.detail ? <small style={{ display: 'block', opacity: 0.85 }}>{item.detail}</small> : null}
                    {item.to ? (
                      <Link to={item.to} className="button-secondary" style={{ marginTop: '0.4rem', display: 'inline-flex' }}>
                        確認する
                      </Link>
                    ) : null}
                  </div>
                  <strong className={statusClassName[item.status]}>{item.status}</strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
