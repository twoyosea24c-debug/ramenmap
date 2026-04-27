import { Link, NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'トップ' },
  { to: '/shops', label: '店舗一覧' },
  { to: '/regions', label: '地域別' },
  { to: '/favorites', label: 'お気に入り' },
];

export function Layout() {
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
