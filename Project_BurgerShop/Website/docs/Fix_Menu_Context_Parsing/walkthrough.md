# 修正内容の確認: 期間限定メニューの反映

AIコンシェルジュがHP上の期間限定メニューを認識できない問題を修正しました。

## 変更点

### `public/assets/js/widget_v6.js`

`collectPageMenuContext` 関数を修正し、`data-campaign` 属性を持つ要素（期間限定メニュー）の情報をスクレイピングしてAIのコンテキストに含めるようにしました。

```javascript
// 追加されたロジック
const campaignItems = document.querySelectorAll("[data-campaign]");
const campaigns = Array.from(campaignItems).map((item, index) => {
    const title = item.querySelector(".campaign-title")?.textContent.trim();
    const desc = item.querySelector(".campaign-description")?.textContent.trim();
    const period = item.querySelector(".campaign-period")?.textContent.trim();
    return {
        id: `campaign_${index + 1}`,
        name: title,
        description: desc + (period ? ` (${period})` : ""),
        is_limited: true
    };
});
```

## 結果

これにより、AIは以下の情報を含むJSONをシステムプロンプトとして受け取るようになります：

```json
{
  "siteName": "BUN BUN BURGER",
  "campaigns": [
    {
      "id": "campaign_1",
      "name": "Spicy Volcano Burger",
      "description": "今だけの特製マグマソースを使用。ハラペーニョ3倍増量の期間限定激辛バーガー。挑戦者求む。 (提供期間：〜 5月末まで)",
      "is_limited": true
    },
    ...
  ],
  "items": [...]
}
```


### 追加修正: 営業時間外の判定ロジック強化

ユーザーより「営業時間外（22:30）なのに『今から来店可能』と回答された」との報告を受けたため、現在時刻と営業時間を比較するロジックをJS側に追加しました。

```javascript
// 追加されたロジック（概念）
const hours = WIDGET_CONFIG.hours;
const currentHour = new Date().getHours();
if (currentHour < hours.open || currentHour >= hours.close) {
    systemPrompt += "【重要】現在は営業時間外です。「本日の営業は終了しました」と回答してください。";
}
```

これにより、AIが幻覚（ハルシネーション）で適当な回答をするのを防ぎ、確実に「営業時間外」である旨を案内させます。
