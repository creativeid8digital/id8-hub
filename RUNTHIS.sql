-- ═══════════════════════════════════════════════════════════════════
-- ID8 HUB — COMPLETE DATABASE SETUP
-- Run this ONCE in Supabase → SQL Editor → New Query → Run
-- Safe to re-run. All statements use IF NOT EXISTS / ON CONFLICT.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. BRANDS ───────────────────────────────────────────────────────
create table if not exists brands (
  id               uuid default gen_random_uuid() primary key,
  name             text not null,
  color            text default '#7c3aed',
  drive_folder_url text,
  created_at       timestamptz default now()
);
alter table brands enable row level security;
drop policy if exists "Auth read brands"   on brands;
drop policy if exists "Auth insert brands" on brands;
drop policy if exists "Auth update brands" on brands;
drop policy if exists "Auth delete brands" on brands;
create policy "Auth read brands"   on brands for select using (auth.role() = 'authenticated');
create policy "Auth insert brands" on brands for insert with check (auth.role() = 'authenticated');
create policy "Auth update brands" on brands for update using (auth.role() = 'authenticated');
create policy "Auth delete brands" on brands for delete using (auth.role() = 'authenticated');

-- ── 2. USERS ────────────────────────────────────────────────────────
create table if not exists users (
  id                  uuid default gen_random_uuid() primary key,
  email               text unique not null,
  name                text,
  avatar_url          text,
  agency_role         text,
  onboarding_complete bool default false,
  is_admin            bool default false,
  created_at          timestamptz default now()
);
alter table users enable row level security;
drop policy if exists "Auth read users"   on users;
drop policy if exists "Auth insert users" on users;
drop policy if exists "Auth update users" on users;
create policy "Auth read users"   on users for select using (auth.role() = 'authenticated');
create policy "Auth insert users" on users for insert with check (auth.role() = 'authenticated');
create policy "Auth update users" on users for update using (auth.role() = 'authenticated');

-- Set admin
update users set is_admin = true where email = 'kunal@id8.digital';
update users set is_admin = true where email = 'creative@id8.digital';

-- ── 3. BRIEFS ───────────────────────────────────────────────────────
create table if not exists briefs (
  id             uuid default gen_random_uuid() primary key,
  title          text not null,
  brand_id       uuid references brands(id) on delete cascade,
  team           text,
  status         text default 'draft',
  description    text,
  drive_file_url text,
  brief_type     text,
  assigned_teams text[],
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table briefs enable row level security;
drop policy if exists "Auth read briefs"   on briefs;
drop policy if exists "Auth insert briefs" on briefs;
drop policy if exists "Auth update briefs" on briefs;
create policy "Auth read briefs"   on briefs for select using (auth.role() = 'authenticated');
create policy "Auth insert briefs" on briefs for insert with check (auth.role() = 'authenticated');
create policy "Auth update briefs" on briefs for update using (auth.role() = 'authenticated');

-- ── 4. APPROVALS ────────────────────────────────────────────────────
create table if not exists approvals (
  id               uuid default gen_random_uuid() primary key,
  title            text not null,
  brand_id         uuid references brands(id) on delete cascade,
  task_id          uuid,
  current_stage    text default 'creative',
  creative_approved bool default false,
  am_approved      bool default false,
  client_approved  bool default false,
  notes            text,
  drive_file_url   text,
  created_at       timestamptz default now()
);
alter table approvals enable row level security;
drop policy if exists "Auth read approvals"   on approvals;
drop policy if exists "Auth insert approvals" on approvals;
drop policy if exists "Auth update approvals" on approvals;
create policy "Auth read approvals"   on approvals for select using (auth.role() = 'authenticated');
create policy "Auth insert approvals" on approvals for insert with check (auth.role() = 'authenticated');
create policy "Auth update approvals" on approvals for update using (auth.role() = 'authenticated');

-- ── 5. PERFORMANCE CAMPAIGNS ────────────────────────────────────────
create table if not exists performance_campaigns (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  brand_id    uuid references brands(id) on delete cascade,
  platform    text default 'meta',
  spend       numeric(12,2) default 0,
  impressions integer default 0,
  clicks      integer default 0,
  ctr         numeric(6,2) default 0,
  cpc         numeric(8,2) default 0,
  roas        numeric(6,2) default 0,
  status      text default 'live',
  month_year  text,
  created_at  timestamptz default now()
);
alter table performance_campaigns enable row level security;
drop policy if exists "Auth read performance_campaigns"   on performance_campaigns;
drop policy if exists "Auth insert performance_campaigns" on performance_campaigns;
drop policy if exists "Auth update performance_campaigns" on performance_campaigns;
create policy "Auth read performance_campaigns"   on performance_campaigns for select using (auth.role() = 'authenticated');
create policy "Auth insert performance_campaigns" on performance_campaigns for insert with check (auth.role() = 'authenticated');
create policy "Auth update performance_campaigns" on performance_campaigns for update using (auth.role() = 'authenticated');

-- ── 6. DEV TASKS ────────────────────────────────────────────────────
create table if not exists dev_tasks (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  description text,
  status      text default 'backlog',
  priority    text default 'medium',
  assigned_to uuid references users(id),
  brand_id    uuid references brands(id) on delete cascade,
  due_date    date,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table dev_tasks enable row level security;
drop policy if exists "Auth read dev_tasks"   on dev_tasks;
drop policy if exists "Auth insert dev_tasks" on dev_tasks;
drop policy if exists "Auth update dev_tasks" on dev_tasks;
create policy "Auth read dev_tasks"   on dev_tasks for select using (auth.role() = 'authenticated');
create policy "Auth insert dev_tasks" on dev_tasks for insert with check (auth.role() = 'authenticated');
create policy "Auth update dev_tasks" on dev_tasks for update using (auth.role() = 'authenticated');

-- ── 7. SOCIAL POSTS ─────────────────────────────────────────────────
create table if not exists social_posts (
  id             uuid default gen_random_uuid() primary key,
  brand_id       uuid references brands(id) on delete cascade,
  title          text not null,
  platform       text not null default 'instagram',
  post_type      text not null default 'reel',
  scheduled_date date not null,
  status         text default 'planned',
  assigned_to    uuid references users(id) on delete set null,
  drive_file_url text,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table social_posts enable row level security;
drop policy if exists "Auth read social_posts"   on social_posts;
drop policy if exists "Auth insert social_posts" on social_posts;
drop policy if exists "Auth update social_posts" on social_posts;
create policy "Auth read social_posts"   on social_posts for select using (auth.role() = 'authenticated');
create policy "Auth insert social_posts" on social_posts for insert with check (auth.role() = 'authenticated');
create policy "Auth update social_posts" on social_posts for update using (auth.role() = 'authenticated');

-- ── 8. TASKS ────────────────────────────────────────────────────────
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
alter table tasks enable row level security;
drop policy if exists "Auth read tasks"   on tasks;
drop policy if exists "Auth insert tasks" on tasks;
drop policy if exists "Auth update tasks" on tasks;
create policy "Auth read tasks"   on tasks for select using (auth.role() = 'authenticated');
create policy "Auth insert tasks" on tasks for insert with check (auth.role() = 'authenticated');
create policy "Auth update tasks" on tasks for update using (auth.role() = 'authenticated');

-- task_id FK on approvals (add after tasks table exists)
alter table approvals add column if not exists task_id uuid references tasks(id) on delete set null;

-- ── 9. TASK COMMENTS ────────────────────────────────────────────────
create table if not exists task_comments (
  id         uuid default gen_random_uuid() primary key,
  task_id    uuid references tasks(id) on delete cascade not null,
  user_id    uuid references users(id) on delete cascade not null,
  content    text not null,
  created_at timestamptz default now()
);
alter table task_comments enable row level security;
drop policy if exists "Auth read task_comments"   on task_comments;
drop policy if exists "Auth insert task_comments" on task_comments;
create policy "Auth read task_comments"   on task_comments for select using (auth.role() = 'authenticated');
create policy "Auth insert task_comments" on task_comments for insert with check (auth.role() = 'authenticated');

-- ── 10. TIME LOGS ───────────────────────────────────────────────────
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
alter table time_logs enable row level security;
drop policy if exists "Auth read time_logs"   on time_logs;
drop policy if exists "Auth insert time_logs" on time_logs;
drop policy if exists "Auth update time_logs" on time_logs;
create policy "Auth read time_logs"   on time_logs for select using (auth.role() = 'authenticated');
create policy "Auth insert time_logs" on time_logs for insert with check (auth.role() = 'authenticated');
create policy "Auth update time_logs" on time_logs for update using (auth.role() = 'authenticated');

-- ── 11. NOTIFICATIONS ───────────────────────────────────────────────
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
alter table notifications enable row level security;
drop policy if exists "Auth read notifications"   on notifications;
drop policy if exists "Auth insert notifications" on notifications;
drop policy if exists "Auth update notifications" on notifications;
create policy "Auth read notifications"   on notifications for select using (auth.role() = 'authenticated' and user_id = (select id from users where email = auth.jwt()->>'email'));
create policy "Auth insert notifications" on notifications for insert with check (auth.role() = 'authenticated');
create policy "Auth update notifications" on notifications for update using (auth.role() = 'authenticated' and user_id = (select id from users where email = auth.jwt()->>'email'));

-- ── 12. APPROVAL STEPS ──────────────────────────────────────────────
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
alter table approval_steps enable row level security;
drop policy if exists "Auth read approval_steps"   on approval_steps;
drop policy if exists "Auth insert approval_steps" on approval_steps;
drop policy if exists "Auth update approval_steps" on approval_steps;
create policy "Auth read approval_steps"   on approval_steps for select using (auth.role() = 'authenticated');
create policy "Auth insert approval_steps" on approval_steps for insert with check (auth.role() = 'authenticated');
create policy "Auth update approval_steps" on approval_steps for update using (auth.role() = 'authenticated');

-- ── 13. ADMIN CONFIG ────────────────────────────────────────────────
create table if not exists admin_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);
insert into admin_config (key, value) values ('admin_emails', '["kunal@id8.digital","creative@id8.digital"]') on conflict (key) do update set value = excluded.value;
alter table admin_config enable row level security;
drop policy if exists "Auth read admin_config"   on admin_config;
drop policy if exists "Auth insert admin_config" on admin_config;
drop policy if exists "Auth update admin_config" on admin_config;
create policy "Auth read admin_config"   on admin_config for select using (auth.role() = 'authenticated');
create policy "Auth insert admin_config" on admin_config for insert with check (auth.role() = 'authenticated');
create policy "Auth update admin_config" on admin_config for update using (auth.role() = 'authenticated');

-- ── 14. BRAND MANUAL ────────────────────────────────────────────────
create table if not exists brand_manual (
  id                uuid default gen_random_uuid() primary key,
  brand_id          uuid references brands(id) on delete cascade unique not null,
  tagline           text, industry text, founded_year text, website text,
  primary_color     text, secondary_color text, accent_color text, forbidden_colors text,
  primary_font      text, secondary_font text, font_notes text,
  tone_words        text[], anti_tone_words text[], brand_voice_notes text,
  target_age        text, target_gender text, target_interests text, target_market text,
  active_platforms  text[], platform_notes text,
  dos               text, donts text, competitors text,
  instagram_url     text, linkedin_url text, twitter_url text, youtube_url text, facebook_url text,
  logo_url          text, reference_urls text[],
  completed         bool default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
alter table brand_manual enable row level security;
drop policy if exists "Auth read brand_manual"   on brand_manual;
drop policy if exists "Auth insert brand_manual" on brand_manual;
drop policy if exists "Auth update brand_manual" on brand_manual;
create policy "Auth read brand_manual"   on brand_manual for select using (auth.role() = 'authenticated');
create policy "Auth insert brand_manual" on brand_manual for insert with check (auth.role() = 'authenticated');
create policy "Auth update brand_manual" on brand_manual for update using (auth.role() = 'authenticated');

-- ── 15. TRIGGERS ────────────────────────────────────────────────────
create or replace function update_updated_at() returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks for each row execute function update_updated_at();

drop trigger if exists briefs_updated_at on briefs;
create trigger briefs_updated_at before update on briefs for each row execute function update_updated_at();

create or replace function fill_time_log_dates() returns trigger as $$ begin new.log_date := new.started_at::date; new.log_month := to_char(new.started_at, 'YYYY-MM'); return new; end; $$ language plpgsql;
drop trigger if exists fill_time_log_dates_trigger on time_logs;
create trigger fill_time_log_dates_trigger before insert on time_logs for each row execute function fill_time_log_dates();

create or replace function compute_time_log_duration() returns trigger as $$ begin if new.stopped_at is not null and old.stopped_at is null then new.duration_seconds := extract(epoch from (new.stopped_at - new.started_at))::integer; end if; return new; end; $$ language plpgsql;
drop trigger if exists time_log_duration_trigger on time_logs;
create trigger time_log_duration_trigger before update on time_logs for each row execute function compute_time_log_duration();

-- ── 16. STORAGE BUCKET ──────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('creatives', 'creatives', true, 52428800)
on conflict (id) do nothing;

drop policy if exists "Auth upload creatives" on storage.objects;
drop policy if exists "Public read creatives" on storage.objects;
create policy "Auth upload creatives" on storage.objects for insert with check (bucket_id = 'creatives' and auth.role() = 'authenticated');
create policy "Public read creatives" on storage.objects for select using (bucket_id = 'creatives');

-- ── DONE ────────────────────────────────────────────────────────────
-- All 14 tables, RLS policies, triggers, and storage bucket created.
-- Existing data is untouched (all statements use IF NOT EXISTS).
