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
