# 実装計画: 管理画面「予約次第で営業」追加

## 概要
管理画面の営業状態選択肢に「予約次第で営業 (on_demand)」を追加し、カレンダー上で識別できるようにします。

## 対象ファイル
- `public/admin.html`

## 変更内容
### `public/admin.html`
- **HTML**:
  - `select#edit-type` に `<option value="on_demand">予約次第で営業</option>` を追加。
- **CSS**:
  - `.status-on-demand` クラス定義を追加。色は「オレンジ」(#ffaa00) または「パープル」(#cc44ff) を採用 (limitedと区別するため #ffaa00 から変更を検討)。
    - Limitedが #ffaa00 なので、On Demand は #cc44ff (Purple) または #44ccff (Cyan) が良さそう。今回は #cc44ff (Purple) を仮定。
- **JavaScript**:
  - `getValidStatusClass(type)`: `on_demand` -> `status-on-demand` を返すよう修正。
  - `getStatusLabel(type)`: `on_demand` -> `予約次第` を返すよう修正。

## 検証計画
### 手動検証
1. 管理画面を開き、任意の日付をクリックしてモーダルを表示。
2. 「予約次第で営業」が選択できることを確認。
3. 保存後、カレンダー上でその日付が「予約次第」と表示され、指定した色になっていることを確認。

## 実行手順
1. `public/admin.html` 編集。
2. デプロイ。
