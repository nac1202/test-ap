# タスクリスト：サウンドエフェクト統合

- `[x]` `public/js/particles.js` に `ripple_gold.mp3` と `ripple_rainbow.mp3` を読み込むAudioオブジェクトを追加し、波紋発生時に再生する処理を実装する
- `[x]` `public/js/tarot.js` のガチャ開始時（`drawCard`内）に `draw_wait.mp3.mp3` を再生する処理を追加する
- `[x]` `public/js/tarot.js` のカードめくり時（ID判定後）に、SPカードなら `draw_sp.mp3`、通常なら `draw_normal.mp3` を再生する処理を追加する
- `[x]` `public/js/tarot.js` の不要な旧 Web Audio API（ビープ音）関連のコードを削除または置き換える
- `[x]` `walkthrough.md` を作成し、変更内容を報告する
