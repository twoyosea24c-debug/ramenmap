import { Resend } from 'npm:resend@4.0.0';

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

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Ramen Map <onboarding@resend.dev>';
const ADMIN_NOTIFICATION_EMAIL = Deno.env.get('ADMIN_NOTIFICATION_EMAIL');

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

const buildCustomerMailText = (payload: ReservationEmailPayload): string => `ラーメンマップをご利用いただきありがとうございます。\n\n以下の内容で予約を受け付けました。\n\n予約番号: ${payload.reservationId ?? '（採番中）'}\n予約者名: ${payload.customerName}\n店舗名: ${payload.shopName}\n予約日時: ${formatReservationDatetime(payload.reservationDatetime)}\n人数: ${payload.partySize}名\n電話番号: ${payload.customerPhone}\nメールアドレス: ${payload.customerEmail}\n備考: ${payload.note?.trim() ? payload.note : 'なし'}\n予約ステータス: 未確認\n\n店舗からの確認連絡をお待ちください。`;

const buildAdminMailText = (payload: ReservationEmailPayload): string => `新しい予約が入りました。\n\n店舗名: ${payload.shopName}\n予約者名: ${payload.customerName}\n電話番号: ${payload.customerPhone}\nメールアドレス: ${payload.customerEmail}\n予約日時: ${formatReservationDatetime(payload.reservationDatetime)}\n人数: ${payload.partySize}名\n備考: ${payload.note?.trim() ? payload.note : 'なし'}\n\n管理画面で確認してください。`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = (await req.json()) as ReservationEmailPayload;

    if (!payload.customerEmail || !payload.customerName || !payload.shopName || !payload.reservationDatetime) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!resend) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customerMail = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: payload.customerEmail,
      subject: 'ラーメンマップ 予約受付のお知らせ',
      text: buildCustomerMailText(payload),
    });

    let adminMail: Awaited<ReturnType<typeof resend.emails.send>> | null = null;
    if (ADMIN_NOTIFICATION_EMAIL) {
      adminMail = await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: '【ラーメンマップ】新しい予約が入りました',
        text: buildAdminMailText(payload),
      });
    }

    return new Response(JSON.stringify({ ok: true, customerMail, adminMail }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-reservation-email] failed', error);
    return new Response(JSON.stringify({ error: 'Failed to send reservation emails' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
