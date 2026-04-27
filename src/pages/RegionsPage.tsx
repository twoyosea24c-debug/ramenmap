import { Link } from 'react-router-dom';
import { ramenShops } from '../data/shops';

const grouped = ramenShops.reduce<Record<string, typeof ramenShops>>((acc, shop) => {
  if (!acc[shop.region]) {
    acc[shop.region] = [];
  }
  acc[shop.region].push(shop);
  return acc;
}, {});

export function RegionsPage() {
  return (
    <section>
      <h1>地域別一覧</h1>
      <div className="shop-list">
        {Object.entries(grouped).map(([region, shops]) => (
          <article className="card" key={region}>
            <h2>{region}</h2>
            <ul className="region-list">
              {shops.map((shop) => (
                <li key={shop.id}>
                  <Link className="text-link" to={`/shops/${shop.id}`}>
                    {shop.name}（{shop.ramenType} / ⭐ {shop.rating}）
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
