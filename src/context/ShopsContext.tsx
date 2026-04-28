import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { ramenShops } from '../data/shops';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  addShop as addShopToStorage,
  deleteShop as deleteShopFromStorage,
  getShops,
  updateShop as updateShopInStorage,
} from '../services/shopStorageService';
import { deleteSupabaseShop, fetchSupabaseShops, insertSupabaseShop, updateSupabaseShop } from '../services/supabaseShopService';
import type { RamenShop, ShopInput } from '../types';

type AddShopResult = {
  shop: RamenShop;
  savedTo: 'supabase' | 'localStorage';
  message: string;
};

type UpdateShopResult = {
  shop: RamenShop;
  savedTo: 'supabase' | 'localStorage';
  message: string;
};

type DeleteShopResult = {
  deleted: boolean;
  savedTo: 'supabase' | 'localStorage';
  message: string;
};

type ShopsContextValue = {
  shops: RamenShop[];
  isLoading: boolean;
  loadError: string | null;
  reloadShops: () => Promise<void>;
  addShop: (input: ShopInput) => Promise<AddShopResult>;
  updateShop: (id: string, input: ShopInput) => Promise<UpdateShopResult>;
  deleteShop: (id: string) => Promise<DeleteShopResult>;
};

const ShopsContext = createContext<ShopsContextValue | undefined>(undefined);

export function ShopsProvider({ children }: PropsWithChildren) {
  const [baseShops, setBaseShops] = useState<RamenShop[]>(ramenShops);
  const [shops, setShops] = useState<RamenShop[]>(() => getShops(ramenShops));
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applySupabaseShops = (supabaseShops: RamenShop[]) => {
    if (supabaseShops.length === 0) {
      setLoadError('Supabaseの店舗データが空だったため、ローカルデータを表示しています。');
      setBaseShops(ramenShops);
      setShops(getShops(ramenShops));
      return;
    }

    setLoadError(null);
    setBaseShops(supabaseShops);
    setShops(getShops(supabaseShops));
  };

  const reloadShops = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setBaseShops(ramenShops);
      setShops(getShops(ramenShops));
      setLoadError(null);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const supabaseShops = await fetchSupabaseShops();
      applySupabaseShops(supabaseShops);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Supabase からの読み込みに失敗しました';
      console.error('[ShopsProvider] Failed to load shops from Supabase:', message);
      setLoadError(`${message}。ローカルデータを表示しています。`);
      setBaseShops(ramenShops);
      setShops(getShops(ramenShops));
    } finally {
      setIsLoading(false);
    }
  }, []);

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

      try {
        const supabaseShops = await fetchSupabaseShops();

        if (isCancelled) {
          return;
        }

        applySupabaseShops(supabaseShops);
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
      reloadShops,
      addShop: async (input: ShopInput) => {
        if (!isSupabaseConfigured) {
          const newShop = addShopToStorage(input);
          setShops(getShops(baseShops));
          return {
            shop: newShop,
            savedTo: 'localStorage',
            message: 'Supabaseが未設定のため、ブラウザに保存しました。',
          };
        }

        try {
          const newShop = await insertSupabaseShop(input);
          await reloadShops();
          return {
            shop: newShop,
            savedTo: 'supabase',
            message: 'Supabaseに店舗を保存しました。',
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Supabase への保存に失敗しました';
          console.error('[ShopsProvider] Failed to save shop to Supabase:', message);
          throw new Error(message);
        }
      },
      updateShop: async (id: string, input: ShopInput) => {
        if (!isSupabaseConfigured) {
          const updatedLocalShop = updateShopInStorage(id, input, baseShops);
          if (!updatedLocalShop) {
            throw new Error('更新対象の店舗が見つかりませんでした');
          }

          setShops(getShops(baseShops));
          return {
            shop: updatedLocalShop,
            savedTo: 'localStorage',
            message: 'Supabaseが未設定のため、ブラウザに更新内容を保存しました。',
          };
        }

        try {
          const updatedShop = await updateSupabaseShop(id, input);
          setBaseShops((prev) => {
            const nextBaseShops = prev.map((shop) => (shop.id === id ? updatedShop : shop));
            setShops(getShops(nextBaseShops));
            return nextBaseShops;
          });

          updateShopInStorage(id, updatedShop, baseShops);

          return {
            shop: updatedShop,
            savedTo: 'supabase',
            message: 'Supabaseに更新内容を保存しました。',
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Supabase への更新に失敗しました';
          console.error('[ShopsProvider] Failed to update shop in Supabase:', message);
          throw new Error(message);
        }
      },
      deleteShop: async (id: string) => {
        const existsInBase = baseShops.some((shop) => shop.id === id);

        if (!isSupabaseConfigured || !existsInBase) {
          const deletedLocalShop = deleteShopFromStorage(id, baseShops);
          if (!deletedLocalShop) {
            return {
              deleted: false,
              savedTo: 'localStorage',
              message: '削除対象の店舗が見つかりませんでした。',
            };
          }

          setShops(getShops(baseShops));
          return {
            deleted: true,
            savedTo: 'localStorage',
            message: 'Supabaseが未設定のため、ブラウザから削除しました。',
          };
        }

        try {
          await deleteSupabaseShop(id);

          setBaseShops((prev) => {
            const nextBaseShops = prev.filter((shop) => shop.id !== id);
            setShops(getShops(nextBaseShops));
            return nextBaseShops;
          });

          deleteShopFromStorage(id, baseShops);

          return {
            deleted: true,
            savedTo: 'supabase',
            message: 'Supabaseから店舗を削除しました。',
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Supabase からの削除に失敗しました';
          console.error('[ShopsProvider] Failed to delete shop in Supabase:', message);
          return {
            deleted: false,
            savedTo: 'supabase',
            message,
          };
        }
      },
    }),
    [baseShops, isLoading, loadError, reloadShops, shops],
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
