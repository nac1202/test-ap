# タスクリスト: 本日のタロット占い機能

## フェーズ1: 基本機能実装 (完了)
- [x] 実装計画の作成 (`docs/tarot_feature/implementation_plan.md`) <!-- id: 0 -->
- [x] `public/tarot.html` の作成 <!-- id: 1 -->
- [x] `public/js/tarot-data.js` (データ定義) の作成 <!-- id: 2 -->
- [x] `public/js/tarot.js` (ロジック) の作成 <!-- id: 3 -->
- [x] `public/css/tarot.css` (スタイル) の作成 <!-- id: 4 -->
- [x] `public/index.html` にリンク追加 (エフェクト付き) <!-- id: 5 -->
- [x] 動作確認 <!-- id: 6 -->

## フェーズ2: カードデザイン制作 (CSS強化)
- [x] デザイン方針の決定 (宇宙・星・ゴールド・NOAロゴ統合) <!-- id: 7 -->
- [x] サンプル生成 (The Star) <!-- id: 8 -->
- [x] (CSS) 拡大表示による白枠消去 (一時対応) <!-- id: 9 -->
- [x] (CSS) カード裏面デザインのブラッシュアップ (幾何学模様・高級感) <!-- id: 11 -->
- [x] (CSS) カード表面フレームデザインの強化 <!-- id: 12 -->
- [x] (Retry) 画像生成の再試行 (The Star, 白枠なし) <!-- id: 10 -->
- [x] 大アルカナ（22枚）の図柄生成 (ユーザー画像適用済み) <!-- id: 13 -->

## フェーズ3: データ＆UI調整 (NOAコンセプト対応)
- [x] `public/js/tarot-data.js` の更新 (Lucky Item -> Lucky Action) <!-- id: 16 -->
- [x] (CSS) カード名表示位置の調整 (カード下部に移動、日本語名追加) <!-- id: layout_fix -->
- [ ] CSSアニメーションとエフェクトの調整 (Glow, Pulse) <!-- id: 14 -->
- [x] 結果画面のアクション見直し (Retryボタン削除、トップページボタン文言変更) <!-- id: result_actions -->
- [x] エフェクト演出の強化 (Shine, Floating, Glow) <!-- id: visual_effects -->
- [x] CSSアニメーションとエフェクトの調整 (Glow, Pulse) <!-- id: 14 -->
- [x] `public/js/tarot.js` のロジック修正 (プロパティ参照変更) <!-- id: 18 -->

## フェーズ4: 機能改善
- [x] 日次結果の固定化 (LocalStorage保存) <!-- id: 15 -->
- [x] 結果画面の文言変更 (NOAでの開運アクション -> NOAで更なる運気アップ！) <!-- id: text_chg -->
- [x] レイアウト調整 (フォントサイズ縮小で1行に収める) <!-- id: layout_adj -->
- [x] 開運アクションの文言更新 (7箇所) <!-- id: action_update -->
- [x] 重複したカード名表示の削除 (HTML/JS修正) <!-- id: remove_titles -->

## フェーズ6: カード裏面デザイン画像生成
- [x] デザイン画像の生成と提案 (ユーザー配置画像 taro-ura.png を使用) <!-- id: gen_back_design -->
- [x] 採用デザインの適用 (CSS修正) <!-- id: apply_back_design -->
