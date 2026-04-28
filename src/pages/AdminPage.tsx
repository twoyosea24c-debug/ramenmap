import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShops } from '../context/ShopsContext';

export function AdminPage() {
  const { isLoading, isLoggedIn, isAdmin, session } = useAuth();
  const { shops } = useShops();

  if (isLoading) {
    return <p>認証情報を確認中です...</p>;
  }

  if (!isLoggedIn || !isAdmin) {
    return (
      <section className="card detail-wrapper">
        <h1>管理者ダッシュボード</h1>
        <p className="status-error">管理者のみアクセスできます</p>
      </section>
    );
  }

  return (
    <section className="card detail-wrapper">
      <h1>管理者ダッシュボード</h1>

      <dl className="detail-list">
        <div>
          <dt>ログインユーザー</dt>
          <dd>{session?.user.email ?? 'メールアドレス未取得'}</dd>
        </div>
        <div>
          <dt>登録店舗数</dt>
          <dd>{shops.length}件</dd>
        </div>
      </dl>

      <div className="shop-form-actions">
        <Link to="/shops/new" className="button-primary">
          店舗追加ページへ
        </Link>
        <Link to="/shops" className="button-secondary">
          店舗一覧ページへ
        </Link>
      </div>

      {isAdmin ? (
        <div className="shop-form-actions">
          <Link to="/settings/supabase" className="button-secondary">
            Supabase設定確認ページへ
          </Link>
          <Link to="/settings/supabase-shops" className="button-secondary">
            Supabase店舗確認ページへ
          </Link>
        </div>
      ) : null}
    </section>
  );
}
