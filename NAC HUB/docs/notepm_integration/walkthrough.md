# 追加開発フェーズ12 ウォークスルー

ステータス：追加開発フェーズ12 完了（Version 1.11.0・タグ v1.11-notepm-integration・手動E2E PASS）

## 実装内容
1. v1.10.0バックアップ（`D:\Antigravity\backups\NAC_HUB_v1.10.0\`：DBダンプ／ソースzip／マニフェスト）。
2. `.env.integrations` を backend のみに読み込ませる配線（required:false）。Git・Docker build contextから除外。
3. NotePM Client：HTTPS・`*.notepm.jp` のみ。localhost／IP直指定／外部URLは拒否。
4. プラグイン管理の「設定確認」をNotePMのみ実API（`GET /user/account`）へ昇格。
5. ノート一覧（`GET /notes`）と、管理者による「NAC HUBから参照を許可するノート」選択（最大10）。
6. 許可ノート内のみ `GET /pages` で検索。アーカイブ除外・件数／文字数上限あり。
7. なっくんはNotePM検索意図のある質問のみ検索。参照チップはタイトルのみ（URL形式未確認のためリンクなし）。
8. 監査ログ：接続確認／参照対象ノート変更（ノート名のみ）／有効化・無効化。

## 手動E2E確認手順
1. プラグイン管理 → NotePM のチームドメインを保存 → 有効化。
2. 「設定確認」で「接続済み」と最終確認日時が表示される。
3. 「参照ノート設定」で、全社員へ公開してよいノートのみを選択して保存。
4. なっくんで「NotePMから○○を探して」と質問し、参照チップとモード表示を確認。
5. ノート未選択時は「参照可能なノートがまだ設定されていません」と回答されること。
6. 一般質問ではNotePMが検索されないこと。

## 注意
- ノートを選択するまでNotePM本文検索は始まらない。
- トークンの値は画面・API・ログのいずれにも出ない。


## 追記：NotePM本文・タイトルの表示用正規化
- AIへ渡す前の表示用コピーのみ正規化（
ormalize_display_text）。NotePM原文・DBは変更しない。
- 除去：**太字** / __ / ~~ / 見出し# / コードフェンス / :mag: 等の絵文字コード / ---- 等の連続記号 / 過剰な改行。
- 保持：URL（[表示](URL) は「表示 (URL)」）、コード本文、時刻、snake_case、検索語。
- 参照チップのタイトルにも同様に適用。テスト34を追加。


## 完了記録（Version 1.11.0）
- NotePM実API接続（GET /user/account）・読み取り専用認証（read_flag確認／write_flag警告）
- ノート一覧取得（GET /notes）・参照対象ホワイトリスト・許可ノート限定ページ検索
- なっくん実検索・参照チップ（タイトルのみ）・表示用正規化（原文は不変）
- 秘密情報非露出・全自動テスト（12ファイル×2回）PASS・ユーザー手動E2E PASS

## 残存未実装（次フェーズ以降）
- Google Drive実API接続／Slack実API接続／HotBiz実接続／社内情報横断検索
- projects.company_id追加／会社用OpenAI Projectへの切替／秘密情報の管理画面・安全な保管機構
- ストリーミング回答／LLM意図判定・Function Calling／履歴への参照元・モード保存／NotePMページURLのリンク化
