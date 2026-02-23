-- Create the push_subscriptions table
create table public.push_subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    endpoint text not null unique,
    auth text not null,
    p256dh text not null,
    earthquake boolean default true,
    regional_warning boolean default true,
    heavy_rain boolean default true,
    weather boolean default true,
    major_tsunami boolean default true,
    tsunami boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.push_subscriptions enable row level security;

-- Policies
create policy "Users can view their own subscriptions"
    on public.push_subscriptions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions"
    on public.push_subscriptions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions"
    on public.push_subscriptions for update
    using (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
    on public.push_subscriptions for delete
    using (auth.uid() = user_id);

-- Optional: Allow anonymous subscriptions if you want to support users without accounts
-- To do this, you might need a different identifier (like a device/browser ID or just rely on the endpoint being unique).
-- For now, we allow anon insert and update based on the unique endpoint to support non-logged-in users.
create policy "Anon can insert subscriptions"
    on public.push_subscriptions for insert
    with check (true);

create policy "Anon can view their subscription by endpoint"
    on public.push_subscriptions for select
    using (true);

create policy "Anon can update their subscription by endpoint"
    on public.push_subscriptions for update
    using (true);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger handle_push_subscriptions_updated_at
    before update on public.push_subscriptions
    for each row
    execute function public.handle_updated_at();
