import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <section>
      <div className="hero">
        <h1>地域から探せるラーメンマップ</h1>
        <p>
          近くの人気店や、食べたいラーメンの種類からお店を見つけよう。
          現在はデモ版として仮データを表示しています。
        </p>
        <div className="hero-actions">
          <Link to="/shops" className="button-primary">
            店舗一覧を見る
          </Link>
          <Link to="/regions" className="button-secondary">
            地域別に探す
          </Link>
        </div>
      </div>

      <div className="grid-2">
        <article className="card">
          <h2>できること</h2>
          <ul>
            <li>地域・ラーメン種別・評価での絞り込み検索</li>
            <li>店舗情報の詳細表示</li>
            <li>お気に入り店舗の一覧表示（仮）</li>
          </ul>
        </article>
        <article className="card">
          <h2>今後の拡張予定</h2>
          <ul>
            <li>Googleマップ連携</li>
            <li>実データベース接続</li>
            <li>口コミ投稿・写真投稿機能</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
