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
```

> 環境変数が未設定でも、現時点では既存のlocalStorage保存が継続して利用されます。
