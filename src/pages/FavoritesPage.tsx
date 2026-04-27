import { Link } from 'react-router-dom';
import { ramenShops } from '../data/shops';

const favoriteIds = ['tonkotsu-ichi', 'menya-sakura', 'tsukemen-ginza'];

const favoriteShops = ramenShops.filter((shop) => favoriteIds.includes(shop.id));

export function FavoritesPage() {
  return (
    <section>
      <h1>お気に入りページ</h1>
      <p>デモ版のため固定のお気に入り店舗を表示しています。</p>

      <div className="shop-list">
        {favoriteShops.map((shop) => (
          <article className="card" key={shop.id}>
            <h2>{shop.name}</h2>
            <p>
              {shop.region} / {shop.ramenType} / ⭐ {shop.rating}
            </p>
            <p>{shop.recommendation}</p>
            <Link to={`/shops/${shop.id}`} className="text-link">
              詳細へ
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
