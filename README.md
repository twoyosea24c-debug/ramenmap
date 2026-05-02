# Ramen Map

地域ごとのラーメン店を探せる、TypeScript + React製のデモWebアプリです。

## セットアップ

```bash
npm install
npm run dev
```

## チェック

```bash
npm run check
npm run build
```

## Supabaseを使う場合の設定

1. `.env.example` をコピーして `.env` を作成します。
2. SupabaseプロジェクトのURLとAnon Keyを設定します。

```bash
cp .env.example .env
```

`.env`

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_MAPS_EMBED_API_KEY=your-google-maps-embed-api-key
VITE_GOOGLE_GEOCODING_API_KEY=your-google-geocoding-api-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key # 後方互換用
```

> 環境変数が未設定でも、現時点では既存のlocalStorage保存が継続して利用されます。


- `VITE_GOOGLE_MAPS_EMBED_API_KEY` は店舗詳細ページの Google Maps Embed API で利用します。
- `VITE_GOOGLE_GEOCODING_API_KEY` は店舗登録・編集フォームの住所から位置取得で利用します。
- `VITE_GOOGLE_MAPS_API_KEY` は後方互換用で、上記2つのどちらかが未設定の場合にフォールバックとして利用されます。

## 予約確認メール送信（Supabase Edge Function + Resend）

予約登録成功後に `send-reservation-email` Edge Function を呼び出し、利用者と管理者へ通知メールを送信します。

### 必要な環境変数

Edge Function 側で以下を利用します。

- `RESEND_API_KEY`（必須）
- `RESEND_FROM_EMAIL`（任意。未設定時は `Ramen Map <onboarding@resend.dev>`）
- `ADMIN_NOTIFICATION_EMAIL`（任意。未設定時は管理者通知をスキップ）

`RESEND_API_KEY` または `ADMIN_NOTIFICATION_EMAIL` 未設定時は、Edge Function 側で `console.error` に分かりやすくログを出します。

### ローカル実行手順

```bash
# Supabaseローカル起動
supabase start

# Edge Functionの環境変数を設定した .env を指定して関数を起動
supabase functions serve send-reservation-email --env-file supabase/functions/.env
```

`supabase/functions/.env` 例:

```env
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL="Ramen Map <no-reply@example.com>"
ADMIN_NOTIFICATION_EMAIL=admin@example.com
```

### デプロイ手順

```bash
# シークレット登録
supabase secrets set RESEND_API_KEY=your-resend-api-key
supabase secrets set RESEND_FROM_EMAIL="Ramen Map <no-reply@example.com>"
supabase secrets set ADMIN_NOTIFICATION_EMAIL=admin@example.com

# 関数デプロイ
supabase functions deploy send-reservation-email
```
