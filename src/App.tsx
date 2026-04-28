import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FavoritesPage } from './pages/FavoritesPage';
import { HomePage } from './pages/HomePage';
import { RegionsPage } from './pages/RegionsPage';
import { NewShopPage } from './pages/NewShopPage';
import { ShopDetailPage } from './pages/ShopDetailPage';
import { EditShopPage } from './pages/EditShopPage';
import { ShopsPage } from './pages/ShopsPage';
import { SupabaseSettingsPage } from './pages/SupabaseSettingsPage';
import { SupabaseShopsPage } from './pages/SupabaseShopsPage';
import { LoginPage } from './pages/LoginPage';
import { RequireAdmin } from './components/RequireAdmin';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="shops" element={<ShopsPage />} />
        <Route
          path="shops/new"
          element={
            <RequireAdmin>
              <NewShopPage />
            </RequireAdmin>
          }
        />
        <Route path="shops/:id" element={<ShopDetailPage />} />
        <Route
          path="shops/:id/edit"
          element={
            <RequireAdmin>
              <EditShopPage />
            </RequireAdmin>
          }
        />
        <Route path="regions" element={<RegionsPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route
          path="settings/supabase"
          element={
            <RequireAdmin redirectOnDeniedTo="/">
              <SupabaseSettingsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="settings/supabase-shops"
          element={
            <RequireAdmin redirectOnDeniedTo="/">
              <SupabaseShopsPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
