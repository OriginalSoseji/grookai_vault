with target_descriptions as (
  select
    d.id::text,
    d.card_print_id::text,
    cp.gv_id,
    cp.name,
    d.run_id::text,
    r.run_key,
    d.prompt_version,
    d.response_model_version,
    d.review_status,
    d.quality_flags,
    d.is_current,
    d.supersedes_description_id::text,
    d.input_tokens,
    d.output_tokens,
    d.total_tokens,
    d.estimated_cost_usd,
    d.semantic_tags,
    d.approved_at,
    d.approved_by,
    d.rejected_at,
    d.embedding is null as embedding_is_null,
    d.embedding_model,
    d.embedding_dimensions,
    d.embedded_at,
    d.created_at,
    d.updated_at,
    left(d.artwork_description, 900) as artwork_description_preview,
    d.card_surface_and_printing_cues
  from public.card_print_visual_descriptions d
  join public.card_prints cp on cp.id = d.card_print_id
  left join public.card_visual_description_runs r on r.id = d.run_id
  where d.card_print_id = '2412563a-c73d-5970-a389-f4c1dc35d8c6'::uuid
  order by d.created_at asc, d.id asc
), target_runs as (
  select
    r.id::text,
    r.run_key,
    r.mode,
    r.status,
    r.prompt_version,
    r.model_version,
    r.response_model_version,
    r.request_count,
    r.retry_count,
    r.input_tokens,
    r.output_tokens,
    r.total_tokens,
    r.estimated_cost_usd,
    r.validated_count,
    r.failed_count,
    r.skipped_count,
    r.needs_review_count,
    r.artifact_directory
  from public.card_visual_description_runs r
  where r.run_key in (
    '784c680b0d1f30269a89d2973408dece9f9b06beca7ffe614621f8ef75413292',
    '6a419f368fd667190f66b50d6c2fd83401757109cb598284f7d78f4f1c3816cf',
    '1532f499930912da0023a036d4ed69e28b9f7fd219295bab91db84354ed4f8a4'
  )
  order by r.started_at asc, r.id asc
), boundary as (
  select jsonb_build_object(
    'approved_rows_for_card', (
      select count(*)
      from public.card_print_visual_descriptions
      where card_print_id = '2412563a-c73d-5970-a389-f4c1dc35d8c6'::uuid
        and review_status = 'approved'
    ),
    'embedded_rows_for_card', (
      select count(*)
      from public.card_print_visual_descriptions
      where card_print_id = '2412563a-c73d-5970-a389-f4c1dc35d8c6'::uuid
        and embedding is not null
    ),
    'current_rows_for_card', (
      select count(*)
      from public.card_print_visual_descriptions
      where card_print_id = '2412563a-c73d-5970-a389-f4c1dc35d8c6'::uuid
        and is_current is true
    ),
    'app_facing_views_referencing_visual_tables', (
      select coalesce(jsonb_agg(format('%I.%I', schemaname, viewname) order by schemaname, viewname), '[]'::jsonb)
      from pg_catalog.pg_views
      where schemaname = 'public'
        and definition ~* 'card_print_visual_descriptions|card_visual_description_runs'
    ),
    'card_prints_visual_columns_added', (
      select coalesce(jsonb_agg(column_name order by column_name), '[]'::jsonb)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'card_prints'
        and column_name ~* '(visual|description|semantic|embedding)'
    )
  ) as value
)
select jsonb_pretty(jsonb_build_object(
  'descriptions', coalesce((select jsonb_agg(to_jsonb(target_descriptions)) from target_descriptions), '[]'::jsonb),
  'runs', coalesce((select jsonb_agg(to_jsonb(target_runs)) from target_runs), '[]'::jsonb),
  'boundary', (select value from boundary)
));
