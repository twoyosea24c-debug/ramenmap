import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShops } from '../context/ShopsContext';

export function AdminPage() {
  const { isLoading, isLoggedIn, isAdmin, session } = useAuth();
  const { shops } = useShops();

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

  if (isLoading) {
    return <p>認証情報を確認中です...</p>;
  }

  if (!isLoggedIn || !isAdmin) {
    return (
      <section className="card detail-wrapper">
        <h1>管理者ダッシュボード</h1>
        <p className="status-error">管理者のみアクセスできます</p>
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

      <div className="shop-form-actions">
        <Link to="/shops/new" className="button-primary">
          店舗追加ページへ
        </Link>
        <Link to="/shops" className="button-secondary">
          店舗一覧ページへ
        </Link>
      </div>

      {isAdmin ? (
        <>
          <div className="shop-form-actions">
            <Link to="/settings/supabase" className="button-secondary">
              Supabase設定確認ページへ
            </Link>
            <Link to="/settings/supabase-shops" className="button-secondary">
              Supabase店舗確認ページへ
            </Link>
          </div>

          <section className="data-quality-check" aria-label="データ品質チェック">
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
        </>
      ) : null}
    </section>
  );
}
