import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'トップ' },
  { to: '/shops', label: '店舗一覧' },
  { to: '/regions', label: '地域別' },
  { to: '/favorites', label: 'お気に入り' },
  { to: '/reservation/check', label: '予約確認' },
];

const adminNavItems = [
  { to: '/admin', label: '管理画面' },
  { to: '/settings/supabase', label: 'Supabase設定' },
  { to: '/settings/supabase-shops', label: 'Supabase店舗確認' },
];

export function Layout() {
  const { isLoggedIn, isAdmin, logout } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLogoutError(null);
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログアウトに失敗しました。';
      setLogoutError(`ログアウトに失敗しました: ${message}`);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-inner container">
          <Link to="/" className="brand">
            🍜 ラーメンマップ
          </Link>
          <nav>
            <ul className="nav-list">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      isActive ? 'nav-link nav-link-active' : 'nav-link'
                    }
                    end={item.to === '/'}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              {isAdmin
                ? adminNavItems.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          isActive ? 'nav-link nav-link-active' : 'nav-link'
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))
                : null}
              <li>
                {isLoggedIn ? (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => void handleLogout()}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
                  </button>
                ) : (
                  <NavLink to="/login" className="nav-link">
                    管理者ログイン
                  </NavLink>
                )}
              </li>
              {isAdmin ? <li className="admin-badge">管理者</li> : null}
            </ul>
          </nav>
        </div>
      </header>

      {logoutError ? (
        <p className="status-error container" role="alert">
          {logoutError}
        </p>
      ) : null}

      <main className="container main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <p className="footer-copy">© ラーメンマップ</p>
          <nav aria-label="フッターナビゲーション">
            <ul className="footer-links">
              <li>
                <NavLink to="/privacy" className="footer-link">
                  プライバシーポリシー
                </NavLink>
              </li>
              <li>
                <NavLink to="/terms" className="footer-link">
                  利用規約
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
