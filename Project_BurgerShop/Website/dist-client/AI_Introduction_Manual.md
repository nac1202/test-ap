# AIコンシェルジュ 導入マニュアル

このマニュアルでは、貴社Webサイトに「AIコンシェルジュ」を導入する手順について解説します。
本システムは、既存のWebサイトに数行のコードを追加するだけで利用可能です。

---

## 1. 納品ファイルの確認

以下のファイルが揃っていることを確認してください。

*   `widget.js` (AIシステムの本体)
*   `widget.css` (デザイン・スタイルシート)
*   `assistant.png` (アイコン画像)
*   `assistant-55.png` (モバイル用アイコン画像 ※あれば)

## 2. サーバーへのアップロード

これらのファイルを、Webサイトのサーバー上の任意の場所にアップロードしてください。
（例: `assets` フォルダや `js`, `css` フォルダなど）

推奨構成:
```
/ (ルートディレクトリ)
  ├─ index.html (既存のトップページ)
  ├─ assets/
      ├─ css/
      │   └─ widget.css
      ├─ js/
      │   └─ widget.js
      └─ img/
          └─ assistant.png
```

## 3. HTMLへのコード追加

WebサイトのHTMLファイル（`index.html` など）を編集し、以下の2箇所にコードを追記してください。

### ① CSSの読み込み
`<head>` タグの中に、以下の行を追加します。パスはアップロード先に合わせて変更してください。

```html
<link rel="stylesheet" href="assets/css/widget.css">
```

### ② スクリプトの読み込みと初期化
`</body>` タグの直前（終了タグの直前）に、以下のコードを追加します。

**重要**: `apiUrl` の部分には、別途ご案内する「AIサーバーのURL」を設定してください。

```html
<!-- AI Widget Script -->
<script src="assets/js/widget.js"></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    initConciergeWidget({
      // 1. 基本設定
      brandName: "貴社の店舗名",          // 表示される店舗名
      themeColor: "#4169e1",            // ブランドカラー
      
      // 2. 業種設定 (restaurant / retail / salon / generic)
      businessType: "generic", 
      
      // 3. 営業時間 (24時間表記)
      hours: { 
        open: 10,   // 開店時間
        close: 19   // 閉店時間
      },
      
      // 4. AIサーバー接続先 (必須)
      apiUrl: "https://bunbun-burger.vercel.app/api/chat"
    });
  });
</script>
```

---

## 4. カスタマイズについて

初期化コード内の各項目を変更することで、挙動をカスタマイズできます。

| 項目 | 説明 | 設定例 |
| :--- | :--- | :--- |
| **brandName** | チャット画面に表示される名前です。 | `"BUN BUN BURGER"` |
| **themeColor** | ボタンやヘッダーの色コードです。 | `"#ff0000"` (赤), `"#000000"` (黒) |
| **businessType** | AIの振る舞いを決定します。<br>・`restaurant` (飲食店)<br>・`salon` (美容室)<br>・`retail` (物販)<br>・`generic` (一般) | `"restaurant"` |
| **hours** | 営業時間外は「営業時間外です」と案内します。<br>※AI自体は24時間応答可能です。 | `{ open: 9, close: 18 }` |

---

## 5. 動作確認

1. Webサイトにアクセスし、画面右下にアイコンが表示されることを確認してください。
2. アイコンをクリックしてチャット画面を開き、「こんにちは」と送信してください。
3. AIから返信があれば導入成功です。

### うまく動かない場合
*   **返信が来ない**: `apiUrl` が正しく設定されているか確認してください。
*   **表示が崩れる**: 他のCSSと干渉している可能性があります。`widget.css` の読み込み順を最後にしてみてください。

ご不明な点がございましたら、担当者までご連絡ください。
