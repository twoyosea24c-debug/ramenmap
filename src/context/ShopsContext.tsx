import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { ramenShops } from '../data/shops';
import type { RamenShop } from '../types';

const CUSTOM_SHOPS_STORAGE_KEY = 'ramenmap:custom-shops';
const EDITED_BASE_SHOPS_STORAGE_KEY = 'ramenmap:edited-base-shops';

type ShopInput = {
  name: string;
  region: string;
  address: string;
  ramenType: string;
  rating: number;
  businessHours: string;
  recommendation: string;
};

type ShopsContextValue = {
  shops: RamenShop[];
  addShop: (input: ShopInput) => RamenShop;
  updateShop: (id: string, input: ShopInput) => RamenShop | null;
};

const ShopsContext = createContext<ShopsContextValue | undefined>(undefined);

function loadShopsFromStorage(key: string): RamenShop[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRamenShop);
  } catch {
    return [];
  }
}

function isRamenShop(value: unknown): value is RamenShop {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<RamenShop>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.region === 'string' &&
    typeof candidate.address === 'string' &&
    typeof candidate.ramenType === 'string' &&
    typeof candidate.rating === 'number' &&
    typeof candidate.businessHours === 'string' &&
    typeof candidate.recommendation === 'string'
  );
}

function createShopId(name: string): string {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');

  return `custom-${normalized || 'shop'}-${Date.now().toString(36)}`;
}

export function ShopsProvider({ children }: PropsWithChildren) {
  const [customShops, setCustomShops] = useState<RamenShop[]>(() => loadShopsFromStorage(CUSTOM_SHOPS_STORAGE_KEY));
  const [editedBaseShops, setEditedBaseShops] = useState<RamenShop[]>(() =>
    loadShopsFromStorage(EDITED_BASE_SHOPS_STORAGE_KEY),
  );

  const value = useMemo<ShopsContextValue>(
    () => ({
      shops: [
        ...ramenShops.map((baseShop) => editedBaseShops.find((edited) => edited.id === baseShop.id) ?? baseShop),
        ...customShops,
      ],
      addShop: (input: ShopInput) => {
        const newShop: RamenShop = {
          id: createShopId(input.name),
          ...input,
        };

        setCustomShops((prev) => {
          const next = [...prev, newShop];
          window.localStorage.setItem(CUSTOM_SHOPS_STORAGE_KEY, JSON.stringify(next));
          return next;
        });

        return newShop;
      },
      updateShop: (id: string, input: ShopInput) => {
        const updatedShop: RamenShop = { id, ...input };
        const isBaseShop = ramenShops.some((shop) => shop.id === id);

        if (isBaseShop) {
          setEditedBaseShops((prev) => {
            const next = prev.some((shop) => shop.id === id)
              ? prev.map((shop) => (shop.id === id ? updatedShop : shop))
              : [...prev, updatedShop];

            window.localStorage.setItem(EDITED_BASE_SHOPS_STORAGE_KEY, JSON.stringify(next));
            return next;
          });

          return updatedShop;
        }

        const isCustomShop = customShops.some((shop) => shop.id === id);
        if (!isCustomShop) {
          return null;
        }

        setCustomShops((prev) => {
          const next = prev.map((shop) => (shop.id === id ? updatedShop : shop));
          window.localStorage.setItem(CUSTOM_SHOPS_STORAGE_KEY, JSON.stringify(next));
          return next;
        });

        return updatedShop;
      },
    }),
    [customShops, editedBaseShops],
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
