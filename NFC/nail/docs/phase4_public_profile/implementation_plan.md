# Phase 4 公開プロフィールのデザイン強化 実装計画

## 目標
公開プロフィール画面 (`/u/[handle]`) を刷新し、ユーザーが自分の好みに合わせてデザイン（テーマ）を選択できるようにする。
特に「おしゃれなUI」「ターゲット別デザイン（男性向け/女性向け）」を実現し、プレミアムな体験を提供する。

## User Review Required
> [!IMPORTANT]
> **テーマの種類について**
> 以下の4パターンを初期実装として提案します。追加や名称変更の希望があればお知らせください。
> 1.  **Standard**: シンプルでクリーン (デフォルト)
> 2.  **Dark**: モダンなダークモード (男性向け・テック系)
> 3.  **Elegant**: 柔らかい色使いと明朝体 (女性向け・エレガント)
> 4.  **Pop**: 鮮やかな色と丸文字 (カジュアル・女性/若年層向け)

## Proposed Changes

### Database
#### [MODIFY] [schema.prisma](file:///d:/Antigravity/data/NFC/nail/prisma/schema.prisma)
- `Profile` モデルに `theme` (String) フィールドを追加。デフォルトは `'STANDARD'`。

### Components
#### [MODIFY] [ProfileForm.tsx](file:///d:/Antigravity/data/NFC/nail/src/components/profile/ProfileForm.tsx)
- プロフィール編集画面に「テーマ選択」セクションを追加。
- ラジオボタンまたはカード形式でテーマを選べるようにする。

#### [NEW] `src/components/themes/`
- 各テーマのスタイル定義 (CSS Variables または Tailwind クラスのセット) を管理するコンポーネントまたは設定ファイルを作成。
- 例: `ThemeWrapper.tsx` を作成し、選ばれたテーマに応じて配色やフォントクラスを切り替える。

### Pages
#### [MODIFY] [src/app/u/[handle]/page.tsx](file:///d:/Antigravity/data/NFC/nail/src/app/u/[handle]/page.tsx)
- デザインを大幅に刷新。
- `ThemeWrapper` 等を使用して、ユーザー設定に基づいたデザインを適用。
- アバター、名前、Bio、リンクリストの表示コンポーネントを美しく作り直す。

## Verification Plan
### Automated Tests
- 不要（UIの変更が主であるため）

### Manual Verification
1.  **編集確認**: プロフィール編集画面で各テーマを選択し、保存できること。
2.  **表示確認**: PCおよびiPhoneで公開プロフィールにアクセスし、選択したテーマのデザインが正しく適用されていること。
3.  **デザイン確認**: 各テーマ（Elegant, Dark等）が意図した雰囲気（女性向け、男性向け等）になっているか目視確認。
