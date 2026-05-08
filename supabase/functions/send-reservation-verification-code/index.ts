import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import { Resend } from 'npm:resend@4.0.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Ramen Map <onboarding@resend.dev>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const DB_ADMIN_KEY = Deno.env.get('DB_ADMIN_KEY');

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

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const generateCode = (): string => String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { email } = (await req.json()) as { email?: string };
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return jsonResponse({ error: 'メールアドレスを入力してください。' }, 400);
    }

    if (!SUPABASE_URL || !DB_ADMIN_KEY) {
      console.error('[send-reservation-verification-code] DB_ADMIN_KEY is not configured.');
      return jsonResponse({ error: 'DB_ADMIN_KEY が未設定です。' }, 500);
    }

    if (!resend) {
      console.error('[send-reservation-verification-code] RESEND_API_KEY is not configured.');
      return jsonResponse({ error: 'RESEND_API_KEY is not configured' }, 500);
    }

    const supabase = createClient(SUPABASE_URL, DB_ADMIN_KEY, {
      auth: { persistSession: false },
    });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('reservation_verification_codes').insert({
      email: normalizedEmail,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('[send-reservation-verification-code] verification code insert failed', insertError);
      return jsonResponse({ error: insertError.message }, 500);
    }

    const mailResult = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: normalizedEmail,
      subject: 'ラーメンマップ 予約確認用コード',
      text: `予約確認用の認証コードは ${code} です。\n\nこのコードの有効期限は10分です。\n心当たりがない場合はこのメールを破棄してください。`,
    });

    if (mailResult.error) {
      console.error('[send-reservation-verification-code] Resend failed', mailResult.error);
      return jsonResponse({ error: mailResult.error.message ?? 'メール送信に失敗しました。' }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('[send-reservation-verification-code] failed', error);
    const message = error instanceof Error ? error.message : '認証コード送信に失敗しました。';
    return jsonResponse({ error: message }, 500);
  }
});
