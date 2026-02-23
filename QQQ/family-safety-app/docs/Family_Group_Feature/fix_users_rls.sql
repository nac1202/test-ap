-- 既存のユーザーが自分のプロフィールデータを新規作成 (insert) できるようにするポリシーです
create policy "Users can insert own profile" on public.users 
for insert with check (auth.uid() = id);
