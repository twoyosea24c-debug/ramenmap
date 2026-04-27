import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useShops } from '../context/ShopsContext';

export function ShopsPage() {
  const [keyword, setKeyword] = useState('');
  const [region, setRegion] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const { isFavorite, toggleFavorite } = useFavorites();
  const { shops } = useShops();

  const allRegions = useMemo(() => Array.from(new Set(shops.map((shop) => shop.region))).sort(), [shops]);

  const filteredShops = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return [...shops]
      .filter((shop) => {
        const regionMatch = region ? shop.region === region : true;
        const keywordMatch = normalizedKeyword
          ? [shop.name, shop.region, shop.ramenType]
              .join(' ')
              .toLowerCase()
              .includes(normalizedKeyword)
          : true;

        return regionMatch && keywordMatch;
      })
      .sort((a, b) => (sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating));
  }, [keyword, region, sortOrder, shops]);

  return (
    <section>
      <div className="page-header">
        <h1>店舗一覧</h1>
        <Link to="/shops/new" className="button-primary add-shop-button">
          店舗を追加
        </Link>
      </div>
      <form className="card search-form" aria-label="店舗検索フォーム">
        <div>
          <label htmlFor="keyword">キーワード</label>
          <input
            id="keyword"
            type="search"
            placeholder="店舗名・地域・ラーメン種類で検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

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
          <label htmlFor="sortOrder">評価順</label>
          <select
            id="sortOrder"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
          >
            <option value="desc">高い順</option>
            <option value="asc">低い順</option>
          </select>
        </div>
      </form>

      <p className="result-count">{filteredShops.length} 件の店舗が見つかりました。</p>

      <div className="shop-list">
        {filteredShops.map((shop) => {
          const favorite = isFavorite(shop.id);

          return (
            <article className="card shop-card" key={shop.id}>
              <div className="shop-card-header">
                <h2>{shop.name}</h2>
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
                  <dt>営業時間</dt>
                  <dd>{shop.businessHours}</dd>
                </div>
              </dl>

              <p>
                <strong>住所:</strong> {shop.address}
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
                  詳細を見る
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
