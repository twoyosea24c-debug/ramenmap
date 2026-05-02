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
        {
          label: '公開対象の店舗データが登録されている',
          status: shops.length > 0 ? 'OK' : '未対応',
          description: '最低1件以上の公開店舗を登録し、一覧と詳細の導線が成立している状態にします。',
          detail: `${shops.length}件`,
        },
        {
          label: '営業時間が入力されている',
          status: shopsWithBusinessHoursCount === shops.length && shops.length > 0 ? 'OK' : '要確認',
          description: 'ユーザーが訪問計画を立てられるよう、全店舗の営業時間と定休日情報の抜け漏れを確認します。',
          detail: `${shopsWithBusinessHoursCount}/${shops.length}件`,
        },
        {
          label: '住所と緯度経度が設定されている',
          status: shopsWithCoordinatesCount === shops.length && shops.length > 0 ? 'OK' : '要確認',
          description: '地図表示・ルート案内に必要な位置情報を確認し、住所の誤記も合わせて見直します。',
          detail: `${shopsWithCoordinatesCount}/${shops.length}件`,
        },
      ],
    },
    {
      title: '画像・表示',
      items: [
        {
          label: '店舗画像が設定されている',
          status: shopsWithImageCount === shops.length && shops.length > 0 ? 'OK' : '要確認',
          description: '未設定画像のまま公開されないよう、各店舗の画像有無と表示品質を確認します。',
          detail: `${shopsWithImageCount}/${shops.length}件`,
        },
        {
          label: 'トップ・一覧・詳細ページが表示できる',
          status: 'OK',
          description: '主要導線で表示崩れ・リンク切れ・表示遅延がないかを公開前の端末で確認します。',
          to: '/shops',
        },
        {
          label: '地図表示に必要な設定がある',
          status: hasMapsApiKey && hasMapShops ? 'OK' : hasMapShops ? '要確認' : '未対応',
          description: 'Google Maps APIキー設定と位置情報付き店舗の組み合わせが揃っているかを確認します。',
          detail: hasMapsApiKey ? 'APIキー設定済み' : 'APIキー未設定',
        },
      ],
    },
    {
      title: '予約・問い合わせ',
      items: [
        {
          label: '予約・問い合わせ先情報がある',
          status: shopsWithContactCount === shops.length && shops.length > 0 ? 'OK' : '要確認',
          description: '店舗詳細の案内文に、予約方法・問い合わせ先・注意事項が分かる記述を追加します。',
          detail: `${shopsWithContactCount}/${shops.length}件`,
        },
        {
          label: '利用規約ページが表示できる',
          status: 'OK',
          description: '公開時に必要な利用ルールが閲覧できることを確認し、文言の最新版を反映します。',
          to: '/terms',
        },
        {
          label: 'プライバシーポリシーページが表示できる',
          status: 'OK',
          description: '問い合わせ時の個人情報取り扱いが明示されているか、表示と内容を確認します。',
          to: '/privacy',
        },
      ],
    },
    {
      title: '管理画面',
      items: [
        {
          label: '管理者としてログインしている',
          status: isLoggedIn && isAdmin ? 'OK' : '未対応',
          description: '公開前作業は管理者権限でのみ実施できるため、ログインユーザーの権限を確認します。',
        },
        {
          label: '管理機能への導線がある',
          status: 'OK',
          description: 'CSVインポート・品質チェック・操作履歴など公開前に使う導線が機能するかを確認します。',
          to: '/admin',
        },
        {
          label: '操作履歴で最新の更新内容を確認できる',
          status: latestExportOperation ? 'OK' : '要確認',
          description: '更新漏れ防止のため、直近の管理操作が履歴に残り、更新日時が確認できるかを見ます。',
          detail: latestExportOperation ? new Date(latestExportOperation.operatedAt).toLocaleString('ja-JP') : '履歴なし',
        },
      ],
    },
    {
      title: 'データ・エクスポート',
      items: [
        {
          label: 'CSVエクスポートの実行記録がある',
          status: hasLastCsvExport ? 'OK' : '未対応',
          description: '障害時に復元できるよう、公開前バックアップを取得し、実行記録を残しておきます。',
          detail: lastCsvExportLabel,
          to: '/shops#csv-export',
        },
        {
          label: '最終エクスポートが30日以内である',
          status: hasLastCsvExport ? (isExportStale ? '要確認' : 'OK') : '未対応',
          description: '古いバックアップのまま公開しないよう、最終取得日時の鮮度を確認します。',
        },
        {
          label: 'データ不足の店舗が0件である',
          status: shopsWithMissingDataCount === 0 ? 'OK' : '要確認',
          description: '画像・位置情報・営業時間の欠損店舗を解消してから公開判断を行います。',
          detail: `${shopsWithMissingDataCount}件`,
        },
      ],
    },
    {
      title: '公開前の最終確認',
      items: [
        {
          label: 'robots.txt が存在する',
          status: 'OK',
          description: '検索エンジン向けのクロール制御設定が公開環境で配信されるかを確認します。',
          to: '/robots.txt',
        },
        {
          label: 'sitemap.xml が存在する',
          status: 'OK',
          description: '公開URLの巡回促進に必要なサイトマップが配信されるかを確認します。',
          to: '/sitemap.xml',
        },
        {
          label: '未対応・要確認項目を解消した',
          status: '要確認',
          description: '本ページの未対応と要確認が0件になるまで対応し、最終承認後に公開します。',
        },
      ],
    },
  ];

  const allItems = categories.flatMap((category) => category.items);
  const completedCount = allItems.filter((item) => item.status === 'OK').length;
  const needsCheckCount = allItems.filter((item) => item.status === '要確認').length;
  const pendingCount = allItems.filter((item) => item.status === '未対応').length;
  const progressRate = allItems.length === 0 ? 0 : Math.round((completedCount / allItems.length) * 100);

  const releaseGuidance =
    pendingCount > 0
      ? 'まだ公開できません'
      : needsCheckCount > 0
        ? '最終確認後に公開できます'
        : '公開準備完了です';

  return (
    <section className="card detail-wrapper">
      <h1>公開前チェック</h1>
      <p>本番公開前に、機能・データ・運用状態をカテゴリごとに確認できます。</p>

      <div className="checklist-progress" role="status" aria-live="polite">
        <strong>公開準備 {progressRate}% 完了</strong>
        <small>未対応 {pendingCount}件 / 要確認 {needsCheckCount}件</small>
        <small>
          OK: {completedCount}件 / 全{allItems.length}件
        </small>
      </div>

      <article className={`checklist-release-guidance ${pendingCount > 0 ? 'is-pending' : needsCheckCount > 0 ? 'is-needs-check' : 'is-ok'}`}>
        <h2>公開可否の目安</h2>
        <p>{releaseGuidance}</p>
      </article>

      <div className="shop-form-actions">
        <Link to="/admin" className="button-secondary">
          管理画面に戻る
        </Link>
      </div>

      <div className="data-quality-list">
        {categories.map((category) => (
          <article key={category.title} className="data-quality-card checklist-category-card">
            <h2>{category.title}</h2>
            <ul className="checklist-items">
              {category.items.map((item) => {
                const isAttention = item.status !== 'OK';
                return (
                  <li key={`${category.title}-${item.label}`} className={isAttention ? 'checklist-item-attention' : 'checklist-item-ok'}>
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
