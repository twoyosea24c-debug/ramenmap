import { Resend } from 'npm:resend@4.0.0';

type CancelRequestEmailPayload = {
  shopName: string;
  customerName: string;
  reservationDatetime: string;
  partySize: number;
  customerPhone: string;
  customerEmail: string;
  cancelRequestReason: string;
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Ramen Map <onboarding@resend.dev>';
const ADMIN_NOTIFICATION_EMAIL = Deno.env.get('ADMIN_NOTIFICATION_EMAIL');
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

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

const formatReservationDatetime = (isoDatetime: string): string => {
  const date = new Date(isoDatetime);
  if (Number.isNaN(date.getTime())) return isoDatetime;
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'full', timeStyle: 'short' }).format(date);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const payload = (await req.json()) as CancelRequestEmailPayload;
    if (!payload.shopName || !payload.customerName || !payload.customerEmail || !payload.reservationDatetime) {
      return jsonResponse({ error: 'Invalid payload' }, 400);
    }
    if (!resend || !ADMIN_NOTIFICATION_EMAIL) {
      console.error('[send-cancel-request-admin-email] email env vars missing; skipped.');
      return jsonResponse({ ok: false, skipped: true });
    }

    const result = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: '【ラーメンマップ】キャンセル依頼が入りました',
      text: `キャンセル依頼が入りました。\n\n店舗名: ${payload.shopName}\n予約者名: ${payload.customerName}\n予約日時: ${formatReservationDatetime(payload.reservationDatetime)}\n人数: ${payload.partySize}名\n電話番号: ${payload.customerPhone}\nメールアドレス: ${payload.customerEmail}\nキャンセル依頼理由: ${payload.cancelRequestReason || 'なし'}\n\n管理画面で確認してください。`,
    });

    if (result.error) {
      console.error('[send-cancel-request-admin-email] Resend failed', result.error);
      return jsonResponse({ error: result.error.message ?? 'Failed to send cancel request email' }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('[send-cancel-request-admin-email] failed', error);
    return jsonResponse({ error: 'Failed to send cancel request email' }, 500);
  }
});
