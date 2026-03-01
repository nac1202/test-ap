# 画像リサイズ実装計画

## 目的
プロフィール画像のアップロード時に、サーバー（Cloudinary）側で自動的に画像をリサイズ・最適化して保存するように変更します。これにより、高解像度の生データがそのまま保存されるのを防ぎ、ストレージ容量を節約します。

## 提案される変更

### Backend (署名生成)
#### [MODIFY] [src/lib/cloudinary.ts](file:///d:/Antigravity/data/NFC/nail/src/lib/cloudinary.ts)
- `generateUploadSignature` 関数内の `params` に `transformation` パラメータを追加します。
- 設定内容: `w_500,h_500,c_fill,g_face,q_auto,f_auto`
    - `w_500,h_500`: 500x500ピクセルにリサイズ
    - `c_fill`: アスペクト比を維持しながら設定サイズに切り抜き
    - `g_face`: 顔を自動認識して中心に合わせる
    - `q_auto`: 画質の自動最適化
    - `f_auto`: フォーマットの自動最適化（WebPなどへ変換）
- クライアントがアップロード時に同じパラメータを使えるよう、戻り値に `transformation` を含めます。

### Frontend (アップロード処理)
#### [MODIFY] [src/components/ProfileForm.tsx](file:///d:/Antigravity/data/NFC/nail/src/components/ProfileForm.tsx)
- `getCloudinarySignature` から `transformation` 文字列を受け取るように修正。
- Cloudinaryへのアップロードリクエスト (`FormData`) に `transformation` を追加。

## 検証計画

### 手動検証
1.  **画像アップロード**: 高解像度（例: 4000x3000px）の写真をプロフィール画像としてアップロードする。
2.  **結果確認**:
    - アップロードがエラーなく完了すること。
    - 表示される画像が正しく顔を中心に切り抜かれていること。
    - Cloudinaryのメディアライブラリ（または画像のURL）を確認し、保存された画像が最適化（500x500px程度）されていることを確認する。
