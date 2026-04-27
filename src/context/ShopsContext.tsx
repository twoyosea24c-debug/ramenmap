import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { ramenShops } from '../data/shops';
import type { RamenShop } from '../types';

const SHOPS_STORAGE_KEY = 'ramenmap:custom-shops';

type NewShopInput = {
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
  addShop: (input: NewShopInput) => RamenShop;
};

const ShopsContext = createContext<ShopsContextValue | undefined>(undefined);

function loadCustomShopsFromStorage(): RamenShop[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(SHOPS_STORAGE_KEY);
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
  const [customShops, setCustomShops] = useState<RamenShop[]>(() => loadCustomShopsFromStorage());

  const value = useMemo<ShopsContextValue>(
    () => ({
      shops: [...ramenShops, ...customShops],
      addShop: (input: NewShopInput) => {
        const newShop: RamenShop = {
          id: createShopId(input.name),
          ...input,
        };

        setCustomShops((prev) => {
          const next = [...prev, newShop];
          window.localStorage.setItem(SHOPS_STORAGE_KEY, JSON.stringify(next));
          return next;
        });

        return newShop;
      },
    }),
    [customShops],
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
