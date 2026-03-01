# Phase 10: Dynamic OGP Image Generation Implementation Plan

## 概要
ユーザーのプロフィールページ (`/u/[handle]`) がSNSでシェアされた際に、そのユーザーが選択している「テーマ（Sage, Sakura等）」に合わせたデザインのOGP画像を動的に生成する。
これにより、SNS上での見栄え（クリック率）を向上させ、ユーザーの「自分だけのページ」感を強化する。

## 技術スタック
- **Next.js Open Graph Image Generation (`next/og`)**: Edge Runtime上で動作する画像生成機能。
- **Satori**: HTML/CSSをSVGに変換するエンジン（Next.jsに内蔵）。

## 実装内容

### 1. OGP生成 APIルート (`src/app/api/og/route.tsx`)
- クエリパラメータとして `handle` と `theme` を受け取る。
- 指定されたテーマに基づいて、背景色、アクセントカラー、フォント色を切り替える。
- ユーザーの `displayName` と `handle` を表示する。
- レイアウトは「名刺」のようなシンプルかつモダンなデザインにする。

### 2. メタデータ設定 (`src/app/u/[handle]/page.tsx`)
- `generateMetadata` 関数内で、ユーザー情報とテーマを取得。
- `openGraph.images` プロパティに、上記APIルートのURLを設定する。
  - 例: `/api/og?handle=username&theme=SAGE&name=UserDisplayName`
- Twitter Cardの設定も行う（`summary_large_image`）。

### 3. デザインパターン
既存の `src/lib/themes.ts` のカラーパレットを参考に、以下のバリエーションを実装する。
- **Standard**: 白ベース、シンプル
- **Sage**: 淡いグリーン、ナチュラル
- **Sakura**: 淡いピンク、ソフト
- **City (Dark)**: 黒系、クール
- **Elegant**: 未定（ベージュ/ゴールド系？）

## ファイル構成
#### [NEW] [route.tsx](file:///d:/Antigravity/data/NFC/nail/src/app/api/og/route.tsx)
OGP生成ロジック。

#### [MODIFY] [page.tsx](file:///d:/Antigravity/data/NFC/nail/src/app/u/[handle]/page.tsx)
メタデータの動的生成を追加。

## 検証計画
- `localhost:3000/api/og?handle=test&theme=SAGE` にアクセスし、画像が生成されるか確認。
- ローカル環境での `opengraph-image` 確認には、[Opengraph.xyz](https://www.opengraph.xyz/) などのツール（公開URLが必要）か、ブラウザのメタデータ確認拡張機能を使用する。
- **Vercel** へのデプロイ後の確認が最も確実。
