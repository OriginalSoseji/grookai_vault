select jsonb_pretty(jsonb_build_object(
  'target_card_print_id', '2412563a-c73d-5970-a389-f4c1dc35d8c6',
  'target_gv_id', 'GV-PK-JPN-M5-113',
  'v4_description_rows_in_db', (
    select count(*)
    from public.card_print_visual_descriptions
    where card_print_id = '2412563a-c73d-5970-a389-f4c1dc35d8c6'::uuid
      and prompt_version = 'CARD_VISUAL_DESCRIPTION_PROMPT_V4'
  ),
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
  'current_row', (
    select to_jsonb(row) from (
      select
        d.id::text,
        d.prompt_version,
        d.review_status,
        d.is_current,
        d.approved_at,
        d.approved_by,
        d.embedded_at,
        d.embedding is null as embedding_is_null,
        d.semantic_tags
      from public.card_print_visual_descriptions d
      where d.card_print_id = '2412563a-c73d-5970-a389-f4c1dc35d8c6'::uuid
        and d.is_current is true
      limit 1
    ) row
  )
));
