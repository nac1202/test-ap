# Walkthrough - Burger Shop Camera Fix

Burger Shop向けウィジェットで、カメラで撮影した画像がチャット欄に表示されない問題を修正しました。
`addMessage` に画像タグ（`<img>`）を渡すように変更しました。

## Changes

### Asset Updates

#### [widget_v6.js](file:///d:/Antigravity/data/Project_BurgerShop/Website/public/assets/js/widget_v6.js)
- **Refactored `captureAndSend`**:
    - `addMessage` に渡すコンテンツを、テキストから `<img>` タグに変更。
    - 画像サイズを `max-width: 100%` に設定し、チャットバブル内に収まるように調整。

## Verification Results

### Deployment
- **Command**: `vercel --prod`
- **Result**: Success (Verified by User)

### Manual Verification Steps
1. **PCまたはモバイルブラウザ**で Burger Shop のデモサイトにアクセス。
2. カメラボタンをクリックして写真を撮影。
3. チャット欄に、送信した写真がサムネイルとして表示されることを確認。
    - **Result**: Checked and Verified.
