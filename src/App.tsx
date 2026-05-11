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
import { AdminPage } from './pages/AdminPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { AdminChecklistPage } from './pages/AdminChecklistPage';
import { AdminReservationsCardPage } from './pages/AdminReservationsCardPage';
import { AdminReservationDetailPage } from './pages/AdminReservationDetailPage';
import { ReservationCheckPage } from './pages/ReservationCheckPage';

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
        <Route path="admin" element={<AdminPage />} />
        <Route
          path="admin/reservations"
          element={
            <RequireAdmin>
              <AdminReservationsCardPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/reservations/:id"
          element={
            <RequireAdmin>
              <AdminReservationDetailPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/checklist"
          element={
            <RequireAdmin>
              <AdminChecklistPage />
            </RequireAdmin>
          }
        />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="reservation/check" element={<ReservationCheckPage />} />
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
