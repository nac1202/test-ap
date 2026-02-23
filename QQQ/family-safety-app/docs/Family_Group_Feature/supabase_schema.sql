-- 家族グループ機能のための Supabase スキーマ設計

-- 1. users テーブル (Supabase Auth との連携)
create table public.users (
  id uuid references auth.users not null primary key,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- users テーブルの Row Level Security (RLS) を有効化
alter table public.users enable row level security;
create policy "Users can view everyone" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- 2. family_groups テーブル
create table public.family_groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- family_groups の RLSは後ほどgroup_members作成後に定義します

-- 3. group_members テーブル (多対多の中間テーブル)
create table public.group_members (
  group_id uuid references public.family_groups on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  role text not null default 'member', -- 'admin' or 'member'
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (group_id, user_id)
);

-- group_members の RLS
alter table public.group_members enable row level security;
create policy "Members can view other members in their groups" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );

-- family_groups の RLS をここで定義 (group_members を参照するため)
alter table public.family_groups enable row level security;
-- 所属しているメンバーのみがグループ情報を閲覧できる
create policy "Members can view their groups" on public.family_groups
  for select using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = family_groups.id
      and group_members.user_id = auth.uid()
    )
  );

-- 4. safety_status テーブル (安否情報と位置情報)
create table public.safety_status (
  user_id uuid references public.users on delete cascade primary key,
  status text not null,
  message text,
  latitude double precision,
  longitude double precision,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- safety_status の RLS
alter table public.safety_status enable row level security;
-- 自分のステータスは更新・挿入できる
create policy "Users can update their own status" on public.safety_status
  for all using (auth.uid() = user_id);
-- 同じグループのメンバーのステータスを閲覧できる
create policy "Group members can view each others status" on public.safety_status
  for select using (
    exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
      and gm2.user_id = safety_status.user_id
    )
  );
