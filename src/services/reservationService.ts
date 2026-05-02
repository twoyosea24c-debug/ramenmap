import { supabase } from '../lib/supabase';
import type { Reservation, ReservationInsert, ReservationStatus, SupabaseReservationRow } from '../types';

const RESERVATIONS_TABLE = 'reservations';

const mapReservationRow = (row: SupabaseReservationRow): Reservation => ({
  id: row.id,
  shopId: row.shop_id,
  shopName: row.shop_name,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  customerEmail: row.customer_email,
  reservationDatetime: row.reservation_datetime,
  partySize: row.party_size,
  status: row.status,
  note: row.note,
  cancelReason: row.cancel_reason,
  adminMemo: row.admin_memo,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fetchReservations = async (): Promise<Reservation[]> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from(RESERVATIONS_TABLE)
    .select('*')
    .order('reservation_datetime', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapReservationRow(row as SupabaseReservationRow));
};

export const createReservation = async (input: ReservationInsert): Promise<Reservation> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const status = input.status ?? 'pending';
  const note = input.note ?? null;
  const insertPayload = {
    shop_id: input.shopId,
    shop_name: input.shopName,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    customer_email: input.customerEmail,
    reservation_datetime: input.reservationDatetime,
    party_size: input.partySize,
    status,
    note,
  };

  // 一般ユーザーの予約登録では anon に INSERT だけを許可すればよいように、
  // insert 後に select('*') で予約行を読み返さない。
  // select を付けると RLS で anon の SELECT 権限が必要になり、予約登録が 401/失敗になる。
  const { error } = await supabase.from(RESERVATIONS_TABLE).insert(insertPayload);

  if (error) {
    throw error;
  }

  const now = new Date().toISOString();

  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
    shopId: input.shopId,
    shopName: input.shopName,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    reservationDatetime: input.reservationDatetime,
    partySize: input.partySize,
    status,
    note,
    cancelReason: null,
    adminMemo: null,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateReservationStatus = async (
  reservationId: Reservation['id'],
  status: ReservationStatus,
): Promise<Reservation> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from(RESERVATIONS_TABLE)
    .update({ status })
    .eq('id', reservationId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapReservationRow(data as SupabaseReservationRow);
};

export const updateReservationAdminMemo = async (
  reservationId: Reservation['id'],
  adminMemo: string,
): Promise<Reservation> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from(RESERVATIONS_TABLE)
    .update({ admin_memo: adminMemo })
    .eq('id', reservationId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapReservationRow(data as SupabaseReservationRow);
};

export const cancelReservation = async (
  reservationId: Reservation['id'],
  cancelReason: string,
): Promise<Reservation> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from(RESERVATIONS_TABLE)
    .update({ status: 'canceled', cancel_reason: cancelReason })
    .eq('id', reservationId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapReservationRow(data as SupabaseReservationRow);
};
