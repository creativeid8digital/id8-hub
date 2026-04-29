-- Run this in Supabase SQL Editor
create table if not exists task_comments (
  id         uuid default gen_random_uuid() primary key,
  task_id    uuid references tasks(id) on delete cascade not null,
  user_id    uuid references users(id) on delete cascade not null,
  content    text not null,
  created_at timestamptz default now()
);

alter table task_comments enable row level security;

create policy "Auth users read task_comments"
  on task_comments for select using (auth.role() = 'authenticated');

create policy "Auth users insert task_comments"
  on task_comments for insert with check (auth.role() = 'authenticated');
