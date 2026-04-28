export type RamenShop = {
  id: string;
  name: string;
  region: string;
  ramenType: string;
  rating: number;
  businessHours: string;
  address: string;
  recommendation: string;
};

export type ShopInput = Omit<RamenShop, 'id'>;

export type SupabaseShopRow = {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  ramen_type: string | null;
  rating: number | null;
  business_hours: string | null;
  recommendation: string | null;
};

export type SupabaseFavoriteRow = {
  id: string;
  shopId: RamenShop['id'];
};
