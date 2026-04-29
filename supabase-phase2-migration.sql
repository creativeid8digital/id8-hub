-- ═══════════════════════════════════════════════════════════════════
-- ID8 HUB — Phase 2 + Phase 3 Migration
-- Run this ONCE in: Supabase → SQL Editor → New Query → Run
-- Safe to run on existing database — uses IF NOT EXISTS everywhere
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. ADD COLUMNS TO USERS ─────────────────────────────────────────
alter table users drop constraint if exists users_team_check;

alter table users
  add column if not exists agency_role text check (agency_role in (
    'am','creative_head','creative_team','content_writer',
    'publishing_team','performance','tech'
  ));

alter table users
  add column if not exists onboarding_complete bool default false;

alter table users
  add column if not exists is_admin bool default false;

-- Set admin by email
update users set is_admin = true where email = 'kunal@id8.digital';

-- ── 2. ADD COLUMNS TO BRIEFS ────────────────────────────────────────
alter table briefs
  add column if not exists brief_type text check (brief_type in (
    'social_media','campaign','performance_ads','brand','content','tech_dev','event'
  ));

alter table briefs add column if not exists month_year text;
alter table briefs add column if not exists assigned_teams text[];

-- ── 3. ADMIN CONFIG TABLE ───────────────────────────────────────────
create table if not exists admin_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);

insert into admin_config (key, value)
  values ('admin_emails', '["kunal@id8.digital"]')
  on conflict (key) do nothing;

insert into admin_config (key, value)
  values ('role_modules', '{
    "am":              ["tasks","calendar","briefs","approvals","performance"],
    "creative_head":   ["tasks","calendar","briefs","approvals"],
    "creative_team":   ["tasks","calendar"],
    "content_writer":  ["calendar","briefs","tasks"],
    "publishing_team": ["calendar","tasks"],
    "performance":     ["tasks","performance"],
    "tech":            ["tasks","dev"]
  }')
  on conflict (key) do nothing;

-- ── 4. TASKS TABLE ──────────────────────────────────────────────────
create table if not exists tasks (
  id               uuid default gen_random_uuid() primary key,
  title            text not null,
  description      text,
  brand_id         uuid references brands(id) on delete cascade,
  campaign_id      uuid,
  brief_id         uuid references briefs(id) on delete set null,
  status           text check (status in (
    'brief','assigned','in_progress','submitted','in_review','approved','live'
  )) default 'brief',
  created_by       uuid references users(id),
  assigned_to      uuid references users(id),
  assigned_team    text check (assigned_team in (
    'am','creative_head','creative_team','content_writer',
    'publishing_team','performance','tech'
  )),
  priority         text check (priority in ('low','medium','high','urgent')) default 'medium',
  due_date         date,
  drive_file_url   text,
  estimated_hours  numeric(6,2),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── 5. TASK STATUS LOG ──────────────────────────────────────────────
create table if not exists task_status_log (
  id          uuid default gen_random_uuid() primary key,
  task_id     uuid references tasks(id) on delete cascade not null,
  from_status text,
  to_status   text not null,
  changed_by  uuid references users(id),
  note        text,
  changed_at  timestamptz default now()
);

-- ── 6. TASK COMMENTS ────────────────────────────────────────────────
create table if not exists task_comments (
  id         uuid default gen_random_uuid() primary key,
  task_id    uuid references tasks(id) on delete cascade not null,
  user_id    uuid references users(id) on delete cascade not null,
  content    text not null,
  created_at timestamptz default now()
);

-- ── 7. TIME LOGS ────────────────────────────────────────────────────
create table if not exists time_logs (
  id               uuid default gen_random_uuid() primary key,
  task_id          uuid references tasks(id) on delete cascade not null,
  user_id          uuid references users(id) on delete cascade not null,
  brand_id         uuid references brands(id) on delete set null,
  started_at       timestamptz not null default now(),
  stopped_at       timestamptz,
  duration_seconds integer,
  note             text,
  log_date         date generated always as (started_at::date) stored,
  log_month        text generated always as (to_char(started_at, 'YYYY-MM')) stored,
  created_at       timestamptz default now()
);

create unique index if not exists one_active_timer_per_user
  on time_logs (user_id) where stopped_at is null;

-- ── 8. NOTIFICATIONS ────────────────────────────────────────────────
create table if not exists notifications (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references users(id) on delete cascade not null,
  type        text check (type in (
    'task_assigned','status_changed','approval_needed','approved',
    'rejected','brief_created','comment','time_reminder','system'
  )) not null,
  title       text not null,
  body        text,
  link_type   text check (link_type in ('task','brief','campaign','approval')),
  link_id     uuid,
  read        bool default false,
  created_at  timestamptz default now()
);

create index if not exists notifications_user_unread
  on notifications (user_id, read) where read = false;

-- ── 9. APPROVAL STEPS ───────────────────────────────────────────────
create table if not exists approval_steps (
  id            uuid default gen_random_uuid() primary key,
  approval_id   uuid references approvals(id) on delete cascade not null,
  step_order    integer not null,
  step_name     text not null,
  assigned_to   uuid references users(id),
  assigned_role text check (assigned_role in (
    'am','creative_head','creative_team','content_writer',
    'publishing_team','performance','tech'
  )),
  status        text check (status in ('pending','in_review','approved','rejected')) default 'pending',
  actioned_by   uuid references users(id),
  actioned_at   timestamptz,
  note          text,
  created_at    timestamptz default now()
);

-- ── 10. BRIEF SECTIONS ──────────────────────────────────────────────
create table if not exists brief_sections (
  id          uuid default gen_random_uuid() primary key,
  brief_id    uuid references briefs(id) on delete cascade not null,
  section_key text not null check (section_key in (
    'objective','target_audience','key_message','deliverables','platforms',
    'tone','references','dos_donts','timeline','budget','notes'
  )),
  content     text,
  sort_order  integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (brief_id, section_key)
);

-- ── 11. RLS FOR ALL NEW TABLES ──────────────────────────────────────
alter table tasks           enable row level security;
alter table task_status_log enable row level security;
alter table task_comments   enable row level security;
alter table time_logs       enable row level security;
alter table notifications   enable row level security;
alter table approval_steps  enable row level security;
alter table brief_sections  enable row level security;
alter table admin_config    enable row level security;

-- Tasks
create policy "Auth read tasks"   on tasks for select using (auth.role() = 'authenticated');
drop policy if exists "Auth insert tasks" on tasks;
create policy "Auth insert tasks" on tasks for insert with check (auth.role() = 'authenticated');
drop policy if exists "Auth update tasks" on tasks;
create policy "Auth update tasks" on tasks for update using (auth.role() = 'authenticated');

-- Task status log
drop policy if exists "Auth read task_status_log" on task_status_log;
create policy "Auth read task_status_log" on task_status_log for select using (auth.role() = 'authenticated');

-- Task comments
create policy "Auth read task_comments"   on task_comments for select using (auth.role() = 'authenticated');
drop policy if exists "Auth insert task_comments" on task_comments;
create policy "Auth insert task_comments" on task_comments for insert with check (auth.role() = 'authenticated');

-- Time logs
drop policy if exists "Users see own time logs" on time_logs;
create policy "Users see own time logs" on time_logs for select using (
  auth.role() = 'authenticated' and (
    user_id = (select id from users where email = auth.jwt()->>'email')
    or (select is_admin from users where email = auth.jwt()->>'email') = true
  )
);
drop policy if exists "Users insert time logs" on time_logs;
create policy "Users insert time logs" on time_logs for insert with check (
  auth.role() = 'authenticated' and user_id = (select id from users where email = auth.jwt()->>'email')
);
drop policy if exists "Users update time logs" on time_logs;
create policy "Users update time logs" on time_logs for update using (
  auth.role() = 'authenticated' and user_id = (select id from users where email = auth.jwt()->>'email')
);

-- Notifications
create policy "Users see own notifications"   on notifications for select using (auth.role() = 'authenticated' and user_id = (select id from users where email = auth.jwt()->>'email'));
create policy "Auth insert notifications"     on notifications for insert with check (auth.role() = 'authenticated');
create policy "Users update notifications"    on notifications for update using (auth.role() = 'authenticated' and user_id = (select id from users where email = auth.jwt()->>'email'));

-- Approval steps
create policy "Auth read approval_steps"   on approval_steps for select using (auth.role() = 'authenticated');
drop policy if exists "Auth insert approval_steps" on approval_steps;
create policy "Auth insert approval_steps" on approval_steps for insert with check (auth.role() = 'authenticated');
drop policy if exists "Auth update approval_steps" on approval_steps;
create policy "Auth update approval_steps" on approval_steps for update using (auth.role() = 'authenticated');

-- Brief sections
create policy "Auth read brief_sections"   on brief_sections for select using (auth.role() = 'authenticated');
drop policy if exists "Auth insert brief_sections" on brief_sections;
create policy "Auth insert brief_sections" on brief_sections for insert with check (auth.role() = 'authenticated');
drop policy if exists "Auth update brief_sections" on brief_sections;
create policy "Auth update brief_sections" on brief_sections for update using (auth.role() = 'authenticated');

-- Admin config
create policy "Auth read admin_config"   on admin_config for select using (auth.role() = 'authenticated');
drop policy if exists "Admins update admin_config" on admin_config;
create policy "Admins update admin_config" on admin_config for update using ((select is_admin from users where email = auth.jwt()->>'email') = true);

-- ── 12. TRIGGERS ────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks for each row execute function update_updated_at();

drop trigger if exists brief_sections_updated_at on brief_sections;
create trigger brief_sections_updated_at before update on brief_sections for each row execute function update_updated_at();

-- Auto compute duration when timer stopped
create or replace function compute_time_log_duration()
returns trigger as $$
begin
  if new.stopped_at is not null and old.stopped_at is null then
    new.duration_seconds := extract(epoch from (new.stopped_at - new.started_at))::integer;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists time_log_duration_trigger on time_logs;
create trigger time_log_duration_trigger before update on time_logs for each row execute function compute_time_log_duration();

-- ── 13. VIEWS ───────────────────────────────────────────────────────
create or replace view monthly_hours_summary as
  select
    user_id,
    u.name as user_name,
    u.agency_role,
    log_month,
    count(*)                                 as sessions,
    sum(duration_seconds)                    as total_seconds,
    round(sum(duration_seconds) / 3600.0, 2) as total_hours
  from time_logs tl
  join users u on u.id = tl.user_id
  where stopped_at is not null
  group by user_id, u.name, u.agency_role, log_month
  order by log_month desc, total_hours desc;

-- ── DONE ────────────────────────────────────────────────────────────
-- All tables, RLS, triggers and views created.
-- Your existing data (brands, users, briefs etc) is untouched.
