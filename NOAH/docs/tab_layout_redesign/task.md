# タスクリスト: トップページのタブレイアウト化（ボトムナビゲーション）

- [x] 1. `index.html` の構造変更
  - [x] ヘッダーにある「本日の運勢」「カードコレクション」ボタンを切り取り。
  - [x] コンテンツ領域を `<div id="tab-home" class="tab-content active">` と `<div id="tab-schedule" class="tab-content">` と `<div id="tab-tarot" class="tab-content">` に分割。
  - [x] `#tab-tarot` の中に、切り取ったタロット関連ボタンを配置。
  - [x] 画面下部にボトムナビゲーションのHTML構造を追加（HOME, SCHEDULE, TAROT）。
- [x] 2. `style.css` の修正
  - [x] `.tab-content` の表示/非表示（`active` クラスによる切り替え）スタイルの追加。
  - [x] ボトムナビゲーションバーのスタイル（`position: fixed`, `bottom: 0` など）と、アイコン・アクティブ状態のデザインを追加。
  - [x] `body` 下部にナビゲーションバー分の余白（padding-bottom）を追加。
- [x] 3. JSの追加（`index.html`）
  - [x] タブ切り替え用の関数 `switchTab(tabId)` を作成。
  - [x] ページ読み込み時やリロード時に最後に開いていたタブを維持するロジック（`localStorage`）を追加。
- [x] 4. 検証
  - [x] 各タブが正しく切り替わるか確認。
  - [x] ボトムナビゲーションがスマホサイズで綺麗に表示されるか確認。
