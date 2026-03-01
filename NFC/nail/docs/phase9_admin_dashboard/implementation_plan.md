# Phase 9: Admin Dashboard Implementation Plan

## Goal
現在の「タグ書き込み専用」の管理画面から、「顧客管理ができ、そこからタグも書ける」総合ダッシュボードへ進化させる。

## Proposed Changes

### 1. File Structure
`/admin` 配下のルートを再構成します。

```
src/app/admin/
├── layout.tsx       # [NEW] Admin共通レイアウト（サイドバー等）
├── page.tsx         # [MODIFY] ダッシュボードTOP（顧客一覧を表示）
├── tags/            # [MOVE] 既存のタグ書き込み機能
│   └── page.tsx
└── users/           # [NEW] 将来的な詳細画面用（今回は一覧をTOPにするか検討）
```

### 2. UI Components
既存のTailwindに加え、一覧表示を見やすくするために **Table** コンポーネントを使用。
- 検索バー: `handle` や `display name` でフィルタリング
- テーブル:
    - Icon (Avatar)
    - Name / Handle
    - Theme (現在の設定テーマ)
    - Actions (Edit, Write NFC, Delete)

### 3. Server Actions
- `src/actions/admin.ts`: ユーザー一覧取得、削除などの管理者用アクションを追加。

## Step-by-Step Implementation
1.  **Layout**: 管理画面らしい左サイドメニュー（Users, Settings etc.）を持つレイアウトを作成。
2.  **Server Action**: `getAllProfiles()` を実装。
3.  **User List UI**: `prisma.user.findMany` で取得したデータをテーブル表示。
4.  **Integration**: 既存の `ProfileForm` や `TagWriter` への導線を設置。

## Verification Plan
- `/admin` にアクセスし、登録済みユーザーが一覧表示されること。
- ユーザーを追加（既存フロー）した後、一覧に即座に反映されること。
- 一覧から「編集」をクリックして編集画面に遷移できること。
