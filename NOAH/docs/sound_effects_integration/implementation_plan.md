# 実装計画：サウンドエフェクト（SE）の統合

## 目標
ユーザーが用意した5つの音声ファイルを使用して、タロットガチャおよび波紋エフェクト時に臨場感のあるサウンドエフェクト（SE）を鳴らす処理を実装する。

## 用意されたファイル
- `public/audio/ripple_gold.mp3` （女教皇・波紋用）
- `public/audio/ripple_rainbow.mp3` （女帝・波紋用）
- `public/audio/draw_normal.mp3` （通常カードめくり音）
- `public/audio/draw_sp.mp3` （SPカードめくり音）
- `public/audio/draw_wait.mp3.mp3` （カード描画待機時の音、拡張子重複に注意してそのまま使用）

## 提案する変更

### 1. `public/js/particles.js` の修正（波紋SE）
- 音声ファイルを `new Audio()` で読み込んでおき、`pointerdown` 時（波紋発生時）に再生する処理を追加します。
- 連打による音の重なりでやかましくならないよう、連続再生時は前の音の再生位置をリセット（`currentTime = 0`）して鳴らすか、音量を少し絞るなどの工夫を入れます。
  - `.glow-gold` タップ時：`ripple_gold.mp3`
  - `.glow-rainbow` タップ時：`ripple_rainbow.mp3`

### 2. `public/js/tarot.js` の修正（ガチャSE）
- ガチャを引くボタンを押した瞬間（カードのシャッフル・待機アニメーション開始時）に `draw_wait.mp3.mp3` を再生します。
- カードが表にめくれる瞬間に、引いたカードが **SPカード（ID: 22 または 23）かどうか** を判定します。
  - SPカードの場合：`draw_sp.mp3` を再生
  - 通常カードの場合：`draw_normal.mp3` を再生
- 既存の `Web Audio API` を使った仮のビープ音（`playShuffleSound` 等）がある場合は、今回用意いただいた豪華なMP3に置き換えます。

## ユーザー確認（User Review Required）
> [!IMPORTANT]
> 以下の点で進めてもよろしいでしょうか？
> 1. ファイル名 `draw_wait.mp3.mp3` はそのまま指定して読み込みます。
> 2. SPカードの判定は「ID 22（Guardian Deity）」「ID 23（The Sanctuary）」の2つとします。
> 3. 連打対策として、波紋の音は短期間に何度も鳴る場合は前の音を上書き（リスタート）する形にします。
> 
> 問題なければ承認をお願いします！
