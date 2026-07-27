begin;

create table if not exists public.card_visual_description_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null,
  mode text not null,
  status text not null default 'running',
  requested_limit integer null,
  eligible_count integer not null default 0,
  attempted_count integer not null default 0,
  validated_count integer not null default 0,
  failed_count integer not null default 0,
  skipped_count integer not null default 0,
  needs_review_count integer not null default 0,
  prompt_version text not null,
  output_schema_version text not null,
  agent_version text not null,
  model_version text not null,
  response_model_version text null,
  response_model_versions text[] not null default '{}'::text[],
  request_count integer not null default 0,
  retry_count integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cached_input_tokens integer not null default 0,
  reasoning_output_tokens integer not null default 0,
  estimated_cost_usd numeric not null default 0,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  max_run_cost_usd numeric null,
  max_cards integer null,
  stop_reason text null,
  artifact_directory text null,
  artifact_hashes jsonb not null default '{}'::jsonb,
  error_summary text null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_visual_description_runs_key_nonempty_check
    check (btrim(run_key) <> ''),
  constraint card_visual_description_runs_key_unique
    unique (run_key),
  constraint card_visual_description_runs_mode_check
    check (mode = any (array['plan'::text, 'dry_run'::text, 'apply'::text])),
  constraint card_visual_description_runs_status_check
    check (status = any (array['planned'::text, 'running'::text, 'completed'::text, 'failed'::text])),
  constraint card_visual_description_runs_counts_nonnegative_check
    check (
      coalesce(requested_limit, 0) >= 0
      and eligible_count >= 0
      and attempted_count >= 0
      and validated_count >= 0
      and failed_count >= 0
      and skipped_count >= 0
      and needs_review_count >= 0
      and request_count >= 0
      and retry_count >= 0
      and input_tokens >= 0
      and output_tokens >= 0
      and total_tokens >= 0
      and cached_input_tokens >= 0
      and reasoning_output_tokens >= 0
      and estimated_cost_usd >= 0
      and (max_run_cost_usd is null or max_run_cost_usd >= 0)
      and (max_cards is null or max_cards >= 0)
    ),
  constraint card_visual_description_runs_pricing_snapshot_object_check
    check (jsonb_typeof(pricing_snapshot) = 'object'),
  constraint card_visual_description_runs_artifact_hashes_object_check
    check (jsonb_typeof(artifact_hashes) = 'object')
);

comment on table public.card_visual_description_runs is
'Private service-role run ledger for canonical card visual description generation. No direct app access.';

drop trigger if exists trg_card_visual_description_runs_updated_at on public.card_visual_description_runs;
create trigger trg_card_visual_description_runs_updated_at
before update on public.card_visual_description_runs
for each row execute function public.set_timestamp_updated_at();

create table if not exists public.card_print_visual_descriptions (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  run_id uuid null references public.card_visual_description_runs(id) on delete set null,
  image_source text not null,
  image_source_key text not null,
  image_sha256 text not null,
  image_width integer null,
  image_height integer null,
  image_mime_type text not null,
  prompt_version text not null,
  output_schema_version text not null,
  agent_version text not null,
  model_version text not null,
  response_model_version text null,
  image_detail text not null default 'high',
  request_count integer not null default 0,
  retry_count integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cached_input_tokens integer not null default 0,
  reasoning_output_tokens integer not null default 0,
  estimated_cost_usd numeric not null default 0,
  artwork_description text not null,
  card_surface_and_printing_cues text not null default '',
  visual_attributes jsonb not null default '{}'::jsonb,
  semantic_tags text[] not null default '{}'::text[],
  identity_input_confidence numeric not null,
  description_confidence numeric not null,
  attribute_confidence numeric not null,
  image_quality_score numeric not null,
  review_status text not null default 'pending',
  quality_flags text[] not null default '{}'::text[],
  is_current boolean not null default false,
  supersedes_description_id uuid null references public.card_print_visual_descriptions(id) on delete set null,
  approved_at timestamptz null,
  approved_by uuid null references auth.users(id) on delete set null,
  rejected_at timestamptz null,
  rejection_reason text null,
  embedding double precision[] null,
  embedding_input_hash text null,
  embedding_model text null,
  embedding_dimensions integer null,
  embedded_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_print_visual_descriptions_image_sha256_check
    check (image_sha256 ~ '^[0-9a-f]{64}$'),
  constraint card_print_visual_descriptions_image_dimensions_check
    check (
      (image_width is null or image_width > 0)
      and (image_height is null or image_height > 0)
    ),
  constraint card_print_visual_descriptions_mime_check
    check (image_mime_type = any (array['image/jpeg'::text, 'image/png'::text, 'image/webp'::text])),
  constraint card_print_visual_descriptions_image_detail_check
    check (image_detail = any (array['low'::text, 'high'::text, 'original'::text, 'auto'::text])),
  constraint card_print_visual_descriptions_usage_nonnegative_check
    check (
      request_count >= 0
      and retry_count >= 0
      and input_tokens >= 0
      and output_tokens >= 0
      and total_tokens >= 0
      and cached_input_tokens >= 0
      and reasoning_output_tokens >= 0
      and estimated_cost_usd >= 0
    ),
  constraint card_print_visual_descriptions_visual_attributes_object_check
    check (jsonb_typeof(visual_attributes) = 'object'),
  constraint card_print_visual_descriptions_confidence_range_check
    check (
      identity_input_confidence between 0 and 1
      and description_confidence between 0 and 1
      and attribute_confidence between 0 and 1
      and image_quality_score between 0 and 1
    ),
  constraint card_print_visual_descriptions_review_status_check
    check (review_status = any (array['pending'::text, 'approved'::text, 'needs_review'::text, 'rejected'::text])),
  constraint card_print_visual_descriptions_approved_fields_check
    check (
      (review_status = 'approved' and approved_at is not null)
      or (review_status <> 'approved' and approved_at is null and approved_by is null)
    ),
  constraint card_print_visual_descriptions_rejected_fields_check
    check (
      (review_status = 'rejected' and rejected_at is not null)
      or (review_status <> 'rejected' and rejected_at is null)
    ),
  constraint card_print_visual_descriptions_embedding_hash_check
    check (embedding_input_hash is null or embedding_input_hash ~ '^[0-9a-f]{64}$'),
  constraint card_print_visual_descriptions_embedding_dimensions_check
    check (embedding_dimensions is null or embedding_dimensions > 0)
);

comment on table public.card_print_visual_descriptions is
'Private versioned derived visual-intelligence rows anchored to canonical card_prints. Not identity authority.';

create unique index if not exists card_print_visual_descriptions_current_unique_idx
  on public.card_print_visual_descriptions (card_print_id)
  where is_current = true;

create unique index if not exists card_print_visual_descriptions_version_unique_idx
  on public.card_print_visual_descriptions (
    card_print_id,
    image_sha256,
    prompt_version,
    output_schema_version,
    agent_version,
    model_version
  );

create index if not exists card_print_visual_descriptions_card_idx
  on public.card_print_visual_descriptions (card_print_id, created_at desc);

create index if not exists card_print_visual_descriptions_review_idx
  on public.card_print_visual_descriptions (review_status, created_at desc);

create index if not exists card_print_visual_descriptions_tags_idx
  on public.card_print_visual_descriptions using gin (semantic_tags);

drop trigger if exists trg_card_print_visual_descriptions_updated_at on public.card_print_visual_descriptions;
create trigger trg_card_print_visual_descriptions_updated_at
before update on public.card_print_visual_descriptions
for each row execute function public.set_timestamp_updated_at();

alter table public.card_visual_description_runs enable row level security;
alter table public.card_print_visual_descriptions enable row level security;

revoke all on table public.card_visual_description_runs from public, anon, authenticated;
revoke all on table public.card_print_visual_descriptions from public, anon, authenticated;

grant all on table public.card_visual_description_runs to service_role;
grant all on table public.card_print_visual_descriptions to service_role;

commit;
