import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { ramenShops } from '../data/shops';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  addShop as addShopToStorage,
  deleteShop as deleteShopFromStorage,
  getShops,
  updateShop as updateShopInStorage,
} from '../services/shopStorageService';
import { fetchSupabaseShops } from '../services/supabaseShopService';
import type { RamenShop, ShopInput } from '../types';

type ShopsContextValue = {
  shops: RamenShop[];
  isLoading: boolean;
  loadError: string | null;
  addShop: (input: ShopInput) => RamenShop;
  updateShop: (id: string, input: ShopInput) => RamenShop | null;
  deleteShop: (id: string) => boolean;
};

const ShopsContext = createContext<ShopsContextValue | undefined>(undefined);

export function ShopsProvider({ children }: PropsWithChildren) {
  const [baseShops, setBaseShops] = useState<RamenShop[]>(ramenShops);
  const [shops, setShops] = useState<RamenShop[]>(() => getShops(ramenShops));
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const hydrateBaseShops = async () => {
      if (!isSupabaseConfigured) {
        setBaseShops(ramenShops);
        setShops(getShops(ramenShops));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const supabaseShops = await fetchSupabaseShops();

        if (isCancelled) {
          return;
        }

        if (supabaseShops.length === 0) {
          setLoadError('Supabaseの店舗データが空だったため、ローカルデータを表示しています。');
          setBaseShops(ramenShops);
          setShops(getShops(ramenShops));
          return;
        }

        setBaseShops(supabaseShops);
        setShops(getShops(supabaseShops));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Supabase からの読み込みに失敗しました';
        console.error('[ShopsProvider] Failed to load shops from Supabase:', message);

        if (isCancelled) {
          return;
        }

        setLoadError(`${message}。ローカルデータを表示しています。`);
        setBaseShops(ramenShops);
        setShops(getShops(ramenShops));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void hydrateBaseShops();

    return () => {
      isCancelled = true;
    };
  }, []);

  const value = useMemo<ShopsContextValue>(
    () => ({
      shops,
      isLoading,
      loadError,
      addShop: (input: ShopInput) => {
        const newShop = addShopToStorage(input);
        setShops(getShops(baseShops));
        return newShop;
      },
      updateShop: (id: string, input: ShopInput) => {
        const updatedShop = updateShopInStorage(id, input, baseShops);
        if (!updatedShop) {
          return null;
        }

        setShops(getShops(baseShops));
        return updatedShop;
      },
      deleteShop: (id: string) => {
        const deleted = deleteShopFromStorage(id, baseShops);
        if (!deleted) {
          return false;
        }

        setShops(getShops(baseShops));
        return true;
      },
    }),
    [baseShops, isLoading, loadError, shops],
  );

  return <ShopsContext.Provider value={value}>{children}</ShopsContext.Provider>;
}

export function useShops() {
  const context = useContext(ShopsContext);

  if (!context) {
    throw new Error('useShops must be used within a ShopsProvider');
  }

  return context;
}
