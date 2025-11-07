-- Per-card quick fields (raw estimates)
alter table if exists cards
  add column if not exists condition_grade text check (condition_grade in ('NM','LP','MP','HP','DMG','GRADED')),
  add column if not exists condition_score numeric,
  add column if not exists condition_confidence numeric,
  add column if not exists condition_updated_at timestamptz;

create index if not exists idx_cards_condition_grade on cards (condition_grade);

-- Per-item assessments (keeps history, supports vault items)
create table if not exists condition_assessments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid, -- link to your vault_items.id if available
  card_id uuid, -- optional fallback to cards.id
  created_at timestamptz not null default now(),
  source text not null default 'auto', -- 'auto' | 'manual' | 'ml'
  score numeric,
  grade text check (grade in ('NM','LP','MP','HP','DMG','GRADED')),
  confidence numeric,
  details jsonb
);
create index if not exists idx_condition_assessments_item on condition_assessments (item_id);
create index if not exists idx_condition_assessments_card on condition_assessments (card_id);

