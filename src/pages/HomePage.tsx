import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShops } from '../context/ShopsContext';
import { getShopBusinessStatus } from '../utils/businessHours';

export function HomePage() {
  const { isAdmin } = useAuth();
  const { shops, isLoading } = useShops();

  const featuredShops = [...shops].sort((a, b) => b.rating - a.rating).slice(0, 3);

  return (
    <section className="landing-page">
      <div className="hero landing-hero">
        <p className="landing-brand">ラーメンマップ</p>
        <h1>近くの一杯を、地図から探す</h1>
        <p className="landing-description">
          現在地・地図・営業時間から、行きたいラーメン店を見つけられる地域ラーメン検索アプリ
        </p>
        <div className="hero-actions">
          <Link to="/shops" className="button-primary">
            店舗を探す
          </Link>
          <Link to="/shops#shops-map" className="button-secondary">
            地図で見る
          </Link>
          {isAdmin ? (
            <Link to="/admin" className="button-secondary">
              管理画面へ
            </Link>
          ) : null}
        </div>
      </div>

      <section className="card feature-section" aria-label="機能紹介">
        <h2>機能紹介</h2>
        <div className="feature-grid">
          <article className="feature-item">
            <h3>地図で探す</h3>
            <p>店舗位置を地図で直感的に確認できます。</p>
          </article>
          <article className="feature-item">
            <h3>現在地から近い順</h3>
            <p>現在地または基準地点から近い店舗順に並び替え可能です。</p>
          </article>
          <article className="feature-item">
            <h3>営業中のお店を確認</h3>
            <p>営業時間から営業状態をチェックして来店計画を立てられます。</p>
          </article>
          <article className="feature-item">
            <h3>お気に入り保存</h3>
            <p>気になるお店を保存してあとで見返せます。</p>
          </article>
        </div>
      </section>

      <section className="card" aria-label="おすすめ店舗">
        <h2>おすすめ店舗</h2>
        {isLoading ? <p>店舗データを読み込み中です...</p> : null}
        {!isLoading && featuredShops.length === 0 ? <p>おすすめ店舗を表示できるデータがありません。</p> : null}
        <div className="shop-list">
          {featuredShops.map((shop) => {
            const businessStatus = getShopBusinessStatus(shop);
            return (
              <article key={shop.id} className="card shop-card">
                {shop.imageUrl ? (
                  <img src={shop.imageUrl} alt={`${shop.name} の店舗画像`} className="shop-card-image" loading="lazy" />
                ) : (
                  <div className="shop-card-image-placeholder" aria-label="画像なし">
                    画像なし
                  </div>
                )}
                <div className="shop-card-header">
                  <h3>{shop.name}</h3>
                  <span>{businessStatus.label}</span>
                  <span className="rating-badge">⭐ {shop.rating.toFixed(1)}</span>
                </div>
                <dl className="shop-meta">
                  <div>
                    <dt>地域</dt>
                    <dd>{shop.region}</dd>
                  </div>
                  <div>
                    <dt>ラーメンの種類</dt>
                    <dd>{shop.ramenType}</dd>
                  </div>
                  <div>
                    <dt>営業状態</dt>
                    <dd>{businessStatus.label}</dd>
                  </div>
                </dl>
                <div className="shop-actions">
                  <Link to={`/shops/${shop.id}`} className="button-secondary detail-button">
                    詳細を見る
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
