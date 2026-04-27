# ramenmap

## 現在のコード確認結果

このリポジトリ内のファイルを確認したところ、現時点では `README.md` のみが存在し、TypeScript ソースコード（`*.ts` / `*.tsx`）や `package.json` はこの作業ディレクトリでは確認できませんでした。

- そのため、TypeScript 上の型エラーや import ミスについては、確認対象のコードが存在しないため静的確認を実施できませんでした。

## ローカルPCでの起動・検証手順

以下をローカルPCで実行してください。

```bash
npm install
npm run check
npm run build
npm run dev
```

## Codex 環境での検証状況

Codex 環境では `npm install` 実行時に **403 Forbidden** が発生し、依存関係の取得に失敗しました。
そのため、この環境上では依存関係インストール後の実行検証（`npm run check` / `npm run build` / `npm run dev`）は未完了です。
