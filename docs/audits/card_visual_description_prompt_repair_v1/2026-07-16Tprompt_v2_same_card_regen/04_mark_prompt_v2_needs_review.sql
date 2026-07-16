with updated as (
  update public.card_print_visual_descriptions d
  set
    review_status = 'needs_review',
    quality_flags = array(
      select distinct flag
      from unnest(
        d.quality_flags || array[
          'prompt_v2_regeneration_quality_failure',
          'potential_body_part_as_separate_held_object'
        ]::text[]
      ) as flag
      order by flag
    ),
    updated_at = now()
  from public.card_visual_description_runs r
  where d.run_id = r.id
    and r.run_key = '6a419f368fd667190f66b50d6c2fd83401757109cb598284f7d78f4f1c3816cf'
    and d.card_print_id = '2412563a-c73d-5970-a389-f4c1dc35d8c6'::uuid
    and d.prompt_version = 'CARD_VISUAL_DESCRIPTION_PROMPT_V2'
    and d.review_status = 'pending'
    and d.approved_at is null
    and d.approved_by is null
    and d.rejected_at is null
    and d.embedding is null
    and d.embedded_at is null
  returning
    d.id::text,
    d.card_print_id::text,
    d.run_id::text,
    d.prompt_version,
    d.review_status,
    d.quality_flags,
    d.is_current,
    d.approved_at,
    d.approved_by,
    d.rejected_at,
    d.embedded_at,
    d.updated_at
)
select jsonb_pretty(jsonb_build_object(
  'operation', 'mark_prompt_v2_regeneration_needs_review',
  'run_key', '6a419f368fd667190f66b50d6c2fd83401757109cb598284f7d78f4f1c3816cf',
  'updated_count', (select count(*) from updated),
  'rows', coalesce((select jsonb_agg(to_jsonb(updated)) from updated), '[]'::jsonb)
));
