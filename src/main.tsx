import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { FavoritesProvider } from './context/FavoritesContext';
import { ShopsProvider } from './context/ShopsContext';
import { AuthProvider } from './context/AuthContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ShopsProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </FavoritesProvider>
      </ShopsProvider>
    </AuthProvider>
  </React.StrictMode>,
);
