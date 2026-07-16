with updated as (
  update public.card_print_visual_descriptions
  set
    review_status = 'needs_review',
    quality_flags = array(
      select distinct flag
      from unnest(
        quality_flags || array[
          'prompt_quality_body_part_as_object',
          'prompt_quality_overconfident_setting',
          'prompt_quality_metadata_tags'
        ]::text[]
      ) as flag
      order by flag
    ),
    updated_at = now()
  where id = '6723bfa5-f20a-409b-a191-a31c8e9af76a'::uuid
    and card_print_id = '2412563a-c73d-5970-a389-f4c1dc35d8c6'::uuid
    and review_status = 'pending'
    and approved_at is null
    and approved_by is null
    and rejected_at is null
    and embedding is null
    and embedded_at is null
  returning
    id::text,
    card_print_id::text,
    run_id::text,
    review_status,
    quality_flags,
    is_current,
    approved_at,
    approved_by,
    rejected_at,
    embedded_at,
    updated_at
)
select jsonb_pretty(jsonb_build_object(
  'operation', 'mark_original_description_needs_review',
  'expected_description_id', '6723bfa5-f20a-409b-a191-a31c8e9af76a',
  'updated_count', (select count(*) from updated),
  'rows', coalesce((select jsonb_agg(to_jsonb(updated)) from updated), '[]'::jsonb)
));
