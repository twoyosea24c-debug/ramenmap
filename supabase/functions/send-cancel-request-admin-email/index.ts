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

const formatReservationDatetime = (isoDatetime: string): string => {
  const date = new Date(isoDatetime);
  if (Number.isNaN(date.getTime())) return isoDatetime;
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'full', timeStyle: 'short' }).format(date);
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });

  try {
    const payload = (await req.json()) as CancelRequestEmailPayload;
    if (!payload.shopName || !payload.customerName || !payload.customerEmail || !payload.reservationDatetime) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!resend || !ADMIN_NOTIFICATION_EMAIL) {
      return new Response(JSON.stringify({ ok: false, skipped: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: '【ラーメンマップ】キャンセル依頼が入りました',
      text: `キャンセル依頼が入りました。\n\n店舗名: ${payload.shopName}\n予約者名: ${payload.customerName}\n予約日時: ${formatReservationDatetime(payload.reservationDatetime)}\n人数: ${payload.partySize}名\n電話番号: ${payload.customerPhone}\nメールアドレス: ${payload.customerEmail}\nキャンセル依頼理由: ${payload.cancelRequestReason || 'なし'}\n\n管理画面で確認してください。`,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[send-cancel-request-admin-email] failed', error);
    return new Response(JSON.stringify({ error: 'Failed to send cancel request email' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
