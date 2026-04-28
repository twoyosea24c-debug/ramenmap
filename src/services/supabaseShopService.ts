import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { RamenShop, SupabaseShopRow } from '../types';

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

