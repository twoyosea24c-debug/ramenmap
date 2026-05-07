import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import { Resend } from 'npm:resend@4.0.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Ramen Map <onboarding@resend.dev>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SECRET_KEYS = Deno.env.get('SUPABASE_SECRET_KEYS');

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

const pickSecretKeyFromObject = (value: Record<string, unknown>): string | null => {
  const candidates = [
    value.service_role,
    value.serviceRole,
    value.service_role_key,
    value.serviceRoleKey,
    value.secret,
    value.secret_key,
    value.secretKey,
    value.key,
    value.token,
  ];

  const matched = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return typeof matched === 'string' ? matched.trim() : null;
};

const extractSupabaseServiceRoleKey = (rawSecretKeys: string | undefined): string | null => {
  if (!rawSecretKeys?.trim()) {
    return null;
  }

  const trimmed = rawSecretKeys.trim();

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (typeof parsed === 'string' && parsed.trim()) {
      return parsed.trim();
    }

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === 'string' && item.trim()) {
          return item.trim();
        }

        if (item && typeof item === 'object') {
          const key = pickSecretKeyFromObject(item as Record<string, unknown>);
          if (key) {
            return key;
          }
        }
      }
    }

    if (parsed && typeof parsed === 'object') {
      const key = pickSecretKeyFromObject(parsed as Record<string, unknown>);
      if (key) {
        return key;
      }
    }
  } catch {
    const separated = trimmed
      .split(/[\n,;]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (separated.length > 0) {
      return separated[0];
    }
  }

  return null;
};

const SUPABASE_SERVICE_ROLE_KEY = extractSupabaseServiceRoleKey(SUPABASE_SECRET_KEYS);

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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[send-reservation-verification-code] SUPABASE_SECRET_KEYS が利用できません');
      return jsonResponse({ error: 'Supabase環境変数が未設定です。' }, 500);
    }

    if (!resend) {
      console.error('[send-reservation-verification-code] RESEND_API_KEY is not configured.');
      return jsonResponse({ error: 'RESEND_API_KEY is not configured' }, 500);
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
    return jsonResponse({ error: '認証コード送信に失敗しました。' }, 500);
  }
});
