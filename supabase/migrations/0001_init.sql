-- ==============================================================================
-- 0001_init.sql — Schema, RLS, & Storage for Walex Portfolio v2
-- PRD Bagian 9 (Postgres / Supabase)
-- ==============================================================================

-- 1. ADMIN USERS & IS_ADMIN HELPER
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function is_admin() 
returns boolean 
language sql 
stable 
security definer 
set search_path = public
as $$ 
  select exists (
    select 1 from admin_users where user_id = auth.uid()
  );
$$;

-- 2. MEDIA TABLE
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  url text not null,
  alt text not null default '',
  width int,
  height int,
  created_at timestamptz default now()
);

-- 3. PROJECTS (KARYA)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  category text,
  description text,
  features text[] default '{}',
  stack text[] default '{}',
  links jsonb default '{}',
  cover_media uuid references media(id) on delete set null,
  featured boolean default false,
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. JOBS / PENGALAMAN (RECENT JOBS)
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  org text not null,
  location text,
  start_date date,
  end_date date,
  is_current boolean default false,
  description text,
  highlights text[] default '{}',
  logo_media uuid references media(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order int default 0,
  updated_at timestamptz default now()
);

-- 5. EVENT CATEGORIES & EVENTS (GALERI EVENT)
create table if not exists event_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  sort_order int default 0
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category_id uuid references event_categories(id) on delete set null,
  event_date date,
  role text,
  camera text,
  description text,
  cover_media uuid references media(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order int default 0,
  updated_at timestamptz default now()
);

create table if not exists event_media (
  event_id uuid references events(id) on delete cascade,
  media_id uuid references media(id) on delete cascade,
  sort_order int default 0,
  primary key (event_id, media_id)
);

-- 6. CUSTOM PAGES (PAGE BUILDER)
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  blocks jsonb not null default '[]',
  seo jsonb default '{}',
  show_in_nav boolean default false,
  nav_order int default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  updated_at timestamptz default now()
);

-- 7. SITE SETTINGS
create table if not exists site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'
);

-- Ensure singleton default row exists
insert into site_settings (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;


-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
alter table admin_users enable row level security;
alter table media enable row level security;
alter table projects enable row level security;
alter table jobs enable row level security;
alter table event_categories enable row level security;
alter table events enable row level security;
alter table event_media enable row level security;
alter table pages enable row level security;
alter table site_settings enable row level security;

-- Drop old policies if any exist
drop policy if exists "Admin users can view admin_users" on admin_users;
drop policy if exists "Admin users can manage admin_users" on admin_users;

drop policy if exists "Public can view media" on media;
drop policy if exists "Admin can manage media" on media;

drop policy if exists "Public can read published projects" on projects;
drop policy if exists "Admin can manage projects" on projects;

drop policy if exists "Public can read published jobs" on jobs;
drop policy if exists "Admin can manage jobs" on jobs;

drop policy if exists "Public can read event categories" on event_categories;
drop policy if exists "Admin can manage event categories" on event_categories;

drop policy if exists "Public can read published events" on events;
drop policy if exists "Admin can manage events" on events;

drop policy if exists "Public can read published event media" on event_media;
drop policy if exists "Admin can manage event media" on event_media;

drop policy if exists "Public can read published pages" on pages;
drop policy if exists "Admin can manage pages" on pages;

drop policy if exists "Public can read site settings" on site_settings;
drop policy if exists "Admin can manage site settings" on site_settings;

-- 8.1 admin_users
create policy "Admin users can view admin_users"
  on admin_users for select
  using (auth.uid() = user_id or is_admin());

create policy "Admin users can manage admin_users"
  on admin_users for all
  using (is_admin())
  with check (is_admin());

-- 8.2 media
create policy "Public can view media"
  on media for select
  using (true);

create policy "Admin can manage media"
  on media for all
  using (is_admin())
  with check (is_admin());

-- 8.3 projects
create policy "Public can read published projects"
  on projects for select
  using (status = 'published' or is_admin());

create policy "Admin can manage projects"
  on projects for all
  using (is_admin())
  with check (is_admin());

-- 8.4 jobs
create policy "Public can read published jobs"
  on jobs for select
  using (status = 'published' or is_admin());

create policy "Admin can manage jobs"
  on jobs for all
  using (is_admin())
  with check (is_admin());

-- 8.5 event_categories
create policy "Public can read event categories"
  on event_categories for select
  using (true);

create policy "Admin can manage event categories"
  on event_categories for all
  using (is_admin())
  with check (is_admin());

-- 8.6 events
create policy "Public can read published events"
  on events for select
  using (status = 'published' or is_admin());

create policy "Admin can manage events"
  on events for all
  using (is_admin())
  with check (is_admin());

-- 8.7 event_media
create policy "Public can read published event media"
  on event_media for select
  using (
    exists (
      select 1 from events
      where events.id = event_media.event_id
        and (events.status = 'published' or is_admin())
    )
  );

create policy "Admin can manage event media"
  on event_media for all
  using (is_admin())
  with check (is_admin());

-- 8.8 pages
create policy "Public can read published pages"
  on pages for select
  using (status = 'published' or is_admin());

create policy "Admin can manage pages"
  on pages for all
  using (is_admin())
  with check (is_admin());

-- 8.9 site_settings
create policy "Public can read site settings"
  on site_settings for select
  using (true);

create policy "Admin can manage site settings"
  on site_settings for all
  using (is_admin())
  with check (is_admin());


-- ==============================================================================
-- 9. STORAGE BUCKET: portfolio-media
-- ==============================================================================

-- Create bucket 'portfolio-media' with public read & 2MB image constraint
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  2097152, -- 2MB in bytes
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/avif'];

-- Storage Policies
drop policy if exists "Public Access portfolio-media" on storage.objects;
drop policy if exists "Admin Upload portfolio-media" on storage.objects;
drop policy if exists "Admin Update portfolio-media" on storage.objects;
drop policy if exists "Admin Delete portfolio-media" on storage.objects;

create policy "Public Access portfolio-media"
  on storage.objects for select
  using (bucket_id = 'portfolio-media');

create policy "Admin Upload portfolio-media"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-media' and is_admin()
  );

create policy "Admin Update portfolio-media"
  on storage.objects for update
  using (
    bucket_id = 'portfolio-media' and is_admin()
  );

create policy "Admin Delete portfolio-media"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio-media' and is_admin()
  );
