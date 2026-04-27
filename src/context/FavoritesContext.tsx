import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import {
  addFavorite,
  getFavorites,
  removeFavorite as removeFavoriteFromStorage,
} from '../services/shopStorageService';

type FavoritesContextValue = {
  favoriteIds: string[];
  isFavorite: (shopId: string) => boolean;
  toggleFavorite: (shopId: string) => void;
  removeFavorite: (shopId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: PropsWithChildren) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavorites());

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      isFavorite: (shopId: string) => favoriteIds.includes(shopId),
      toggleFavorite: (shopId: string) => {
        const next = favoriteIds.includes(shopId)
          ? removeFavoriteFromStorage(shopId)
          : addFavorite(shopId);

        setFavoriteIds(next);
      },
      removeFavorite: (shopId: string) => {
        const next = removeFavoriteFromStorage(shopId);
        setFavoriteIds(next);
      },
    }),
    [favoriteIds],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }

  return context;
}
