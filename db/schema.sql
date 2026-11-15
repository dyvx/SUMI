-- Animus — Postgres/Supabase schema
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)
-- This mirrors the local JSON store so deployment is a storage-adapter swap.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- identity
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  banner_url text,
  created_at timestamptz not null default now()
);

-- Single-owner guard: only the first account may exist.
create or replace function public.owner_only() returns trigger
language plpgsql security definer as $$
begin
  if (select count(*) from profiles) >= 1 then
    raise exception 'This is a private single-owner platform.';
  end if;
  return new;
end $$;

drop trigger if exists profiles_single_owner on profiles;
create trigger profiles_single_owner before insert on profiles
for each row execute function public.owner_only();

-- ---------------------------------------------------------------- catalog
create table if not exists categories (
  id text primary key,
  label text not null,
  kind text not null check (kind in ('comic','prose','vn'))
);

create table if not exists titles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  alt_titles text[] not null default '{}',
  category_id text not null references categories(id),
  description text,
  cover_url text,
  banner_url text,
  release_year int,
  status text not null default 'unknown'
    check (status in ('releasing','finished','hiatus','cancelled','unknown')),
  content_rating text,
  volume_count int,
  chapter_count int,
  original_language text,
  country_of_origin text,
  score numeric(4,1),
  popularity int,
  source_attribution text,
  license_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists genres (
  id serial primary key,
  name text unique not null,
  kind text not null default 'genre' check (kind in ('genre','theme','demographic'))
);

create table if not exists title_genres (
  title_id uuid references titles(id) on delete cascade,
  genre_id int references genres(id) on delete cascade,
  primary key (title_id, genre_id)
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('author','artist','publisher')),
  unique (name, role)
);

create table if not exists title_people (
  title_id uuid references titles(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  role text not null check (role in ('author','artist','publisher')),
  primary key (title_id, person_id, role)
);

-- External provider mappings. One title can map to many providers, but a given
-- provider row is unique — this is what prevents duplicate imports.
create table if not exists provider_mappings (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references titles(id) on delete cascade,
  provider text not null check (provider in ('anilist','mangadex','vndb','openlibrary','manual','comicvine')),
  provider_item_id text not null,
  raw_payload jsonb,
  last_synced_at timestamptz,
  unique (provider, provider_item_id)
);

-- ---------------------------------------------------------------- reading
create table if not exists volumes (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references titles(id) on delete cascade,
  number int not null,
  cover_url text,
  unique (title_id, number)
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references titles(id) on delete cascade,
  volume_id uuid references volumes(id) on delete set null,
  number numeric(8,2) not null,
  title text,
  page_count int,
  source_url text,
  storage_key text,          -- R2 key for authorized uploads
  published_at timestamptz,
  unique (title_id, number)
);

create table if not exists reading_sources (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references titles(id) on delete cascade,
  kind text not null check (kind in ('mangadex','upload','external','manual-text')),
  base_url text,
  language text default 'en',
  is_authorized boolean not null default false,
  license_note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- reader state
create table if not exists library_entries (
  user_id uuid not null references profiles(id) on delete cascade,
  title_id uuid not null references titles(id) on delete cascade,
  status text not null check (status in ('reading','completed','plan','on-hold','dropped','favorite')),
  added_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists reading_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  title_id uuid not null references titles(id) on delete cascade,
  chapter_number numeric(8,2) not null default 0,
  page int not null default 0,
  percent numeric(5,2) not null default 0 check (percent between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title_id uuid not null references titles(id) on delete cascade,
  chapter_id uuid references chapters(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists collection_items (
  collection_id uuid references collections(id) on delete cascade,
  title_id uuid references titles(id) on delete cascade,
  primary key (collection_id, title_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title_id uuid not null references titles(id) on delete cascade,
  rating int check (rating between 1 and 10),
  body text,
  has_spoilers boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, title_id)
);

create table if not exists site_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  homepage_sections text[] not null default '{}',
  reader_direction text not null default 'rtl' check (reader_direction in ('ltr','rtl')),
  novel_font_size int not null default 18,
  novel_theme text not null default 'dark' check (novel_theme in ('dark','sepia','light')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- ops
create table if not exists api_health_logs (
  id bigserial primary key,
  provider text not null,
  ok boolean not null,
  latency_ms int,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists sync_logs (
  id bigserial primary key,
  provider text not null,
  action text not null,
  item_count int,
  error text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- indexes
create index if not exists titles_category_idx on titles (category_id);
create index if not exists titles_popularity_idx on titles (popularity desc nulls last);
create index if not exists titles_score_idx on titles (score desc nulls last);
create index if not exists titles_title_trgm_idx on titles using gin (title gin_trgm_ops);
create index if not exists chapters_title_idx on chapters (title_id, number);
create index if not exists progress_updated_idx on reading_progress (user_id, updated_at desc);
create index if not exists health_provider_idx on api_health_logs (provider, created_at desc);
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------- RLS
alter table profiles          enable row level security;
alter table library_entries   enable row level security;
alter table reading_progress  enable row level security;
alter table bookmarks         enable row level security;
alter table collections       enable row level security;
alter table collection_items  enable row level security;
alter table reviews           enable row level security;
alter table site_settings     enable row level security;

-- Catalog is readable by the owner only (this is a private platform).
create policy owner_reads_profiles on profiles for select using (auth.uid() = id);
create policy owner_updates_profiles on profiles for update using (auth.uid() = id);

create policy owner_library on library_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy owner_progress on reading_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy owner_bookmarks on bookmarks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy owner_collections on collections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy owner_reviews on reviews for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy owner_settings on site_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Catalog tables: authenticated owner may read/write; anonymous has no access.
do $$
declare t text;
begin
  foreach t in array array['titles','categories','genres','title_genres','people','title_people',
                            'provider_mappings','volumes','chapters','reading_sources','api_health_logs','sync_logs']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists owner_all on %I', t);
    execute format('create policy owner_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

insert into categories (id, label, kind) values
  ('manga','Manga','comic'), ('manhwa','Manhwa','comic'), ('manhua','Manhua','comic'),
  ('webtoon','Webtoons','comic'), ('light-novel','Light Novels','prose'),
  ('web-novel','Web Novels','prose'), ('visual-novel','Visual Novels','vn'),
  ('doujinshi','Doujinshi','comic'), ('comic','Comics','comic'),
  ('graphic-novel','Graphic Novels','comic'), ('wuxia','Wuxia / Xianxia','prose'),
  ('one-shot','One-shots','comic')
on conflict (id) do nothing;
