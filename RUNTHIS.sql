-- ═══════════════════════════════════════════════════════════════
-- ID8 HUB — RUN THIS ONCE IN SUPABASE SQL EDITOR
-- Supabase → SQL Editor → New Query → Paste All → Run
-- ═══════════════════════════════════════════════════════════════

-- 1. BRANDS — fix RLS (this is why brand creation was broken)
alter table brands enable row level security;
drop policy if exists "Auth read brands"   on brands;
drop policy if exists "Auth insert brands" on brands;
drop policy if exists "Auth update brands" on brands;
drop policy if exists "Auth delete brands" on brands;
create policy "Auth read brands"   on brands for select using (auth.role() = 'authenticated');
create policy "Auth insert brands" on brands for insert with check (auth.role() = 'authenticated');
create policy "Auth update brands" on brands for update using (auth.role() = 'authenticated');
create policy "Auth delete brands" on brands for delete using (auth.role() = 'authenticated');

-- 2. USERS — add new columns
alter table users drop constraint if exists users_team_check;
alter table users add column if not exists agency_role text;
alter table users add column if not exists onboarding_complete bool default false;
alter table users add column if not exists is_admin bool default false;
update users set is_admin = true where email = 'kunal@id8.digital';

-- 3. BRIEFS — add new columns  
alter table briefs add column if not exists brief_type text;
alter table briefs add column if not exists assigned_teams text[];

-- 4. ADMIN CONFIG
create table if not exists admin_config (
  key text primary key, value jsonb not null, updated_at timestamptz default now()
);
insert into admin_config (key, value) values ('admin_emails', '["kunal@id8.digital"]') on conflict (key) do nothing;

-- 5. TASKS
create table if not exists tasks (
  id              uuid default gen_random_uuid() primary key,
  title           text not null,
  description     text,
  brand_id        uuid references brands(id) on delete cascade,
  brief_id        uuid references briefs(id) on delete set null,
  status          text default 'brief',
  created_by      uuid references users(id),
  assigned_to     uuid references users(id),
  assigned_team   text,
  priority        text default 'medium',
  due_date        date,
  drive_file_url  text,
  estimated_hours numeric(6,2),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 6. TASK COMMENTS
create table if not exists task_comments (
  id         uuid default gen_random_uuid() primary key,
  task_id    uuid references tasks(id) on delete cascade not null,
  user_id    uuid references users(id) on delete cascade not null,
  content    text not null,
  created_at timestamptz default now()
);

-- 7. TIME LOGS
create table if not exists time_logs (
  id               uuid default gen_random_uuid() primary key,
  task_id          uuid references tasks(id) on delete cascade not null,
  user_id          uuid references users(id) on delete cascade not null,
  brand_id         uuid references brands(id) on delete set null,
  started_at       timestamptz not null default now(),
  stopped_at       timestamptz,
  duration_seconds integer,
  note             text,
  log_date         date,
  log_month        text,
  created_at       timestamptz default now()
);
create unique index if not exists one_active_timer_per_user on time_logs (user_id) where stopped_at is null;

-- 8. NOTIFICATIONS
create table if not exists notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references users(id) on delete cascade not null,
  type       text not null,
  title      text not null,
  body       text,
  link_type  text,
  link_id    uuid,
  read       bool default false,
  created_at timestamptz default now()
);

-- 9. APPROVAL STEPS
create table if not exists approval_steps (
  id            uuid default gen_random_uuid() primary key,
  approval_id   uuid references approvals(id) on delete cascade not null,
  step_order    integer not null,
  step_name     text not null,
  assigned_to   uuid references users(id),
  assigned_role text,
  status        text default 'pending',
  actioned_by   uuid references users(id),
  actioned_at   timestamptz,
  note          text,
  created_at    timestamptz default now()
);

-- 10. BRIEF SECTIONS
create table if not exists brief_sections (
  id          uuid default gen_random_uuid() primary key,
  brief_id    uuid references briefs(id) on delete cascade not null,
  section_key text not null,
  content     text,
  sort_order  integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (brief_id, section_key)
);

-- 11. RLS POLICIES
alter table tasks           enable row level security;
alter table task_comments   enable row level security;
alter table time_logs       enable row level security;
alter table notifications   enable row level security;
alter table approval_steps  enable row level security;
alter table brief_sections  enable row level security;
alter table admin_config    enable row level security;

drop policy if exists "Auth read tasks"             on tasks;
drop policy if exists "Auth insert tasks"           on tasks;
drop policy if exists "Auth update tasks"           on tasks;
drop policy if exists "Auth read task_comments"     on task_comments;
drop policy if exists "Auth insert task_comments"   on task_comments;
drop policy if exists "Users see own time logs"     on time_logs;
drop policy if exists "Users insert time logs"      on time_logs;
drop policy if exists "Users update time logs"      on time_logs;
drop policy if exists "Users see own notifications" on notifications;
drop policy if exists "Auth insert notifications"   on notifications;
drop policy if exists "Users update notifications"  on notifications;
drop policy if exists "Auth read approval_steps"    on approval_steps;
drop policy if exists "Auth insert approval_steps"  on approval_steps;
drop policy if exists "Auth update approval_steps"  on approval_steps;
drop policy if exists "Auth read brief_sections"    on brief_sections;
drop policy if exists "Auth insert brief_sections"  on brief_sections;
drop policy if exists "Auth update brief_sections"  on brief_sections;
drop policy if exists "Auth read admin_config"      on admin_config;

create policy "Auth read tasks"             on tasks for select using (auth.role() = 'authenticated');
create policy "Auth insert tasks"           on tasks for insert with check (auth.role() = 'authenticated');
create policy "Auth update tasks"           on tasks for update using (auth.role() = 'authenticated');
create policy "Auth read task_comments"     on task_comments for select using (auth.role() = 'authenticated');
create policy "Auth insert task_comments"   on task_comments for insert with check (auth.role() = 'authenticated');
create policy "Users see own time logs"     on time_logs for select using (auth.role() = 'authenticated');
create policy "Users insert time logs"      on time_logs for insert with check (auth.role() = 'authenticated' and user_id = (select id from users where email = auth.jwt()->>'email'));
create policy "Users update time logs"      on time_logs for update using (auth.role() = 'authenticated');
create policy "Users see own notifications" on notifications for select using (auth.role() = 'authenticated' and user_id = (select id from users where email = auth.jwt()->>'email'));
create policy "Auth insert notifications"   on notifications for insert with check (auth.role() = 'authenticated');
create policy "Users update notifications"  on notifications for update using (auth.role() = 'authenticated' and user_id = (select id from users where email = auth.jwt()->>'email'));
create policy "Auth read approval_steps"    on approval_steps for select using (auth.role() = 'authenticated');
create policy "Auth insert approval_steps"  on approval_steps for insert with check (auth.role() = 'authenticated');
create policy "Auth update approval_steps"  on approval_steps for update using (auth.role() = 'authenticated');
create policy "Auth read brief_sections"    on brief_sections for select using (auth.role() = 'authenticated');
create policy "Auth insert brief_sections"  on brief_sections for insert with check (auth.role() = 'authenticated');
create policy "Auth update brief_sections"  on brief_sections for update using (auth.role() = 'authenticated');
create policy "Auth read admin_config"      on admin_config for select using (auth.role() = 'authenticated');

-- 12. TRIGGERS
create or replace function update_updated_at() returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks for each row execute function update_updated_at();

create or replace function fill_time_log_dates() returns trigger as $$ begin new.log_date := new.started_at::date; new.log_month := to_char(new.started_at, 'YYYY-MM'); return new; end; $$ language plpgsql;
drop trigger if exists fill_time_log_dates_trigger on time_logs;
create trigger fill_time_log_dates_trigger before insert on time_logs for each row execute function fill_time_log_dates();

create or replace function compute_time_log_duration() returns trigger as $$ begin if new.stopped_at is not null and old.stopped_at is null then new.duration_seconds := extract(epoch from (new.stopped_at - new.started_at))::integer; end if; return new; end; $$ language plpgsql;
drop trigger if exists time_log_duration_trigger on time_logs;
create trigger time_log_duration_trigger before update on time_logs for each row execute function compute_time_log_duration();

-- 13. MONTHLY HOURS VIEW
create or replace view monthly_hours_summary as
  select tl.user_id, u.name as user_name, u.agency_role, tl.log_month,
    count(*) as sessions, sum(tl.duration_seconds) as total_seconds,
    round(sum(tl.duration_seconds) / 3600.0, 2) as total_hours
  from time_logs tl join users u on u.id = tl.user_id
  where tl.stopped_at is not null
  group by tl.user_id, u.name, u.agency_role, tl.log_month;

-- ═══════════════════════════════════════════════════════════════
-- DONE. All tables, policies and triggers created.
-- Your existing data (brands, users, briefs) is untouched.
-- ═══════════════════════════════════════════════════════════════
