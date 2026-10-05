# 実装計画: 3大守護カード（守護トリオ）と属性アドバイス機能

トップページ（`index.html`）の「本日の占い結果を見る」および「カードコレクション」ボタンの下部に、出現頻度の高い上位3枚のタロットカードを表示し、その属性の組み合わせに応じたアドバイスメッセージを動的に表示する機能を実装します。

## 変更内容

### 1. データ定義の追加
#### [NEW] [guardian-trio-data.js](file:///d:/Antigravity/data/NOAH/public/js/guardian-trio-data.js)
- タロットカード24枚の属性（`PASSION`, `HEALING`, `FORTUNE`, `MIRACLE`）マッピング。
- 4属性から3枚選ぶ重複組み合わせ（20パターン）ごとのアドバイス文章（タイトル・本文）。

### 2. ロジック＆表示処理
#### [NEW] [guardian-trio.js](file:///d:/Antigravity/data/NOAH/public/js/guardian-trio.js)
- `localStorage`（`noa_tarot_stats` および `noa_tarot_collection`）からの出現回数データ集計。
- 上位3枚のカード特定と、所持数に応じた表示制御（3枚未満ならプレースホルダー、3枚以上ならカード＆アドバイス）。
- カード画像および属性バッジ、アドバイス文の生成・DOM反映。

### 3. レイアウトおよびスタイリング
#### [MODIFY] [index.html](file:///d:/Antigravity/data/NOAH/public/index.html)
- 守護トリオ表示用セクション `<section id="guardian-trio-section">` の追加。
- `guardian-trio-data.js` および `guardian-trio.js` のスクリプト読み込み。

#### [MODIFY] [style.css](file:///d:/Antigravity/data/NOAH/public/style.css)
- 守護トリオ枠、3連カードサムネイル、属性アイコン/バッジ、メッセージカードの黄金色・ガラスモフィズム調スタイリング。
- スマホ表示時のレスポンシブ調整。
