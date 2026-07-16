with target as (
  select '784c680b0d1f30269a89d2973408dece9f9b06beca7ffe614621f8ef75413292'::text as run_key
),
run_row as (
  select r.*
  from public.card_visual_description_runs r
  join target t on t.run_key = r.run_key
),
description_rows as (
  select
    d.*,
    cp.gv_id,
    cp.name,
    cp.set_code,
    cp.number
  from public.card_print_visual_descriptions d
  join run_row r on r.id = d.run_id
  join public.card_prints cp on cp.id = d.card_print_id
),
all_counts as (
  select jsonb_build_object(
    'total_run_rows', (select count(*)::int from public.card_visual_description_runs),
    'total_description_rows', (select count(*)::int from public.card_print_visual_descriptions),
    'target_run_rows', (select count(*)::int from run_row),
    'target_description_rows', (select count(*)::int from description_rows),
    'approved_descriptions_for_target_run', (select count(*)::int from description_rows where review_status = 'approved'),
    'embedded_descriptions_for_target_run', (select count(*)::int from description_rows where embedding is not null or embedding_model is not null or embedded_at is not null),
    'current_descriptions_for_target_card', (
      select count(*)::int
      from public.card_print_visual_descriptions d
      where d.card_print_id = (select card_print_id from description_rows limit 1)
        and d.is_current is true
    )
  ) as details
),
boundary as (
  select jsonb_build_object(
    'app_role_grants_on_visual_tables', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'grantee', grantee,
        'table_name', table_name,
        'privilege_type', privilege_type
      ) order by grantee, table_name, privilege_type), '[]'::jsonb)
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('card_visual_description_runs', 'card_print_visual_descriptions')
        and grantee in ('anon', 'authenticated')
    ),
    'app_facing_views_referencing_visual_tables', (
      select coalesce(jsonb_agg((schemaname || '.' || viewname) order by schemaname, viewname), '[]'::jsonb)
      from pg_views
      where schemaname in ('public', 'api')
        and definition ilike any (array[
          '%card_visual_description_runs%',
          '%card_print_visual_descriptions%'
        ])
    ),
    'card_prints_visual_columns_added', (
      select coalesce(jsonb_agg(column_name order by column_name), '[]'::jsonb)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'card_prints'
        and (
          column_name ilike '%visual%'
          or column_name ilike '%description%'
          or column_name ilike '%embedding%'
          or column_name ilike '%semantic%'
        )
    )
  ) as details
)
select jsonb_pretty(jsonb_build_object(
  'counts', (select details from all_counts),
  'run', (
    select jsonb_build_object(
      'id', id,
      'run_key', run_key,
      'mode', mode,
      'status', status,
      'requested_limit', requested_limit,
      'eligible_count', eligible_count,
      'attempted_count', attempted_count,
      'validated_count', validated_count,
      'failed_count', failed_count,
      'skipped_count', skipped_count,
      'needs_review_count', needs_review_count,
      'prompt_version', prompt_version,
      'output_schema_version', output_schema_version,
      'agent_version', agent_version,
      'model_version', model_version,
      'response_model_version', response_model_version,
      'response_model_versions', response_model_versions,
      'request_count', request_count,
      'retry_count', retry_count,
      'input_tokens', input_tokens,
      'output_tokens', output_tokens,
      'total_tokens', total_tokens,
      'cached_input_tokens', cached_input_tokens,
      'reasoning_output_tokens', reasoning_output_tokens,
      'estimated_cost_usd', estimated_cost_usd,
      'pricing_snapshot', pricing_snapshot,
      'max_run_cost_usd', max_run_cost_usd,
      'max_cards', max_cards,
      'stop_reason', stop_reason,
      'artifact_directory', artifact_directory,
      'error_summary', error_summary,
      'finished_at_is_not_null', finished_at is not null
    )
    from run_row
    limit 1
  ),
  'description', (
    select jsonb_build_object(
      'id', id,
      'card_print_id', card_print_id,
      'gv_id', gv_id,
      'name', name,
      'set_code', set_code,
      'number', number,
      'run_id', run_id,
      'image_source', image_source,
      'image_sha256', image_sha256,
      'image_width', image_width,
      'image_height', image_height,
      'image_mime_type', image_mime_type,
      'prompt_version', prompt_version,
      'output_schema_version', output_schema_version,
      'agent_version', agent_version,
      'model_version', model_version,
      'response_model_version', response_model_version,
      'image_detail', image_detail,
      'request_count', request_count,
      'retry_count', retry_count,
      'input_tokens', input_tokens,
      'output_tokens', output_tokens,
      'total_tokens', total_tokens,
      'cached_input_tokens', cached_input_tokens,
      'reasoning_output_tokens', reasoning_output_tokens,
      'estimated_cost_usd', estimated_cost_usd,
      'review_status', review_status,
      'quality_flags', quality_flags,
      'is_current', is_current,
      'approved_at', approved_at,
      'approved_by', approved_by,
      'rejected_at', rejected_at,
      'embedding_is_null', embedding is null,
      'embedding_input_hash', embedding_input_hash,
      'embedding_model', embedding_model,
      'embedding_dimensions', embedding_dimensions,
      'embedded_at', embedded_at,
      'artwork_description_length', length(artwork_description),
      'semantic_tag_count', cardinality(semantic_tags)
    )
    from description_rows
    limit 1
  ),
  'boundary', (select details from boundary)
)) as readback;
