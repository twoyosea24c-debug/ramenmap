import { Link, useParams } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { ramenShops } from '../data/shops';

export function ShopDetailPage() {
  const { id } = useParams();
  const shop = ramenShops.find((item) => item.id === id);
  const { isFavorite, toggleFavorite } = useFavorites();

  if (!shop) {
    return (
      <section className="card detail-wrapper">
        <h1>店舗が見つかりません</h1>
        <Link to="/shops" className="button-secondary back-button">
          一覧に戻る
        </Link>
      </section>
    );
  }

  const favorite = isFavorite(shop.id);

  return (
    <section className="detail-wrapper">
      <h1>{shop.name}</h1>

      <article className="card detail-card">
        <dl className="detail-list">
          <div>
            <dt>店舗名</dt>
            <dd>{shop.name}</dd>
          </div>
          <div>
            <dt>地域</dt>
            <dd>{shop.region}</dd>
          </div>
          <div>
            <dt>住所</dt>
            <dd>{shop.address}</dd>
          </div>
          <div>
            <dt>ラーメンの種類</dt>
            <dd>{shop.ramenType}</dd>
          </div>
          <div>
            <dt>評価</dt>
            <dd>⭐ {shop.rating.toFixed(1)}</dd>
          </div>
          <div>
            <dt>営業時間</dt>
            <dd>{shop.businessHours}</dd>
          </div>
          <div>
            <dt>おすすめポイント</dt>
            <dd>{shop.recommendation}</dd>
          </div>
        </dl>
      </article>

      <div className="detail-actions">
        <button
          type="button"
          className={favorite ? 'favorite-button is-active' : 'favorite-button'}
          onClick={() => toggleFavorite(shop.id)}
          aria-pressed={favorite}
        >
          {favorite ? 'お気に入り済み' : 'お気に入りに追加'}
        </button>
        <Link to="/shops" className="button-secondary back-button">
          一覧に戻る
        </Link>
      </div>
    </section>
  );
}
