create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists trees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  name text not null,
  description text,
  visibility text not null default 'private',
  created_at timestamptz not null default now()
);

create table if not exists persons (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  living_status text not null default 'unknown',
  privacy_status text not null default 'tree_members',
  created_at timestamptz not null default now()
);

create table if not exists person_names (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references persons(id) on delete cascade,
  given_name text,
  surname text,
  patronymic text,
  maiden_name text,
  language text,
  is_primary boolean not null default true
);

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  family_type text not null default 'partnership'
);

create table if not exists family_members (
  family_id uuid not null references families(id) on delete cascade,
  person_id uuid not null references persons(id) on delete cascade,
  role text not null,
  primary key (family_id, person_id, role)
);

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text,
  latitude numeric,
  longitude numeric,
  historical_names jsonb not null default '[]'
);

create table if not exists events (
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

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  title text not null,
  source_type text not null,
  repository text,
  author text,
  publication_date text,
  url text
);

create table if not exists citations (
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

create table if not exists relationships (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  from_person_id uuid not null references persons(id) on delete cascade,
  to_person_id uuid not null references persons(id) on delete cascade,
  relation_type text not null,
  created_at timestamptz not null default now(),
  unique(tree_id, from_person_id, to_person_id, relation_type)
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  person_id uuid references persons(id) on delete set null,
  original_name text not null,
  stored_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists change_log (
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

-- PLANS SYSTEM
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric not null check (price >= 0),
  currency text not null default 'EUR',
  max_people int,
  max_trees int,
  max_sources int,
  features jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_id text,
  created_at timestamptz not null default now(),
  unique(user_id, plan_id)
);

-- Insert default plans if not exist
insert into plans (name, price, currency, max_people, max_trees, max_sources, features, is_active)
values
  ('Тариф 1', 0, 'EUR', 100, 1, 10, '["forum", "search"]'::jsonb, true),
  ('Тариф 2', 59, 'EUR', 500, 5, 50, '["forum", "search", "archive", "export"]'::jsonb, true),
  ('Тариф 3', 99, 'EUR', null, null, null, '["forum", "search", "archive", "export", "dna", "unlimited"]'::jsonb, true)
on conflict (name) do nothing;

-- Create indexes
create index if not exists idx_user_plans_user_id on user_plans(user_id);
create index if not exists idx_user_plans_status on user_plans(status);
create index if not exists idx_plans_is_active on plans(is_active);
