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

type ReservationEmailPayload = {
  reservationId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shopName: string;
  reservationDatetime: string;
  partySize: number;
  note?: string | null;
};

export const sendReservationConfirmationEmail = async (payload: ReservationEmailPayload): Promise<void> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { error } = await supabase.functions.invoke('send-reservation-email', { body: payload });
  if (error) throw error;
};

export const sendReservationVerificationCode = async (email: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { error } = await supabase.functions.invoke('send-reservation-verification-code', { body: { email } });
  if (error) throw error;
};

export const verifyReservationCode = async (email: string, code: string): Promise<'verified' | 'invalid' | 'expired'> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { data, error } = await supabase.rpc('verify_reservation_code', {
    input_email: email,
    input_code: code,
  });

  if (error) throw error;
  return data as 'verified' | 'invalid' | 'expired';
};

export const fetchReservationsByCustomerEmail = async (email: string, code: string): Promise<Reservation[]> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const { data, error } = await supabase.rpc('fetch_reservations_by_customer_email', {
    input_email: email,
    input_code: code,
  });

  if (error) throw error;

  return ((data ?? []) as SupabaseReservationRow[]).map((row) => mapReservationRow(row));
};

export const fetchReservations = async (): Promise<Reservation[]> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.from(RESERVATIONS_TABLE).select('*').order('reservation_datetime', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapReservationRow(row as SupabaseReservationRow));
};

export const fetchReservationById = async (reservationId: Reservation['id']): Promise<Reservation | null> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.from(RESERVATIONS_TABLE).select('*').eq('id', reservationId).maybeSingle();
  if (error) throw error;
  return data ? mapReservationRow(data as SupabaseReservationRow) : null;
};

export const createReservation = async (input: ReservationInsert): Promise<Reservation> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const status = input.status ?? 'pending';
  const note = input.note ?? null;
  const { error } = await supabase.from(RESERVATIONS_TABLE).insert({
    shop_id: input.shopId, shop_name: input.shopName, customer_name: input.customerName, customer_phone: input.customerPhone,
    customer_email: input.customerEmail, reservation_datetime: input.reservationDatetime, party_size: input.partySize, status, note,
  });
  if (error) throw error;
  const now = new Date().toISOString();
  return { id: crypto.randomUUID?.() ?? `${Date.now()}`, shopId: input.shopId, shopName: input.shopName, customerName: input.customerName, customerPhone: input.customerPhone, customerEmail: input.customerEmail, reservationDatetime: input.reservationDatetime, partySize: input.partySize, status, note, cancelReason: null, adminMemo: null, createdAt: now, updatedAt: now };
};

export const updateReservationStatus = async (reservationId: Reservation['id'], status: ReservationStatus): Promise<Reservation> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.from(RESERVATIONS_TABLE).update({ status }).eq('id', reservationId).select('*').single();
  if (error) throw error;
  return mapReservationRow(data as SupabaseReservationRow);
};


export const cancelReservation = async (reservationId: Reservation['id'], cancelReason: string): Promise<Reservation> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase
    .from(RESERVATIONS_TABLE)
    .update({ status: 'canceled', cancel_reason: cancelReason })
    .eq('id', reservationId)
    .select('*')
    .single();
  if (error) throw error;
  return mapReservationRow(data as SupabaseReservationRow);
};

export const bulkUpdateReservationStatus = async (reservationIds: Reservation['id'][], status: ReservationStatus, cancelReason?: string): Promise<Reservation[]> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  if (reservationIds.length === 0) return [];
  const payload: { status: ReservationStatus; cancel_reason?: string } = { status };
  if (status === 'canceled') payload.cancel_reason = cancelReason ?? '';
  const { data, error } = await supabase.from(RESERVATIONS_TABLE).update(payload).in('id', reservationIds).select('*');
  if (error) throw error;
  return (data ?? []).map((row) => mapReservationRow(row as SupabaseReservationRow));
};

export const updateReservationAdminMemo = async (reservationId: Reservation['id'], adminMemo: string): Promise<Reservation> => {
  if (!supabase) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.from(RESERVATIONS_TABLE).update({ admin_memo: adminMemo }).eq('id', reservationId).select('*').single();
  if (error) throw error;
  return mapReservationRow(data as SupabaseReservationRow);
};
