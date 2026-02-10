-- FastLane Show System schema
create extension if not exists "pgcrypto";

create table if not exists dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists segments (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references dashboards(id) on delete cascade,
  title text not null default '',
  order_index int not null default 0,
  collapsed boolean not null default false,
  editor_content_html_or_json text not null default '<p></p>',
  presenter_settings_json jsonb not null default '{"fontSize":28,"scrollSpeed":20}'::jsonb
);

create table if not exists segment_audio (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references segments(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists library_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  order_index int not null default 0
);

create table if not exists library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references library_categories(id) on delete cascade,
  title text not null,
  content_html_or_json text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  status text not null default 'Available' check (status in ('Available', 'Archived')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  used_count int not null default 0
);

alter table dashboards enable row level security;
alter table segments enable row level security;
alter table segment_audio enable row level security;
alter table library_categories enable row level security;
alter table library_items enable row level security;

create policy "dashboards_owner_all" on dashboards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "segments_owner_all" on segments for all
using (
  exists(select 1 from dashboards d where d.id = segments.dashboard_id and d.user_id = auth.uid())
)
with check (
  exists(select 1 from dashboards d where d.id = segments.dashboard_id and d.user_id = auth.uid())
);

create policy "segment_audio_owner_all" on segment_audio for all
using (
  exists(
    select 1 from segments s join dashboards d on d.id = s.dashboard_id
    where s.id = segment_audio.segment_id and d.user_id = auth.uid()
  )
)
with check (
  exists(
    select 1 from segments s join dashboards d on d.id = s.dashboard_id
    where s.id = segment_audio.segment_id and d.user_id = auth.uid()
  )
);

create policy "library_categories_owner_all" on library_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "library_items_owner_all" on library_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('segment-audio', 'segment-audio', false)
on conflict (id) do nothing;

create policy "segment_audio_bucket_select_own" on storage.objects
for select to authenticated
using (bucket_id = 'segment-audio' and owner = auth.uid());

create policy "segment_audio_bucket_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'segment-audio' and owner = auth.uid());

create policy "segment_audio_bucket_update_own" on storage.objects
for update to authenticated
using (bucket_id = 'segment-audio' and owner = auth.uid())
with check (bucket_id = 'segment-audio' and owner = auth.uid());

create policy "segment_audio_bucket_delete_own" on storage.objects
for delete to authenticated
using (bucket_id = 'segment-audio' and owner = auth.uid());
