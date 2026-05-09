import { Resend } from 'npm:resend@4.0.0';

type ReservationEmailPayload = {
  reservationId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail: string;
  shopName: string;
  reservationDatetime: string;
  partySize: number;
  note?: string | null;
  notificationType?: 'created' | 'changed';
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Ramen Map <onboarding@resend.dev>';
const ADMIN_NOTIFICATION_EMAIL = Deno.env.get('ADMIN_NOTIFICATION_EMAIL');

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
  console.error('[send-reservation-email] RESEND_API_KEY is not set. Email delivery will fail.');
}

if (!ADMIN_NOTIFICATION_EMAIL) {
  console.error('[send-reservation-email] ADMIN_NOTIFICATION_EMAIL is not set. Admin notification will be skipped.');
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

const buildCustomerMailText = (payload: ReservationEmailPayload): string => {
  if (payload.notificationType === 'changed') {
    return `ラーメンマップをご利用いただきありがとうございます。\n\n以下の内容で予約変更が完了しました。\n\n予約番号: ${payload.reservationId ?? '—'}\n予約者名: ${payload.customerName}\n店舗名: ${payload.shopName}\n予約日時: ${formatReservationDatetime(payload.reservationDatetime)}\n人数: ${payload.partySize}名\n\n当日はお気をつけてお越しください。`;
  }

  return `ラーメンマップをご利用いただきありがとうございます。\n\n以下の内容で予約を受け付けました。\n\n予約番号: ${payload.reservationId ?? '（採番中）'}\n予約者名: ${payload.customerName}\n店舗名: ${payload.shopName}\n予約日時: ${formatReservationDatetime(payload.reservationDatetime)}\n人数: ${payload.partySize}名\n電話番号: ${payload.customerPhone ?? '—'}\nメールアドレス: ${payload.customerEmail}\n備考: ${payload.note?.trim() ? payload.note : 'なし'}\n予約ステータス: 未確認\n\n店舗からの確認連絡をお待ちください。`;
};

const buildAdminMailText = (payload: ReservationEmailPayload): string => `新しい予約が入りました。\n\n店舗名: ${payload.shopName}\n予約者名: ${payload.customerName}\n電話番号: ${payload.customerPhone ?? '—'}\nメールアドレス: ${payload.customerEmail}\n予約日時: ${formatReservationDatetime(payload.reservationDatetime)}\n人数: ${payload.partySize}名\n備考: ${payload.note?.trim() ? payload.note : 'なし'}\n\n管理画面で確認してください。`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const payload = (await req.json()) as ReservationEmailPayload;

    if (!payload.customerEmail || !payload.customerName || !payload.shopName || !payload.reservationDatetime) {
      return jsonResponse({ error: 'Invalid payload' }, 400);
    }

    if (!resend) {
      return jsonResponse({ error: 'RESEND_API_KEY is not configured' }, 500);
    }

    const customerMail = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: payload.customerEmail,
      subject: payload.notificationType === 'changed' ? 'ラーメンマップ 予約変更完了のお知らせ' : 'ラーメンマップ 予約受付のお知らせ',
      text: buildCustomerMailText(payload),
    });

    if (customerMail.error) {
      console.error('[send-reservation-email] customer mail failed', customerMail.error);
      return jsonResponse({ error: customerMail.error.message ?? 'Failed to send customer email' }, 500);
    }

    let adminMail: Awaited<ReturnType<typeof resend.emails.send>> | null = null;
    if (ADMIN_NOTIFICATION_EMAIL && payload.notificationType !== 'changed') {
      adminMail = await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: '【ラーメンマップ】新しい予約が入りました',
        text: buildAdminMailText(payload),
      });

      if (adminMail.error) {
        console.error('[send-reservation-email] admin mail failed', adminMail.error);
      }
    }

    return jsonResponse({ ok: true, customerMail, adminMail });
  } catch (error) {
    console.error('[send-reservation-email] failed', error);
    return jsonResponse({ error: 'Failed to send reservation emails' }, 500);
  }
});
