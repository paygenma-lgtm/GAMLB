create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table trees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  name text not null,
  description text,
  visibility text not null default 'private',
  created_at timestamptz not null default now()
);

create table persons (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  living_status text not null default 'unknown',
  privacy_status text not null default 'tree_members',
  created_at timestamptz not null default now()
);

create table person_names (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references persons(id) on delete cascade,
  given_name text,
  surname text,
  patronymic text,
  maiden_name text,
  language text,
  is_primary boolean not null default true
);

create table families (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  family_type text not null default 'partnership'
);

create table family_members (
  family_id uuid not null references families(id) on delete cascade,
  person_id uuid not null references persons(id) on delete cascade,
  role text not null,
  primary key (family_id, person_id, role)
);

create table places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text,
  latitude numeric,
  longitude numeric,
  historical_names jsonb not null default '[]'
);

create table events (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  person_id uuid references persons(id) on delete cascade,
  family_id uuid references families(id) on delete cascade,
  event_type text not null,
  date_original text,
  date_from date,
  date_to date,
  date_precision text not null default 'exact',
  place_id uuid references places(id),
  description text,
  confidence numeric check (confidence between 0 and 1)
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  title text not null,
  source_type text not null,
  repository text,
  author text,
  publication_date text,
  url text
);

create table citations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  person_id uuid references persons(id) on delete cascade,
  page text,
  record_number text,
  image_number text,
  transcription text,
  quote text,
  accessed_at timestamptz
);

create table relationships (\n  id uuid primary key default gen_random_uuid(),\n  tree_id uuid not null references trees(id) on delete cascade,\n  from_person_id uuid not null references persons(id) on delete cascade,\n  to_person_id uuid not null references persons(id) on delete cascade,\n  relation_type text not null,\n  created_at timestamptz not null default now(),\n  unique(tree_id, from_person_id, to_person_id, relation_type)\n);\n\ncreate table documents (\n  id uuid primary key default gen_random_uuid(),\n  tree_id uuid not null references trees(id) on delete cascade,\n  person_id uuid references persons(id) on delete set null,\n  original_name text not null,\n  stored_name text not null,\n  mime_type text not null,\n  size_bytes bigint not null,\n  storage_path text not null,\n  created_at timestamptz not null default now()\n);\n\ncreate table change_log (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  actor_id uuid not null references users(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
