import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useShops } from '../context/ShopsContext';
import { useAuth } from '../context/AuthContext';
import { getLocalStorageItem } from '../lib/localStorage';
import { googleMapsEmbedApiKey } from '../services/geocodingService';
import { getAdminOperationLogs } from '../services/adminOperationLogService';

const LAST_CSV_EXPORT_AT_KEY = 'ramenmap:last-csv-export-at';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type ChecklistStatus = 'OK' | '要確認' | '未対応';

type ChecklistItem = {
  label: string;
  status: ChecklistStatus;
  description: string;
  detail?: string;
  to?: string;
};

type ChecklistCategory = {
  title: string;
  items: ChecklistItem[];
};

const statusClassName: Record<ChecklistStatus, string> = {
  OK: 'status-ok',
  要確認: 'status-needs-check',
  未対応: 'status-pending',
};

export function AdminChecklistPage() {
  const { shops } = useShops();
  const { isAdmin, isLoggedIn } = useAuth();

  const shopsWithImageCount = shops.filter((shop) => Boolean(shop.imageUrl?.trim())).length;
  const shopsWithCoordinatesCount = shops.filter((shop) => shop.latitude != null && shop.longitude != null).length;
  const shopsWithBusinessHoursCount = shops.filter(
    (shop) => Boolean(shop.openingTime?.trim()) && Boolean(shop.closingTime?.trim()),
  ).length;
  const shopsWithContactCount = shops.filter((shop) => Boolean(shop.recommendation?.trim())).length;
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
      title: '店舗情報',
      items: [
        { label: '公開対象の店舗データが登録されている', status: shops.length > 0 ? 'OK' : '未対応', description: '最低1件以上の公開店舗を登録してください。', detail: `${shops.length}件` },
        { label: '営業時間が入力されている', status: shopsWithBusinessHoursCount === shops.length && shops.length > 0 ? 'OK' : '要確認', description: 'ユーザーが訪問計画を立てられるよう、全店舗の営業時間を確認します。', detail: `${shopsWithBusinessHoursCount}/${shops.length}件` },
        { label: '住所と緯度経度が設定されている', status: shopsWithCoordinatesCount === shops.length && shops.length > 0 ? 'OK' : '要確認', description: '地図表示・ルート案内のために位置情報の欠損をなくします。', detail: `${shopsWithCoordinatesCount}/${shops.length}件` },
      ],
    },
    {
      title: '画像・表示',
      items: [
        { label: '店舗画像が設定されている', status: shopsWithImageCount === shops.length && shops.length > 0 ? 'OK' : '要確認', description: '未設定画像のまま公開されないよう、店舗画像の有無を確認します。', detail: `${shopsWithImageCount}/${shops.length}件` },
        { label: 'トップ・一覧・詳細ページが表示できる', status: 'OK', description: '主要導線で表示崩れやリンク切れがないか最終確認します。', to: '/shops' },
        { label: '地図表示に必要な設定がある', status: hasMapsApiKey && hasMapShops ? 'OK' : hasMapShops ? '要確認' : '未対応', description: 'Google Maps APIキーと位置情報付き店舗が揃っているか確認します。', detail: hasMapsApiKey ? 'APIキー設定済み' : 'APIキー未設定' },
      ],
    },
    {
      title: '予約・問い合わせ',
      items: [
        { label: '予約・問い合わせ先情報がある', status: shopsWithContactCount === shops.length && shops.length > 0 ? 'OK' : '要確認', description: '店舗詳細の「おすすめ」欄に予約方法・問い合わせ先の案内を記載してください。', detail: `${shopsWithContactCount}/${shops.length}件` },
        { label: '利用規約ページが表示できる', status: 'OK', description: '公開時に必要な利用ルールが閲覧できることを確認します。', to: '/terms' },
        { label: 'プライバシーポリシーページが表示できる', status: 'OK', description: '問い合わせ時に個人情報の取り扱いを明示できるか確認します。', to: '/privacy' },
      ],
    },
    {
      title: '管理画面',
      items: [
        { label: '管理者としてログインしている', status: isLoggedIn && isAdmin ? 'OK' : '未対応', description: '公開前作業は管理者権限でのみ実施できるため、ログイン状態を確認します。' },
        { label: '管理機能への導線がある', status: 'OK', description: 'CSVインポート・データ品質チェック・操作履歴にアクセスできるか確認します。', to: '/admin' },
        { label: '操作履歴で最新の更新内容を確認できる', status: latestExportOperation ? 'OK' : '要確認', description: '更新漏れ防止のため、直近の管理操作が履歴に残っているか確認します。', detail: latestExportOperation ? new Date(latestExportOperation.operatedAt).toLocaleString('ja-JP') : '履歴なし' },
      ],
    },
    {
      title: 'データ・エクスポート',
      items: [
        { label: 'CSVエクスポートの実行記録がある', status: hasLastCsvExport ? 'OK' : '未対応', description: '障害時に復元できるよう、公開前バックアップを必ず取得します。', detail: lastCsvExportLabel, to: '/shops#csv-export' },
        { label: '最終エクスポートが30日以内である', status: hasLastCsvExport ? (isExportStale ? '要確認' : 'OK') : '未対応', description: '古いバックアップのまま公開しないよう、鮮度を確認します。' },
        { label: 'データ不足の店舗が0件である', status: shopsWithMissingDataCount === 0 ? 'OK' : '要確認', description: '画像・位置情報・営業時間の未入力店舗を解消してから公開します。', detail: `${shopsWithMissingDataCount}件` },
      ],
    },
    {
      title: '公開前の最終確認',
      items: [
        { label: 'robots.txt が存在する', status: 'OK', description: '検索エンジン向けのクロール制御設定を確認します。', to: '/robots.txt' },
        { label: 'sitemap.xml が存在する', status: 'OK', description: '公開URLの巡回を促進するサイトマップを確認します。', to: '/sitemap.xml' },
        { label: '未対応・要確認項目を解消した', status: '要確認', description: '本番公開前に本ページの警告項目を0件にしてから進めてください。' },
      ],
    },
  ];

  const allItems = categories.flatMap((category) => category.items);
  const completedCount = allItems.filter((item) => item.status === 'OK').length;
  const progressRate = allItems.length === 0 ? 0 : Math.round((completedCount / allItems.length) * 100);

  return (
    <section className="card detail-wrapper">
      <h1>公開前チェック</h1>
      <p>本番公開前に、機能・データ・運用状態をカテゴリごとに確認できます。</p>

      <div className="checklist-progress" role="status" aria-live="polite">
        <strong>公開準備 {progressRate}% 完了</strong>
        <small>
          OK: {completedCount}件 / 全{allItems.length}件
        </small>
      </div>

      <div className="shop-form-actions">
        <Link to="/admin" className="button-secondary">
          管理画面に戻る
        </Link>
      </div>

      <div className="data-quality-list">
        {categories.map((category) => (
          <article key={category.title} className="data-quality-card">
            <h2>{category.title}</h2>
            <ul className="checklist-items">
              {category.items.map((item) => {
                const isAttention = item.status !== 'OK';
                return (
                  <li key={`${category.title}-${item.label}`} className={isAttention ? 'checklist-item-attention' : ''}>
                    <div>
                      <span>{item.label}</span>
                      <small className="checklist-description">{item.description}</small>
                      {item.detail ? <small className="checklist-detail">{item.detail}</small> : null}
                      {item.to ? (
                        <Link to={item.to} className="button-secondary" style={{ marginTop: '0.4rem', display: 'inline-flex' }}>
                          確認する
                        </Link>
                      ) : null}
                    </div>
                    <strong className={statusClassName[item.status]}>{item.status}</strong>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
