# UI日本語化 実装計画

## 目的
ユーザー体験を向上させるため、アプリケーション内のユーザー向けのUIテキストを全て日本語に翻訳します。対象はプロフィール設定、公開プロフィール、およびランディングページです。

## 変更内容

### コンポーネント (Components)
#### [MODIFY] [ProfileForm.tsx](file:///d:/Antigravity/data/NFC/nail/src/components/ProfileForm.tsx)
- ラベルの翻訳: 
  - "Profile Image" → "プロフィール画像"
  - "Handle" → "ユーザーID"
  - "Display Name" → "表示名"
  - "Bio" → "自己紹介"
- ボタンの翻訳: 
  - "Save Changes" → "変更を保存"
  - "Saving..." → "保存中..."
- メッセージの翻訳: 
  - "Image upload failed" → "画像のアップロードに失敗しました"

### ページ (Pages)
#### [MODIFY] [Public Profile Page](file:///d:/Antigravity/data/NFC/nail/src/app/u/[handle]/page.tsx)
- "No links added yet." → "リンクはまだありません。" に変更
- (オプション) ブランド名等は英語のまま維持

#### [MODIFY] [Settings Page](file:///d:/Antigravity/data/NFC/nail/src/app/settings/page.tsx)
- タイトル "Profile Settings" → "プロフィール設定" に変更

#### [MODIFY] [Landing Page](file:///d:/Antigravity/data/NFC/nail/src/app/page.tsx)
- デフォルトの "Create Next App" テンプレートを削除し、シンプルな "NFC Linkへようこそ" というウェルカムページを作成

## 検証計画

### 手動検証
1.  **設定ページ (`/settings`)**: タイトルとフォームのラベルが日本語表記になっているか確認。
2.  **フォーム動作**: プロフィールを更新し、保存ボタンが「保存中...」となるか、完了後に反映されるか確認。
3.  **公開プロフィール (`/u/[handle]`)**: リンク未登録時のメッセージが日本語で表示されるか確認。
4.  **トップページ (`/`)**: 日本語のウェルカムメッセージが表示されるか確認。
