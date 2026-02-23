# 家族グループ機能 Walkthrough

## 進捗（2026/02/22）

### Supabase認証機能の実装・修正
1.  **データベース構築**
    *   Supabaseに `users`, `family_groups`, `group_members`, `safety_status` テーブルを作成。
    *   Row Level Security (RLS) を設定し、安全なアクセス制御を実装。
    *   ユーザー登録時に自動で `users` テーブルへレコードを作成するトリガーを設定。

2.  **認証方法の変更 (Magic Link -> Password)**
    *   Supabaseの無料枠によるEmail送信制限（1時間あたり数件）を回避するため、マジックリンク方式から「メールアドレス＆パスワード」方式の認証に切り替えました (`src/app/login/page.tsx`)。

3.  **テスト用ダミー（DevMode）の導入**
    *   パスワード認証においてもサインアップ時の「Email制限(HTTP 429)」に短期間で到達してしまう問題が発生。
    *   開発を止めないための回避策として、**テスト専用アカウント (`test@test.com` / `testtest`)** を打った場合のみ、Supabaseとの通信をバイパスして疑似的にログイン状態を作る「DevMode」を実装しました。
    *   このDevModeは `AuthProvider.tsx` および `profile/page.tsx` においても、実際のデータベースへ読み書きをせずに正常動作をしているように振る舞うよう対応済みです。

### 次回のステップ
認証の壁はローカルモックで突破したため、実機能の実装に入ります。
1.  【UI作成】家族グループを作成する画面
2.  【機能】作成したグループをAPI(Supabase)経由でGroupsテーブルへInsertし、作成者をGroupMembersに登録する
3.  【機能】グループへの招待リンク（一意のURL・コード）の発行処理
