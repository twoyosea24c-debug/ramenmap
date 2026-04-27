import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useShops } from '../context/ShopsContext';

export function RegionsPage() {
  const { shops } = useShops();

  const grouped = useMemo(
    () =>
      shops.reduce<Record<string, typeof shops>>((acc, shop) => {
        if (!acc[shop.region]) {
          acc[shop.region] = [];
        }
        acc[shop.region].push(shop);
        return acc;
      }, {}),
    [shops],
  );

  return (
    <section>
      <h1>地域別一覧</h1>
      <div className="shop-list">
        {Object.entries(grouped).map(([region, regionShops]) => (
          <article className="card" key={region}>
            <h2>{region}</h2>
            <ul className="region-list">
              {regionShops.map((shop) => (
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
