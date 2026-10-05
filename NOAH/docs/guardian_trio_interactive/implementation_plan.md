# 実装計画: 守護トリオのインタラクティブ演出＆詳細モーダル機能

トップページの「３大守護カード（守護トリオ）」の各カードをタップした際、ただ枠線が光るだけでなく、属性に応じたキラキラ光るパーティクルエフェクトを発生させると同時に、豪華なカード詳細モーダルを表示してカードの役割解説と大きなアートワークを鑑賞できるようにします。

## 変更内容

### 1. タップ時エフェクトおよびモーダル表示ロジック
#### [MODIFY] [guardian-trio.js](file:///d:/Antigravity/data/NOAH/public/js/guardian-trio.js)
- 各カードアイテム（`.trio-card-item`）にクリックイベントリスナーを追加。
- 属性カラー（🔥赤金, 🌙青銀, 💎エメラルド/金, ✨レインボー/白）に基づくパーティクル生成・アニメーション処理 `spawnTrioSparkles(element, type)` を実装。
- タップされたカードの役割（1st: 主守護, 2nd: サポート, 3rd: 導き）とカード詳細情報をセットしてモーダルを表示する `openTrioCardModal(card, rank)` を追加。

### 2. 専用詳細モーダルのHTMLレイアウト
#### [MODIFY] [index.html](file:///d:/Antigravity/data/NOAH/public/index.html)
- 守護トリオカードタップ時に表示される `<div id="trio-detail-modal" class="modal hidden">` を追加。
- 拡大カード画像、ランクバッジ、属性ラベル、役割テキスト、メッセージ、出現回数表示領域を配置。

### 3. モーダル＆パーティクルエフェクトのCSS
#### [MODIFY] [style.css](file:///d:/Antigravity/data/NOAH/public/style.css)
- パーティクル弾けるキーフレームアニメーション `@keyframes trioSparkle` を追加。
- `trio-detail-modal` 用のガラスモフィズム調スタイリング、カード画像のズームインアニメーション。
