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

export type ReservationStatus = 'pending' | 'confirmed' | 'canceled' | 'visited';

export type Reservation = {
  id: string;
  shopId: string;
  shopName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationDatetime: string;
  partySize: number;
  status: ReservationStatus;
  note: string | null;
  cancelReason: string | null;
  adminMemo: string | null;
  cancelRequestedAt: string | null;
  cancelRequestReason: string | null;
  cancelCompletionEmailSentAt: string | null;
  changeRequestedAt: string | null;
  changeRequestDatetime: string | null;
  changeRequestPartySize: number | null;
  changeRequestNote: string | null;
  changeCompletionEmailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReservationInsert = {
  shopId: string;
  shopName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationDatetime: string;
  partySize: number;
  status?: ReservationStatus;
  note?: string | null;
};

export type SupabaseReservationRow = {
  id: string;
  shop_id: string;
  shop_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  reservation_datetime: string;
  party_size: number;
  status: ReservationStatus;
  note: string | null;
  cancel_reason: string | null;
  admin_memo: string | null;
  cancel_requested_at: string | null;
  cancel_request_reason: string | null;
  cancel_completion_email_sent_at: string | null;
  change_requested_at: string | null;
  change_request_datetime: string | null;
  change_request_party_size: number | null;
  change_request_note: string | null;
  change_completion_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};
