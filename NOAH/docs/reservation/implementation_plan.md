# 実装計画: LIFF連携 予約システム導入

## 概要
LINE (LIFF) と連携した、顧客用予約システムを構築します。1ヶ月分のスケジュール表示、残席数管理、予約フォームの実装を含みます。

## 要件
1.  **予約システム**: 顧客がWeb/LINEから予約可能にする。
2.  **スケジュール表示**: 「1週間」から「1ヶ月先」まで表示を拡張。
3.  **予約ボタン**: 各日程に予約ボタンを設置。
4.  **座席・条件**:
    *   カウンター: 5席 (MAX)
    *   ボックス: 6席 (MAX, 最低利用2名〜)
5.  **残席表示**: スケジュールタグ内に残席数を表示 (例: `C:3 / B:5`)。
6.  **LIFF連携**: LINEアプリ内ブラウザでの動作を最適化。

## 設計

### 1. データモデル (`api/index.js` / `status.json`)
各日付スケジュールに予約詳細を追加。
```javascript
"YYYY-MM-DD": {
  // ...既存...
  reservations: [
    { id: string, name: string, type: 'counter'|'box', count: number, time: 'HH:mm', contact: string, lineUserId: string }
  ]
}
```
※ `count` (合計) は動的に算出、または `seatsUsed` プロパティを追加して管理。

### 2. API (`api/index.js`)
*   **`POST /api/reserve` (新規作成)**
    *   パラメータ: `{ date, name, type, count, time, contact, lineUserId }`
    *   バリデーション:
        *   ボックス席は `count >= 2`
        *   満席チェック: `current + count <= MAX`
    *   処理: データを更新し、KV/Fileに保存。

### 3. フロントエンド (`public/index.html`)
*   **LIFF SDK**: `<script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>` を追加。
*   **スケジュール表示**:
    *   30日分の表示に変更 (`renderMonthlySchedule`)。
    *   各カードに「予約」ボタンを追加。
    *   残席表示 (`Counter: X left`)。
*   **予約フォーム**:
    *   モーダルウィンドウで入力。
    *   `liff.init()` -> `liff.getProfile()` で名前取得。
    *   「送信」ボタンで `/api/reserve` 呼び出し。

### 4. 管理画面 (`public/admin.html`)
*   予約一覧の表示 (既存の日付詳細モーダル内にリスト表示)。
*   予約削除機能 (キャンセル対応)。

## 手順
1.  **バックアップ**: 現在の `api/index.js`, `public/index.html` を確認・退避。
2.  **API実装**: `api/index.js` に `reservations` ロジックと `POST /api/reserve` を追加。
3.  **フロントエンド実装**:
    *   LIFF SDK導入。
    *   スケジュール表示ロジック変更 (30日分、残席表示)。
    *   予約モーダル実装。
    *   予約送信処理。
4.  **管理画面更新**: 予約状況の確認・編集機能追加。
5.  **デプロイ & 検証**。

## 懸念点
*   **LIFF ID**: ユーザーに後で設定してもらうため、初期値は空またはダミーにする。
