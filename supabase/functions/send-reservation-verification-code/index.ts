import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import { Resend } from 'npm:resend@4.0.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Ramen Map <onboarding@resend.dev>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const generateCode = (): string => String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { email } = (await req.json()) as { email?: string };
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return new Response(JSON.stringify({ error: 'メールアドレスを入力してください。' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase環境変数が未設定です。' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!resend) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
      throw insertError;
    }

    await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: normalizedEmail,
      subject: 'ラーメンマップ 予約確認用コード',
      text: `予約確認用の認証コードは ${code} です。\n\nこのコードの有効期限は10分です。\n心当たりがない場合はこのメールを破棄してください。`,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-reservation-verification-code] failed', error);
    return new Response(JSON.stringify({ error: '認証コード送信に失敗しました。' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
