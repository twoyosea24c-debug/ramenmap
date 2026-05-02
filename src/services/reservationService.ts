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

  const { data, error } = await supabase
    .from(RESERVATIONS_TABLE)
    .insert({
      shop_id: input.shopId,
      shop_name: input.shopName,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail,
      reservation_datetime: input.reservationDatetime,
      party_size: input.partySize,
      status: input.status ?? 'pending',
      note: input.note ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapReservationRow(data as SupabaseReservationRow);
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
