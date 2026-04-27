import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { ramenShops } from '../data/shops';

export function FavoritesPage() {
  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites();

  const favoriteShops = ramenShops.filter((shop) => favoriteIds.includes(shop.id));

  return (
    <section>
      <h1>お気に入りページ</h1>

      {favoriteShops.length === 0 ? (
        <p className="card empty-message">お気に入り登録された店舗はありません</p>
      ) : (
        <div className="shop-list">
          {favoriteShops.map((shop) => {
            const favorite = isFavorite(shop.id);

            return (
              <article className="card shop-card" key={shop.id}>
                <div className="shop-card-header">
                  <h2>{shop.name}</h2>
                  <span className="rating-badge">⭐ {shop.rating.toFixed(1)}</span>
                </div>

                <p>
                  {shop.region} / {shop.ramenType}
                </p>
                <p>{shop.recommendation}</p>

                <div className="shop-actions">
                  <button
                    type="button"
                    className={favorite ? 'favorite-button is-active' : 'favorite-button'}
                    onClick={() => toggleFavorite(shop.id)}
                    aria-pressed={favorite}
                  >
                    {favorite ? 'お気に入り済み' : 'お気に入りに追加'}
                  </button>
                  <Link to={`/shops/${shop.id}`} className="button-primary detail-button">
                    詳細へ
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
