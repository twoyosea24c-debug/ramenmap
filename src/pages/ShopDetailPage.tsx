import { Link, useParams } from 'react-router-dom';
import { ramenShops } from '../data/shops';

export function ShopDetailPage() {
  const { shopId } = useParams();
  const shop = ramenShops.find((item) => item.id === shopId);

  if (!shop) {
    return (
      <section className="card">
        <h1>店舗が見つかりませんでした</h1>
        <Link to="/shops" className="text-link">
          店舗一覧へ戻る
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h1>{shop.name}</h1>
      <div className="grid-2">
        <article className="card">
          <h2>店舗情報</h2>
          <p>
            <strong>地域:</strong> {shop.region}
          </p>
          <p>
            <strong>ラーメンの種類:</strong> {shop.ramenType}
          </p>
          <p>
            <strong>評価:</strong> ⭐ {shop.rating}
          </p>
          <p>
            <strong>営業時間:</strong> {shop.businessHours}
          </p>
          <p>
            <strong>住所:</strong> {shop.address}
          </p>
          <p>
            <strong>おすすめポイント:</strong> {shop.recommendation}
          </p>
        </article>

        <article className="card map-placeholder">
          <h2>地図エリア（仮）</h2>
          <div className="mock-map">GoogleマップAPI導入前の仮表示エリア</div>
        </article>
      </div>
    </section>
  );
}
