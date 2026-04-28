import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  RamenShop,
  ShopInput,
  SupabaseShopInsertRow,
  SupabaseShopRow,
  SupabaseShopUpdateRow,
} from '../types';

const columns = [
  'id',
  'name',
  'area',
  'address',
  'ramen_type',
  'rating',
  'business_hours',
  'recommendation',
] as const;

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

function mapInputToSupabaseUpdateRow(input: ShopInput): SupabaseShopUpdateRow {
  return {
    name: input.name,
    area: input.region,
    address: input.address,
    ramen_type: input.ramenType,
    rating: clampRating(input.rating),
    business_hours: input.businessHours,
    recommendation: input.recommendation,
    updated_at: new Date().toISOString(),
  };
}

function normalizeSupabaseError(action: string, message: string): Error {
  const normalized = message.toLowerCase();
  const isRlsError =
    normalized.includes('row-level security') ||
    normalized.includes('rls') ||
    normalized.includes('permission denied') ||
    normalized.includes('not allowed');

  if (isRlsError) {
    return new Error(
      `権限不足のため${action}できません。管理者アカウントでログインしてから再試行してください。`,
    );
  }

  return new Error(`Supabase ${action}に失敗しました: ${message}`);
}

export async function fetchSupabaseShops(): Promise<RamenShop[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase が未設定です');
  }

  const { data, error } = await supabase
    .from('shops')
    .select(columns.join(','))
    .order('created_at', { ascending: true });

  if (error) {
    throw normalizeSupabaseError('から店舗一覧を取得', error.message);
  }

  return ((data ?? []) as unknown as SupabaseShopRow[]).map(mapSupabaseRowToShop);
}

export async function insertSupabaseShop(input: ShopInput): Promise<RamenShop> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase が未設定です');
  }

  const { data, error } = await supabase
    .from('shops')
    .insert(mapInputToSupabaseRow(input))
    .select(columns.join(','))
    .single<SupabaseShopRow>();

  if (error) {
    throw normalizeSupabaseError('への保存', error.message);
  }

  return mapSupabaseRowToShop(data);
}

export async function updateSupabaseShop(id: string, input: ShopInput): Promise<RamenShop> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase が未設定です');
  }

  const { data, error } = await supabase
    .from('shops')
    .update(mapInputToSupabaseUpdateRow(input))
    .eq('id', id)
    .select(columns.join(','))
    .single<SupabaseShopRow>();

  if (error) {
    throw normalizeSupabaseError('への更新', error.message);
  }

  return mapSupabaseRowToShop(data);
}

export async function deleteSupabaseShop(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase が未設定です');
  }

  const { error } = await supabase.from('shops').delete().eq('id', id);

  if (error) {
    throw normalizeSupabaseError('からの削除', error.message);
  }
}
