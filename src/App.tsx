import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FavoritesPage } from './pages/FavoritesPage';
import { HomePage } from './pages/HomePage';
import { RegionsPage } from './pages/RegionsPage';
import { NewShopPage } from './pages/NewShopPage';
import { ShopDetailPage } from './pages/ShopDetailPage';
import { EditShopPage } from './pages/EditShopPage';
import { ShopsPage } from './pages/ShopsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="shops" element={<ShopsPage />} />
        <Route path="shops/new" element={<NewShopPage />} />
        <Route path="shops/:id" element={<ShopDetailPage />} />
        <Route path="shops/:id/edit" element={<EditShopPage />} />
        <Route path="regions" element={<RegionsPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
