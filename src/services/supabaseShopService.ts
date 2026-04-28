import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { RamenShop, ShopInput, SupabaseShopInsertRow, SupabaseShopRow } from '../types';

const columns = ['id', 'name', 'area', 'address', 'ramen_type', 'rating', 'business_hours', 'recommendation'] as const;

function mapSupabaseRowToShop(row: SupabaseShopRow): RamenShop {
  return {
    id: row.id,
    name: row.name,
    region: row.area ?? '未設定',
    address: row.address ?? '未設定',
    ramenType: row.ramen_type ?? '未設定',
    rating: row.rating ?? 0,
    businessHours: row.business_hours ?? '未設定',
    recommendation: row.recommendation ?? '未設定',
  };
}

function clampRating(value: number): number {
  if (!Number.isFinite(value)) {
    return 3;
  }

  return Math.min(5, Math.max(1, Math.round(value)));
}

function createShopId(name: string): string {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');

  return `custom-${normalized || 'shop'}-${Date.now().toString(36)}`;
}

function mapInputToSupabaseRow(input: ShopInput): SupabaseShopInsertRow {
  return {
    id: createShopId(input.name),
    name: input.name,
    area: input.region,
    address: input.address,
    ramen_type: input.ramenType,
    rating: clampRating(input.rating),
    business_hours: input.businessHours,
    recommendation: input.recommendation,
  };
}

export async function fetchSupabaseShops(): Promise<RamenShop[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase が未設定です');
  }

  const { data, error } = await supabase
    .from<SupabaseShopRow>('shops')
    .select(columns.join(','))
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Supabase から店舗一覧を取得できませんでした: ${error.message}`);
  }

  return (data ?? []).map(mapSupabaseRowToShop);
}

export async function insertSupabaseShop(input: ShopInput): Promise<RamenShop> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured || !supabase || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase が未設定です');
  }

  const row = mapInputToSupabaseRow(input);
  const response = await fetch(`${supabaseUrl}/rest/v1/shops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(`Supabase への保存に失敗しました: HTTP ${response.status}`);
  }

  const inserted = (await response.json()) as SupabaseShopRow[];
  const firstRow = inserted[0];

  if (!firstRow) {
    throw new Error('Supabase への保存結果が取得できませんでした');
  }

  return mapSupabaseRowToShop(firstRow);
}
