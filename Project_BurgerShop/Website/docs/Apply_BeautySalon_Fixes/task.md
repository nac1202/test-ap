# Apply BeautySalon Fixes to BurgerShop

BeautySalonプロジェクトで行われた修正をBurgerShopプロジェクトにも適用する。

- [x] 多言語機能のフル実装
    - [x] 地球儀ボタンのイベントリスナー改善 (JP/EN/ZH切り替え)
    - [x] UI要素の即時翻訳 (バッジ、ボタン、プレースホルダー)
    - [x] 予約フォームの多言語対応
- [x] 予約完了時の表示改善
    - [x] `handleReservationSubmit` (または `submitReservation`) の修正
    - [x] 予約詳細をユーザー発言として記録
- [x] 予約フォーム表示トリガーの厳格化
    - [x] `addMessage` 内のトリガー判定修正 (`[予約フォーム]` のみ)
    - [x] システムプロンプトの修正 (無闇にフォームを出さない)
- [x] キャッシュ対策
    - [x] `index.html` のJSバージョン更新
- [x] 検証とデプロイ
- [x] バックアップ作成
    - [x] `backups/Project_BurgerShop_Backup_20260206_Final.zip`
- [x] 導入マニュアル作成 (HTML版)
    - [x] 接客ルールの学習（data-store-info）の追記
    - [x] FAQリスト（data-faq-item）の追記
- [x] アバター画像変更機能の追加
    - [x] `widget_v6.js` に `avatarUrl` オプションを追加
    - [x] マニュアル (`Introduction_Manual.html`) に設定方法を追記
- [x] 外部予約URL機能の追加
    - [x] `widget_v6.js` に `reservationUrl` オプションを追加
    - [x] マニュアルに対応方法を追記
- [x] 納品用ファイル（zip）の作成
    - [x] `dist-client/ai_concierge_assets_v2.zip` の作成
- [x] システム仕組み解説資料の作成 (HTML)
    - [x] `AIコンシェルジュの仕組み（図解）.html` の作成
