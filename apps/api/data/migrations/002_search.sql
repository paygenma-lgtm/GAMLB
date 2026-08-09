-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Full-text search layer
-- Adds a denormalised search_index view + GIN indexes for fast tsvector queries
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Materialized view: flatten persons + names + events + places into one row
create materialized view if not exists search_index as
select
  p.id                                          as person_id,
  p.tree_id,
  t.owner_id,
  t.visibility,
  coalesce(n.given_name, '')                    as given_name,
  coalesce(n.surname, '')                       as surname,
  coalesce(n.maiden_name, '')                   as maiden_name,
  coalesce(n.patronymic, '')                    as patronymic,

  -- birth
  eb.date_original                              as birth_date,
  eb.date_from                                  as birth_year,
  coalesce(pb.name, eb.description, '')         as birth_place,

  -- death
  ed.date_original                              as death_date,
  ed.date_from                                  as death_year,
  coalesce(pd.name, ed.description, '')         as death_place,

  -- immigration
  ei.date_original                              as imm_date,
  coalesce(pi.name, ei.description, '')         as imm_place,

  -- tsvector for full-text search (weighted)
  (
    setweight(to_tsvector('simple', coalesce(n.given_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(n.surname, '')),    'A') ||
    setweight(to_tsvector('simple', coalesce(n.maiden_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(n.patronymic, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(pb.name, eb.description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(pd.name, ed.description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(pi.name, ei.description, '')), 'C')
  )                                             as search_vector,

  p.created_at

from persons p
join trees t on t.id = p.tree_id
left join person_names n
  on n.person_id = p.id and n.is_primary = true

-- birth event
left join events eb
  on eb.person_id = p.id and eb.event_type = 'birth'
left join places pb on pb.id = eb.place_id

-- death event
left join events ed
  on ed.person_id = p.id and ed.event_type = 'death'
left join places pd on pd.id = ed.place_id

-- immigration event
left join events ei
  on ei.person_id = p.id and ei.event_type = 'immigration'
left join places pi on pi.id = ei.place_id;

-- 2. GIN index for fast tsvector lookups
create index if not exists idx_search_index_vector
  on search_index using gin(search_vector);

-- Btree indexes for filter columns
create index if not exists idx_search_index_surname
  on search_index (surname);

create index if not exists idx_search_index_birth_year
  on search_index (birth_year);

create index if not exists idx_search_index_death_year
  on search_index (death_year);

create index if not exists idx_search_index_tree_id
  on search_index (tree_id);

create index if not exists idx_search_index_owner_id
  on search_index (owner_id);

create index if not exists idx_search_index_visibility
  on search_index (visibility);

-- 3. Function to refresh the materialized view (called after mutations)
create or replace function refresh_search_index()
returns void language sql security definer as $$
  refresh materialized view concurrently search_index;
$$;
