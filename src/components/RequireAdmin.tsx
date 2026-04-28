import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAdmin({ children }: { children: ReactElement }) {
  const location = useLocation();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  if (isLoading) {
    return <p>認証情報を確認中です...</p>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return (
      <section className="card detail-wrapper">
        <h1>権限がありません</h1>
        <p className="status-error">この操作は管理者のみ利用できます。</p>
      </section>
    );
  }

  return children;
}
