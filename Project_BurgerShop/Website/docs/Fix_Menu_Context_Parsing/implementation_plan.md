# 実装計画: 期間限定メニューのコンテキスト反映

## 目標
HPのHTMLに記載されている期間限定メニュー（スパイシーボルケーノバーガー等）の情報が、AIコンシェルジュの回答に反映されない問題を修正する。

## 問題点
現在の `widget_v6.js` 内の `collectPageMenuContext` 関数は、通常のメニューカード（`.product-card` / `.menu-card`）のみを収集しており、キャンペーンセクション（`section#campaigns` 内の `.campaign` 要素）を無視しているため。

## 変更内容

### [MODIFY] [public/assets/js/widget_v6.js](file:///d:/Antigravity/data/Project_BurgerShop/Website/public/assets/js/widget_v6.js)

- `collectPageMenuContext` 関数内に、キャンペーン情報を取得するロジックを追加する。
- `[data-campaign]` 属性を持つ要素を対象とし、タイトル、説明文、期間を取得する。
- 取得した情報を `campaigns` 配列として、AIへのシステムプロンプトに含めるコンテキストJSONに追加する。

## 検証計画

### 手動検証
1. 修正後の `widget_v6.js` が読み込まれていることを確認。
2. チャットボットに対して「今だけの限定メニューは？」「スパイシーボルケーノバーガーについて教えて」と質問する。
3. AIがHTML内の説明文（「マグマソースを使用」など）に基づいて回答できるか確認する。
