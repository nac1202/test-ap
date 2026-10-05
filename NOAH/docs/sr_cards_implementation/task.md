# SRカード実装タスクリスト

- `[x]` 1. カードデータ (`tarot-data.js`) にSRカードを追加
  - `[x]` SR1: 青龍 (`sr_seiryu.png`)
  - `[x]` SR2: 朱雀 (`sr_suzaku.png`)
  - `[x]` SR3: 白虎 (`sr_byakko.png`)
  - `[x]` SR4: 玄武 (`sr_genbu.png`)
  - `[x]` SR5: 麒麟 (`sr_kirin.png`)
  - `[x]` SR6: 鳳凰 (`sr_houou.png`)
- `[x]` 2. 抽選ロジック (`tarot.js`) の実装
  - `[x]` `noa_tarot_master` のチェック
  - `[x]` 固定2%の抽選確率ロジック追加 (6枚の中からランダムで1枚)
  - `[x]` SRカード用のSE再生
- `[x]` 3. UI/演出効果 (`tarot.css`, `tarot.js`) の実装
  - `[x]` SR用CSSエフェクトの追加 (`.card-sr` 等)
  - `[x]` SRカード引いた際のUI切り替え
- `[x]` 4. コレクション画面 (`collection.js`) の対応
  - `[x]` SRカードが図鑑で正しく表示されるかの確認・修正
