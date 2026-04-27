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


export type SupabaseShopRow = RamenShop;

export type SupabaseFavoriteRow = {
  id: string;
  shopId: RamenShop['id'];
};
