# Step 3 実装計画 (Implementation Plan) - 知識取り込み基盤

ご提示いただいた詳細な「Step 3の目的と要件」に基づき、以下の技術スタックとアルゴリズムで知識取り込み基盤を実装します。本計画にご承認をいただいた後、コードの実装（Step 3）を開始します。

## 1. データ構造 (Pydanticスキーマ)
今回はDB層の実装は行わず、インメモリの Repository インターフェースと Pydantic スキーマを用いて永続化層をモックします（DB永続化は後続Stepにて対応）。
- **`KnowledgeSource`**: 原本メタデータ（`rights_status`, `version`, `content_hash` 等）
- **`KnowledgeDocument`**: 正規化済みテキストデータ
- **`KnowledgeChunk`**: 意味単位に分割された検索用データ（`page_start/end`, `heading_path`, `timestamp_start/end` 等）

## 2. 権利状態と利用可否判定
`Enum` にて `RightsStatus` を定義し、以下のプロパティを `KnowledgeSource` スキーマに実装します。
- `is_eligible_for_production_rag`: `rights_status == permission_confirmed` かつ `is_enabled == True` の場合にのみ `True` を返す判定関数。

## 3. パーサーの抽象化と実装
共通インターフェース `KnowledgeParser` (ABC) を定義し、以下の実装を作成します。
- **`TextParser` / `MarkdownParser`**: UTF-8正規化、`[Page: X]` の検証付き抽出、Markdown見出し階層のパース。
- **`DocxParser`**: `python-docx` を利用。見出しスタイル（Heading 1, 2等）、通常段落、箇条書き、表（Markdownの表形式に変換）を抽出。画像等は無視し `parsing_warnings` に記録。
- **`VttParser` / `SrtParser`**: `webvtt-py` 等または正規表現を用いてタイムスタンプと発話を抽出。話題の切れ目（例: 2秒以上の無音区間、句点での文末、最大3分）を考慮してブロック化。

## 4. トークン計測とチャンク化アルゴリズム
- **トークン計測方式**: LLMに依存しない「文字数ベースの擬似トークン計算（日本語は1文字≒1トークン、英単語は1単語≒1トークン）」、または汎用的な `tiktoken` (cl100k_base) のどちらかを初期採用します。（今回はLLM非依存の要求を尊重し、デフォルトで文字数ベースの推定器を使用可能な設計とします）。
- **チャンク化**: 見出し・段落・箇条書き・表・動画ブロックの意味単位で分割。`max_tokens` 超過時は句点での再分割。`min_tokens` 未満の場合は次のチャンクに結合。
- **オーバーラップ**: チャンク境界の文を重複させますが、メタデータ `metadata_json` 内にオーバーラップ部分の文字オフセットを記録し、検索結果表示時に重複を排除可能にします。

## 5. ページ情報と見出しの保持
- **ページタグ**: `\[Page:\s*(\d+)\]` の正規表現でパース。逆転や不連続を検知して `parsing_warnings` に追加。推測が必要な場合は `is_page_guessed: true` をメタデータに付与。
- **見出し階層**: パース時に現在の見出しスタックを保持し、チャンク化時に各チャンクへ `heading_path` のリストとして付与。

## 6. テキスト正規化とセキュリティ
- **正規化**: `unicodedata.normalize("NFC", text)` をベースとし、全角英数などは破壊せず維持。不要な制御文字の除去、CRLF->LFの統一。
- **セキュリティ**: アップロードファイルはUUID名で保存。サイズ上限（例: DOCXは展開後チェック）、パストラバーサル防止（`os.path.basename`の適用と許可ディレクトリ外へのアクセス禁止）。マクロ実行や外部URLの解決は行いません。

## 7. 重複検出とバージョン管理
- **重複検出**: 原本のハッシュ（SHA-256）と、正規化テキストのハッシュで判定。
  - 完全一致 → `duplicate` または `unique`
  - メタデータ（ページや出典）のみ変更 → `new_version`
- **バージョン管理**: 新バージョン登録時は旧バージョンの `is_current` を `False` にし、`previous_version_id` をリンクさせます。

## 8. 実施予定のテスト
- 指定された全ケース（Markdown異常系、DOCX画像無視、VTTタイムスタンプ逆転、重複登録判定など）に対する pytest を実装します。

> [!IMPORTANT]
> ご提示いただいた要件を網羅した上記の方針で設計を進めます。問題がないかご確認いただけますでしょうか。承認後、直ちに実装とテストを開始いたします。
