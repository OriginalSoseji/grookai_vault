create table if not exists public.justtcg_set_mappings (
  id uuid primary key default gen_random_uuid(),
  grookai_set_id uuid not null references public.sets(id) on delete cascade,
  justtcg_set_id text,
  justtcg_set_name text,
  alignment_status text not null,
  match_method text not null,
  notes jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint justtcg_set_mappings_grookai_set_id_key unique (grookai_set_id),
  constraint justtcg_set_mappings_alignment_status_check
    check (alignment_status in ('exact_aligned', 'manual_helper_override', 'absent_upstream', 'ambiguous_upstream'))
);

comment on table public.justtcg_set_mappings is
  'Integration-only helper table aligning Grookai sets to JustTCG sets without altering canonical Grookai identity.';

comment on column public.justtcg_set_mappings.grookai_set_id is
  'Canonical Grookai set id.';

comment on column public.justtcg_set_mappings.justtcg_set_id is
  'External JustTCG set id used for direct structure mapping.';

comment on column public.justtcg_set_mappings.alignment_status is
  'Alignment state for the Grookai set against the JustTCG set catalog.';

comment on column public.justtcg_set_mappings.match_method is
  'How the alignment was established (manual helper override, exact canonical name, etc.).';

create index if not exists justtcg_set_mappings_active_idx
  on public.justtcg_set_mappings (active, alignment_status);

create table if not exists public.justtcg_identity_overrides (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  justtcg_set_id text,
  justtcg_number text,
  justtcg_name text,
  justtcg_rarity text,
  reason text not null,
  notes jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint justtcg_identity_overrides_card_print_id_key unique (card_print_id)
);

comment on table public.justtcg_identity_overrides is
  'Integration-only per-card helper overrides for JustTCG rows that require explicit set/number/name/rarity guidance.';

comment on column public.justtcg_identity_overrides.card_print_id is
  'Canonical Grookai card_print id.';

comment on column public.justtcg_identity_overrides.justtcg_set_id is
  'Optional JustTCG set id override.';

comment on column public.justtcg_identity_overrides.justtcg_number is
  'Optional JustTCG printed-number override.';

comment on column public.justtcg_identity_overrides.justtcg_name is
  'Optional JustTCG card-name override.';

comment on column public.justtcg_identity_overrides.justtcg_rarity is
  'Optional JustTCG rarity override used only as an exact disambiguator.';

create index if not exists justtcg_identity_overrides_active_idx
  on public.justtcg_identity_overrides (active);

with helper_rows(grookai_set_code, justtcg_set_id, justtcg_set_name, alignment_status, match_method, notes) as (
  values
    ('swshp', 'swsh-sword-shield-promo-cards-pokemon', 'SWSH: Sword & Shield Promo Cards', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Black Star promo family name differs between Grookai and JustTCG.')),
    ('smp', 'sm-promos-pokemon', 'SM Promos', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Black Star promo family name differs between Grookai and JustTCG.')),
    ('svp', 'sv-scarlet-violet-promo-cards-pokemon', 'SV: Scarlet & Violet Promo Cards', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Black Star promo family name differs between Grookai and JustTCG.')),
    ('xyp', 'xy-promos-pokemon', 'XY Promos', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Black Star promo family name differs between Grookai and JustTCG.')),
    ('bwp', 'black-and-white-promos-pokemon', 'Black and White Promos', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Black Star promo family name differs between Grookai and JustTCG.')),
    ('dpp', 'diamond-and-pearl-promos-pokemon', 'Diamond and Pearl Promos', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Black Star promo family name differs between Grookai and JustTCG.')),
    ('np', 'nintendo-promos-pokemon', 'Nintendo Promos', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Nintendo promo family name differs between Grookai and JustTCG.')),
    ('tk-bw-e', 'bw-trainer-kit-excadrill-zoroark-pokemon', 'BW Trainer Kit: Excadrill & Zoroark', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-bw-z', 'bw-trainer-kit-excadrill-zoroark-pokemon', 'BW Trainer Kit: Excadrill & Zoroark', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-dp-m', 'dp-trainer-kit-manaphy-lucario-pokemon', 'DP Trainer Kit: Manaphy & Lucario', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-dp-l', 'dp-trainer-kit-manaphy-lucario-pokemon', 'DP Trainer Kit: Manaphy & Lucario', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-ex-m', 'ex-trainer-kit-2-plusle-minun-pokemon', 'EX Trainer Kit 2: Plusle & Minun', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-ex-p', 'ex-trainer-kit-2-plusle-minun-pokemon', 'EX Trainer Kit 2: Plusle & Minun', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk2b', 'ex-trainer-kit-2-plusle-minun-pokemon', 'EX Trainer Kit 2: Plusle & Minun', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-xy-p', 'xy-trainer-kit-pikachu-libre-suicune-pokemon', 'XY Trainer Kit: Pikachu Libre & Suicune', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-xy-b', 'xy-trainer-kit-bisharp-wigglytuff-pokemon', 'XY Trainer Kit: Bisharp & Wigglytuff', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-xy-n', 'xy-trainer-kit-sylveon-noivern-pokemon', 'XY Trainer Kit: Sylveon & Noivern', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-sm-l', 'sm-trainer-kit-lycanroc-alolan-raichu-pokemon', 'SM Trainer Kit: Lycanroc & Alolan Raichu', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-xy-w', 'xy-trainer-kit-bisharp-wigglytuff-pokemon', 'XY Trainer Kit: Bisharp & Wigglytuff', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.')),
    ('tk-xy-sy', 'xy-trainer-kit-sylveon-noivern-pokemon', 'XY Trainer Kit: Sylveon & Noivern', 'manual_helper_override', 'manual_family_override', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1', 'reason', 'Trainer Kit split names differ between Grookai and JustTCG.'))
)
insert into public.justtcg_set_mappings (
  grookai_set_id,
  justtcg_set_id,
  justtcg_set_name,
  alignment_status,
  match_method,
  notes,
  active
)
select
  s.id,
  h.justtcg_set_id,
  h.justtcg_set_name,
  h.alignment_status,
  h.match_method,
  h.notes,
  true
from helper_rows h
join public.sets s
  on s.code = h.grookai_set_code
on conflict (grookai_set_id) do update
set
  justtcg_set_id = excluded.justtcg_set_id,
  justtcg_set_name = excluded.justtcg_set_name,
  alignment_status = excluded.alignment_status,
  match_method = excluded.match_method,
  notes = excluded.notes,
  active = excluded.active,
  updated_at = now();

with helper_rows(gv_id, justtcg_set_id, justtcg_number, justtcg_name, justtcg_rarity, reason, notes) as (
  values
    ('GV-PK-PR-SW-SWSH242', 'swsh-sword-shield-promo-cards-pokemon', 'SWSH242', 'Comfey - SWSH242 (Prerelease)', 'Promo', 'JustTCG models this promo with an explicit prerelease suffix.', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1')),
    ('GV-PK-PR-SV-167', 'sv-scarlet-violet-promo-cards-pokemon', '167', 'Flareon - 167 (Cosmos Holo)', 'Promo', 'JustTCG models this promo with an explicit cosmos-holo suffix.', jsonb_build_object('seeded_by', '20260322193000_add_justtcg_direct_structure_helpers_v1'))
)
insert into public.justtcg_identity_overrides (
  card_print_id,
  justtcg_set_id,
  justtcg_number,
  justtcg_name,
  justtcg_rarity,
  reason,
  notes,
  active
)
select
  cp.id,
  h.justtcg_set_id,
  h.justtcg_number,
  h.justtcg_name,
  h.justtcg_rarity,
  h.reason,
  h.notes,
  true
from helper_rows h
join public.card_prints cp
  on cp.gv_id = h.gv_id
on conflict (card_print_id) do update
set
  justtcg_set_id = excluded.justtcg_set_id,
  justtcg_number = excluded.justtcg_number,
  justtcg_name = excluded.justtcg_name,
  justtcg_rarity = excluded.justtcg_rarity,
  reason = excluded.reason,
  notes = excluded.notes,
  active = excluded.active,
  updated_at = now();
