import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'トップ' },
  { to: '/shops', label: '店舗一覧' },
  { to: '/regions', label: '地域別' },
  { to: '/favorites', label: 'お気に入り' },
  { to: '/settings/supabase', label: 'Supabase設定' },
  { to: '/settings/supabase-shops', label: 'Supabase店舗確認' },
];

export function Layout() {
  const { isLoggedIn, isAdmin, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-inner container">
          <Link to="/" className="brand">
            🍜 Ramen Map
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
              <li>
                {isLoggedIn ? (
                  <button type="button" className="button-secondary" onClick={() => void logout()}>
                    ログアウト
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

      <main className="container main-content">
        <Outlet />
      </main>
    </div>
  );
}
