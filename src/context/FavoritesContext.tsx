import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

const FAVORITES_STORAGE_KEY = 'ramenmap:favorites';

type FavoritesContextValue = {
  favoriteIds: string[];
  isFavorite: (shopId: string) => boolean;
  toggleFavorite: (shopId: string) => void;
  removeFavorite: (shopId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

function loadFavoritesFromStorage(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: PropsWithChildren) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavoritesFromStorage());

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      isFavorite: (shopId: string) => favoriteIds.includes(shopId),
      toggleFavorite: (shopId: string) => {
        setFavoriteIds((prev) => {
          const next = prev.includes(shopId)
            ? prev.filter((id) => id !== shopId)
            : [...prev, shopId];

          window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      },
      removeFavorite: (shopId: string) => {
        setFavoriteIds((prev) => {
          if (!prev.includes(shopId)) {
            return prev;
          }

          const next = prev.filter((id) => id !== shopId);
          window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
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
