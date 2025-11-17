# X Local DEX
# Product
LEMONEX (Local E-Money Exchange) は、「地域×ステーブルコイン」の未来を創る、地方創生DEXプラットフォームです。

   - プロダクトの詳細は[こちら](https://github.com/axross-xrpl/x-local-dex/wiki)を参照
   - 開発中バージョンであり、XRP LedgerのDevnetを利用します。

## 特徴

- [Turborepo](https://turbo.build/)によるモノレポ管理
- **フロントエンド:** React + Vite + Tailwind CSS
- **バックエンド:** Express + TypeScript + XRPL.js
- **共通UIコンポーネント:** `@repo/ui`
- **環境変数管理:** `.env`ファイル
- **ESLint & TypeScript** 設定を全パッケージで共有

## プロジェクト構成

```
apps/
  frontend/    # Reactフロントエンドアプリ
  backend/     # ExpressバックエンドAPI
packages/
  ui/                # 共通React UIコンポーネント
  eslint-config/     # 共通ESLint設定
  typescript-config/ # 共通TypeScript設定
```

## はじめに

1. **依存関係のインストール:**

   ```sh
   npm install
   ```

2. **環境変数の設定:**

   - `apps/backend`と`apps/frontend`内で`.env.example`を`.env`にコピーし、値を入力してください。

3. **開発サーバーの起動:**

   ```sh
   npm run dev
   ```
