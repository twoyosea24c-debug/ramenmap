import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FavoritesPage } from './pages/FavoritesPage';
import { HomePage } from './pages/HomePage';
import { RegionsPage } from './pages/RegionsPage';
import { ShopDetailPage } from './pages/ShopDetailPage';
import { ShopsPage } from './pages/ShopsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="shops" element={<ShopsPage />} />
        <Route path="shops/:shopId" element={<ShopDetailPage />} />
        <Route path="regions" element={<RegionsPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
