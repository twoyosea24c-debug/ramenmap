import { ramenShops } from '../data/shops';
import { getLocalStorageItem, setLocalStorageItem } from '../lib/localStorage';
import type { RamenShop, ShopInput } from '../types';

export const STORAGE_KEYS = {
  customShops: 'ramenmap:custom-shops',
  editedBaseShops: 'ramenmap:edited-base-shops',
  deletedShopIds: 'ramenmap:deleted-shop-ids',
  favorites: 'ramenmap:favorites',
} as const;

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

function readRamenShops(key: string): RamenShop[] {
  const raw = getLocalStorageItem(key);
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

function readStringArray(key: string): string[] {
  const raw = getLocalStorageItem(key);
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

function writeRamenShops(key: string, shops: RamenShop[]): void {
  setLocalStorageItem(key, JSON.stringify(shops));
}

function writeStringArray(key: string, values: string[]): void {
  setLocalStorageItem(key, JSON.stringify(values));
}

function createShopId(name: string): string {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');

  return `custom-${normalized || 'shop'}-${Date.now().toString(36)}`;
}

function getCustomShops(): RamenShop[] {
  return readRamenShops(STORAGE_KEYS.customShops);
}

function getEditedBaseShops(): RamenShop[] {
  return readRamenShops(STORAGE_KEYS.editedBaseShops);
}

export function getDeletedShopIds(): string[] {
  return readStringArray(STORAGE_KEYS.deletedShopIds);
}

export function getShops(): RamenShop[] {
  const customShops = getCustomShops();
  const editedBaseShops = getEditedBaseShops();
  const deletedShopIds = getDeletedShopIds();

  return [...ramenShops.map((baseShop) => editedBaseShops.find((edited) => edited.id === baseShop.id) ?? baseShop), ...customShops].filter(
    (shop) => !deletedShopIds.includes(shop.id),
  );
}

export function addShop(input: ShopInput): RamenShop {
  const newShop: RamenShop = {
    id: createShopId(input.name),
    ...input,
  };

  const next = [...getCustomShops(), newShop];
  writeRamenShops(STORAGE_KEYS.customShops, next);

  return newShop;
}

export function updateShop(id: string, input: ShopInput): RamenShop | null {
  const updatedShop: RamenShop = { id, ...input };
  const isBaseShop = ramenShops.some((shop) => shop.id === id);

  if (isBaseShop) {
    const editedBaseShops = getEditedBaseShops();
    const next = editedBaseShops.some((shop) => shop.id === id)
      ? editedBaseShops.map((shop) => (shop.id === id ? updatedShop : shop))
      : [...editedBaseShops, updatedShop];

    writeRamenShops(STORAGE_KEYS.editedBaseShops, next);
    return updatedShop;
  }

  const customShops = getCustomShops();
  if (!customShops.some((shop) => shop.id === id)) {
    return null;
  }

  const next = customShops.map((shop) => (shop.id === id ? updatedShop : shop));
  writeRamenShops(STORAGE_KEYS.customShops, next);

  return updatedShop;
}

export function deleteShop(id: string): boolean {
  const customShops = getCustomShops();
  const editedBaseShops = getEditedBaseShops();
  const deletedShopIds = getDeletedShopIds();

  const exists =
    ramenShops.some((shop) => shop.id === id) ||
    customShops.some((shop) => shop.id === id) ||
    editedBaseShops.some((shop) => shop.id === id);

  if (!exists || deletedShopIds.includes(id)) {
    return false;
  }

  writeStringArray(STORAGE_KEYS.deletedShopIds, [...deletedShopIds, id]);
  return true;
}

export function getFavorites(): string[] {
  return readStringArray(STORAGE_KEYS.favorites);
}

export function addFavorite(shopId: string): string[] {
  const favoriteIds = getFavorites();
  if (favoriteIds.includes(shopId)) {
    return favoriteIds;
  }

  const next = [...favoriteIds, shopId];
  writeStringArray(STORAGE_KEYS.favorites, next);
  return next;
}

export function removeFavorite(shopId: string): string[] {
  const favoriteIds = getFavorites();
  if (!favoriteIds.includes(shopId)) {
    return favoriteIds;
  }

  const next = favoriteIds.filter((id) => id !== shopId);
  writeStringArray(STORAGE_KEYS.favorites, next);
  return next;
}
