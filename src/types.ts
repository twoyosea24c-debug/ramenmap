export type RamenShop = {
  id: string;
  name: string;
  region: string;
  ramenType: string;
  rating: number;
  businessHours: string;
  openingTime?: string;
  closingTime?: string;
  closedDays?: string[];
  businessHoursNote?: string;
  address: string;
  recommendation: string;
  imageUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type ShopInput = Omit<RamenShop, 'id' | 'latitude' | 'longitude'> & {
  latitude: number | null;
  longitude: number | null;
};

export type SupabaseShopRow = {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  ramen_type: string | null;
  rating: number | null;
  business_hours: string | null;
  opening_time: string | null;
  closing_time: string | null;
  closed_days: string[] | null;
  business_hours_note: string | null;
  recommendation: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type SupabaseShopInsertRow = {
  id: string;
  name: string;
  area: string;
  address: string;
  ramen_type: string;
  rating: number;
  business_hours: string;
  opening_time?: string | null;
  closing_time?: string | null;
  closed_days?: string[] | null;
  business_hours_note?: string | null;
  recommendation: string;
  image_url?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type SupabaseShopUpdateRow = {
  name: string;
  area: string;
  address: string;
  ramen_type: string;
  rating: number;
  business_hours: string;
  opening_time?: string | null;
  closing_time?: string | null;
  closed_days?: string[] | null;
  business_hours_note?: string | null;
  recommendation: string;
  image_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  updated_at: string;
};

export type SupabaseFavoriteRow = {
  id: string;
  shopId: RamenShop['id'];
};
