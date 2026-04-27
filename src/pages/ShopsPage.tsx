import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ramenShops } from '../data/shops';

const allRegions = Array.from(new Set(ramenShops.map((shop) => shop.region)));
const allTypes = Array.from(new Set(ramenShops.map((shop) => shop.ramenType)));

export function ShopsPage() {
  const [region, setRegion] = useState('');
  const [ramenType, setRamenType] = useState('');
  const [rating, setRating] = useState('');

  const filteredShops = useMemo(() => {
    return ramenShops.filter((shop) => {
      const regionMatch = region ? shop.region === region : true;
      const typeMatch = ramenType ? shop.ramenType === ramenType : true;
      const ratingMatch = rating ? shop.rating >= Number(rating) : true;
      return regionMatch && typeMatch && ratingMatch;
    });
  }, [region, ramenType, rating]);

  return (
    <section>
      <h1>店舗一覧</h1>
      <form className="card search-form" aria-label="店舗検索フォーム">
        <div>
          <label htmlFor="region">地域</label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">すべて</option>
            {allRegions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ramenType">ラーメン種類</label>
          <select id="ramenType" value={ramenType} onChange={(e) => setRamenType(e.target.value)}>
            <option value="">すべて</option>
            {allTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rating">評価</label>
          <select id="rating" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">指定なし</option>
            <option value="4.0">4.0以上</option>
            <option value="4.3">4.3以上</option>
            <option value="4.5">4.5以上</option>
          </select>
        </div>
      </form>

      <p className="result-count">{filteredShops.length} 件の店舗が見つかりました。</p>

      <div className="shop-list">
        {filteredShops.map((shop) => (
          <article className="card" key={shop.id}>
            <h2>{shop.name}</h2>
            <p>
              <strong>地域:</strong> {shop.region} / <strong>種類:</strong> {shop.ramenType}
            </p>
            <p>
              <strong>評価:</strong> ⭐ {shop.rating} / <strong>営業時間:</strong>{' '}
              {shop.businessHours}
            </p>
            <p>
              <strong>住所:</strong> {shop.address}
            </p>
            <p>{shop.recommendation}</p>
            <Link to={`/shops/${shop.id}`} className="text-link">
              詳細を見る
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
