import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import {
  addShop as addShopToStorage,
  deleteShop as deleteShopFromStorage,
  getShops,
  updateShop as updateShopInStorage,
} from '../services/shopStorageService';
import type { RamenShop, ShopInput } from '../types';

type ShopsContextValue = {
  shops: RamenShop[];
  addShop: (input: ShopInput) => RamenShop;
  updateShop: (id: string, input: ShopInput) => RamenShop | null;
  deleteShop: (id: string) => boolean;
};

const ShopsContext = createContext<ShopsContextValue | undefined>(undefined);

export function ShopsProvider({ children }: PropsWithChildren) {
  const [shops, setShops] = useState<RamenShop[]>(() => getShops());

  const value = useMemo<ShopsContextValue>(
    () => ({
      shops,
      addShop: (input: ShopInput) => {
        const newShop = addShopToStorage(input);
        setShops(getShops());
        return newShop;
      },
      updateShop: (id: string, input: ShopInput) => {
        const updatedShop = updateShopInStorage(id, input);
        if (!updatedShop) {
          return null;
        }

        setShops(getShops());
        return updatedShop;
      },
      deleteShop: (id: string) => {
        const deleted = deleteShopFromStorage(id);
        if (!deleted) {
          return false;
        }

        setShops(getShops());
        return true;
      },
    }),
    [shops],
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
