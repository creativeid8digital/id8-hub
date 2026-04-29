-- ═══════════════════════════════════════════════════
-- ID8 HUB — Supabase Database Schema
-- Run this entire file in: Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════

-- ── BRANDS (your clients) ───────────────────────────
create table brands (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text default '#7c3aed',
  drive_folder_url text,
  created_at timestamptz default now()
);

-- ── USERS ───────────────────────────────────────────
create table users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text,
  avatar_url text,
  team text check (team in ('creative','performance','content','social','account_managers','tech')),
  role text check (role in ('admin','member')) default 'member',
  created_at timestamptz default now()
);

-- ── CAMPAIGNS ───────────────────────────────────────
create table campaigns (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  brand_id uuid references brands(id) on delete cascade,
  status text check (status in ('todo','in_progress','review','done')) default 'todo',
  priority text check (priority in ('low','medium','high')) default 'medium',
  team text check (team in ('creative','performance','content','social','account_managers','tech')),
  due_date date,
  drive_folder_url text,
  description text,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── CAMPAIGN ASSIGNEES (many-to-many) ───────────────
create table campaign_assignees (
  campaign_id uuid references campaigns(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  primary key (campaign_id, user_id)
);

-- ── CAMPAIGN TAGS ───────────────────────────────────
create table campaign_tags (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns(id) on delete cascade,
  label text not null,
  color text default '#7c3aed'
);

-- ── SOCIAL CALENDAR POSTS ───────────────────────────
create table social_posts (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid references brands(id) on delete cascade,
  title text not null,
  platform text check (platform in ('instagram','twitter','linkedin','youtube','facebook','tiktok')),
  post_type text check (post_type in ('reel','carousel','story','static','thread','blog','newsletter')),
  scheduled_date date not null,
  status text check (status in ('planned','in_progress','review','approved','published')) default 'planned',
  assigned_to uuid references users(id),
  drive_file_url text,
  notes text,
  created_at timestamptz default now()
);

-- ── BRIEFS ──────────────────────────────────────────
create table briefs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  brand_id uuid references brands(id) on delete cascade,
  team text,
  status text check (status in ('not_started','in_progress','review','approved')) default 'not_started',
  due_date date,
  drive_file_url text,
  description text,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── APPROVALS ───────────────────────────────────────
create table approvals (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  brand_id uuid references brands(id) on delete cascade,
  campaign_id uuid references campaigns(id),
  current_stage text check (current_stage in ('creative','account_manager','client')) default 'creative',
  creative_approved bool default false,
  am_approved bool default false,
  client_approved bool default false,
  drive_file_url text,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── PERFORMANCE DATA ────────────────────────────────
create table performance_campaigns (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  brand_id uuid references brands(id) on delete cascade,
  platform text check (platform in ('meta','google','youtube','linkedin','twitter')),
  spend numeric(12,2) default 0,
  impressions bigint default 0,
  clicks bigint default 0,
  ctr numeric(5,2) default 0,
  cpc numeric(8,2) default 0,
  roas numeric(6,2) default 0,
  status text check (status in ('live','paused','ended','review')) default 'live',
  month_year text, -- e.g. '2026-05'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── DEV TASKS ───────────────────────────────────────
create table dev_tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  brand_id uuid references brands(id),
  sprint_name text,
  status text check (status in ('backlog','in_dev','qa','deployed')) default 'backlog',
  task_type text check (task_type in ('frontend','backend','qa','devops','design')),
  due_date date,
  assigned_to uuid references users(id),
  drive_file_url text,
  created_at timestamptz default now()
);

-- ── ROW LEVEL SECURITY (RLS) ────────────────────────
-- Means only logged-in users from your team can read/write data

alter table brands enable row level security;
alter table users enable row level security;
alter table campaigns enable row level security;
alter table campaign_assignees enable row level security;
alter table campaign_tags enable row level security;
alter table social_posts enable row level security;
alter table briefs enable row level security;
alter table approvals enable row level security;
alter table performance_campaigns enable row level security;
alter table dev_tasks enable row level security;

-- Allow authenticated users to read everything
create policy "Authenticated users can read brands" on brands for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read campaigns" on campaigns for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read social_posts" on social_posts for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read briefs" on briefs for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read approvals" on approvals for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read perf" on performance_campaigns for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read dev_tasks" on dev_tasks for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read users" on users for select using (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update/delete
create policy "Authenticated users can insert campaigns" on campaigns for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update campaigns" on campaigns for update using (auth.role() = 'authenticated');
create policy "Authenticated users can insert social_posts" on social_posts for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update social_posts" on social_posts for update using (auth.role() = 'authenticated');
create policy "Authenticated users can insert briefs" on briefs for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update briefs" on briefs for update using (auth.role() = 'authenticated');
create policy "Authenticated users can update approvals" on approvals for update using (auth.role() = 'authenticated');
create policy "Authenticated users can insert dev_tasks" on dev_tasks for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update dev_tasks" on dev_tasks for update using (auth.role() = 'authenticated');
create policy "Authenticated users can insert perf" on performance_campaigns for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update perf" on performance_campaigns for update using (auth.role() = 'authenticated');

-- ── SEED DATA (your actual brands) ──────────────────
insert into brands (name, color, drive_folder_url) values
  ('Nike India',   '#a855f7', null),
  ('Kotak Bank',   '#3b82f6', null),
  ('JSW Sports',   '#22c55e', null),
  ('Bidco Africa', '#f59e0b', null);

-- ── UPDATED_AT trigger ──────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger campaigns_updated_at before update on campaigns for each row execute function update_updated_at();
create trigger briefs_updated_at before update on briefs for each row execute function update_updated_at();
create trigger approvals_updated_at before update on approvals for each row execute function update_updated_at();
create trigger perf_updated_at before update on performance_campaigns for each row execute function update_updated_at();
