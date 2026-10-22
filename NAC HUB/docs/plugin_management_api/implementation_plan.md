# 追加開発フェーズ9「プラグイン管理API化」実装計画 (実施済み)

## 1. 目的
Slack / Google Drive / NotePM / HotBiz の設定を会社単位で保存し、有効/無効・設定準備状況・設定確認結果を正直に表示する。外部サービスへの本接続は行わない。

## 2. 監査結果
- `plugin_configs`: id, company_id, plugin_name, is_active, config_json(JSON), last_tested_at。要件を自然に保存可能 → **migration不要**。
- 設定は `config_json.settings`、確認結果は `config_json.last_validation_result` に保存。
- 旧 `Plugins.tsx` はハードコードの緑チェック表示（偽の接続表示）だったため全面置換。

## 3. API (すべてJWT必須・管理者限定・会社スコープ)
| メソッド | パス | 内容 |
|---|---|---|
| GET | /api/v1/admin/plugins | 4プラグイン一覧（DB行なしでも表示） |
| GET | /api/v1/admin/plugins/{key} | 詳細 |
| PUT | /api/v1/admin/plugins/{key} | 非機密設定の保存 |
| POST | /api/v1/admin/plugins/{key}/validate | 設定確認（外部通信なし） |
| POST | /api/v1/admin/plugins/{key}/enable | 有効化（設定不足は400） |
| POST | /api/v1/admin/plugins/{key}/disable | 無効化 |

## 4. 構造
`app/services/plugins/`: `BasePluginAdapter`（validate_settings / evaluate_status / check_configuration / can_enable）と各provider、`registry.py`。将来は各providerへ実API呼び出しを追加可能。

## 5. 状態定義
not_configured=未設定 / configured=基本設定済み / needs_credentials=認証情報の準備が必要 / not_implemented=本接続は今後対応 / disabled=無効 / error=設定エラー / connected=接続済み（実通信確認時のみ・現在は未使用、connectedは常にfalse）。

## 6. 秘密情報
secret/token/password/key/credential等のキーはAPIで400拒否。UIにも秘密情報入力欄なし。

## 7. 監査ログ
「{サービス名}設定変更」「{サービス名}を有効化」「{サービス名}を無効化」「{サービス名}設定確認」。

## 8. 実施結果
新規20テスト＋既存7ファイル回帰 ALL PASS、tsc/build/lint PASS。**ステータス: 実装済み・手動E2E待ち**（正式バージョン・タグは未更新）。
