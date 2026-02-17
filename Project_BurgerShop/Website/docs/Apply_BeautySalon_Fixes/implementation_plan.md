# Apply BeautySalon Fixes to BurgerShop Implementation Plan

Project_BeautySalonで行われた修正を参考に、Project_BurgerShopへ同様の改善を適用する。

## Proposed Changes

### widget_v6.js

#### Multilingual Support
- **I18N Object**: 既存の辞書を活用。
- **Language Toggle**: 地球儀ボタン (`lang-toggle-chip`) クリック時に `currentLang` をJP->EN->ZH->JPとローテーション。
- **UI Update**: `updateLanguageURI` 関数を拡張し、以下の要素も即時更新する。
  - クイックアクションボタンのラベル (`.action-chip` text)
  - 予約フォームが表示されている場合は、そのラベルとプレースホルダー
  - 送信ボタン等のテキスト
- **Reservation Form**: `renderReservationForm` 内のテキストを `I18N` または `currentLang` に基づいた動的テキストに変更。

#### Reservation Completion Logic
- **submitReservation**:
  - 予約完了時、単に「送信しました」を表示するだけでなく、ユーザーが入力した内容（日時、人数、氏名）をフォーマットし、**ユーザー自身の発言**としてチャットログに追加する (`addMessage(details, 'user')`)。
  - その直後に、ボットからの完了メッセージを表示する。

#### Trigger Logic
- **addMessage**:
  - `if (message.includes("ご予約はこちら") ...)` のような曖昧なトリガーを削除。
  - `[予約フォーム]` という明確なマーカーが含まれている場合のみ `renderReservationForm` を呼び出すように変更。
- **System Prompt**:
  - `generateSystemPrompt` 内の指示を強化。
  - 「挨拶や一般的な質問には予約フォームを出さない」「明確な予約意思がある場合のみ `[予約フォーム]` を出力」というルールを追加。

### index.html

#### Cache Busting
- CSSおよびJS読み込みタグの `?v=...` パラメータを最新の日時 (`20260205_v1`) に更新する。

## Verification Plan

### Manual Verification
1.  **Language Switch**:
    - 地球儀ボタンをクリックし、JP/EN/ZHが切り替わることを確認。
    - クイックアクションボタンのラベル（「来店予約」など）が変化することを確認。
    - 予約フォームを表示させた状態で言語を切り替え、フォーム内のラベルが変化することを確認。
2.  **Reservation Flow**:
    - 予約フォームから送信。
    - チャットログに「〇月〇日 〇:00 〇名 〇〇様 で予約リクエスト」のようなユーザー発言が残ることを確認。
    - 完了メッセージが表示されることを確認。
3.  **Trigger Logic**:
    - "こんにちは" と話しかけ、予約フォームが出ないことを確認。
    - "予約したい" と話しかけ、予約フォームが出ることを確認。
4.  **Deployment**:
    - Vercelへデプロイし、本番環境で動作確認。
