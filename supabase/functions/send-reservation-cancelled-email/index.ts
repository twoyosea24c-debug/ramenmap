import { Resend } from 'npm:resend@4.0.0';

type ReservationCancelledEmailPayload = {
  reservationId?: string;
  customerName: string;
  customerEmail: string;
  shopName: string;
  reservationDatetime: string;
  partySize: number;
  cancelReason?: string | null;
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Ramen Map <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

if (!RESEND_API_KEY) {
  console.error('[send-reservation-cancelled-email] RESEND_API_KEY is not set. Email delivery will fail.');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const formatReservationDatetime = (isoDatetime: string): string => {
  const date = new Date(isoDatetime);

  if (Number.isNaN(date.getTime())) {
    return isoDatetime;
  }

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
};

const buildCustomerMailText = (payload: ReservationCancelledEmailPayload): string => `ラーメンマップをご利用いただきありがとうございます。\n\n以下の予約のキャンセル処理が完了しました。\n\n予約番号: ${payload.reservationId ?? '—'}\n予約者名: ${payload.customerName}\n店舗名: ${payload.shopName}\n予約日時: ${formatReservationDatetime(payload.reservationDatetime)}\n人数: ${payload.partySize}名\nキャンセル理由: ${payload.cancelReason?.trim() ? payload.cancelReason : 'なし'}\n\nまたのご利用をお待ちしております。`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const payload = (await req.json()) as ReservationCancelledEmailPayload;

    if (!payload.customerEmail || !payload.customerName || !payload.shopName || !payload.reservationDatetime) {
      return jsonResponse({ error: 'Invalid payload' }, 400);
    }

    if (!resend) {
      return jsonResponse({ error: 'RESEND_API_KEY is not configured' }, 500);
    }

    const customerMail = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: payload.customerEmail,
      subject: 'ラーメンマップ 予約キャンセル完了のお知らせ',
      text: buildCustomerMailText(payload),
    });

    if (customerMail.error) {
      console.error('[send-reservation-cancelled-email] customer mail failed', customerMail.error);
      return jsonResponse({ error: customerMail.error.message ?? 'Failed to send cancellation email' }, 500);
    }

    return jsonResponse({ ok: true, customerMail });
  } catch (error) {
    console.error('[send-reservation-cancelled-email] failed', error);
    return jsonResponse({ error: 'Failed to send reservation cancellation email' }, 500);
  }
});
