-- MTG_SEALED_IMAGE_DIMENSION_CONSTRAINT_REPAIR_V1
-- Makes the existing image evidence dimension tuple fail closed. PostgreSQL
-- CHECK constraints accept NULL results, so every tuple must be explicitly
-- either fully absent or fully present and positive.

begin;

do $$
begin
  if exists (
    select 1
    from public.sealed_product_image_evidence
    where not (
      (
        image_width is null
        and image_height is null
        and image_bytes is null
      )
      or (
        image_width is not null
        and image_height is not null
        and image_bytes is not null
        and image_width > 0
        and image_height > 0
        and image_bytes > 0
      )
    )
  ) then
    raise exception
      'sealed product image evidence contains a partial or invalid dimension tuple'
      using errcode = '23514';
  end if;
end
$$;

alter table public.sealed_product_image_evidence
  drop constraint sealed_product_image_evidence_dimension_check;

alter table public.sealed_product_image_evidence
  add constraint sealed_product_image_evidence_dimension_check
  check (
    (
      image_width is null
      and image_height is null
      and image_bytes is null
    )
    or (
      image_width is not null
      and image_height is not null
      and image_bytes is not null
      and image_width > 0
      and image_height > 0
      and image_bytes > 0
    )
  );

commit;
