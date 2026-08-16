-- MTG_CARD_IMAGE_FACES_V1
-- Additive face-level storage for exact multi-face MTG artwork. Parent image fields
-- remain the compatibility front-image contract.

begin;

create table if not exists public.card_print_image_faces (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  face_index smallint not null check (face_index >= 0),
  face_role text not null check (
    face_role in ('front', 'back') or face_role ~ '^additional_[0-9]+$'
  ),
  image_source text not null check (image_source = 'self_hosted_scryfall_exact_print_v1'),
  image_status text not null check (image_status = 'exact'),
  image_path text not null check (
    image_path like 'warehouse-derived/self-hosted-images-v1/card_prints/mtg/%'
  ),
  image_url text not null check (image_url ~ '^https://'),
  image_hash text not null check (image_hash ~ '^[0-9a-f]{64}$'),
  content_type text not null check (content_type in ('image/jpeg', 'image/png')),
  width integer not null check (width >= 100),
  height integer not null check (height >= 100),
  size_bytes integer not null check (size_bytes >= 1000),
  source_quality text not null check (source_quality in ('large', 'normal', 'png')),
  source_url text not null check (source_url ~ '^https://cards[.]scryfall[.]io/'),
  source_print_id uuid not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz not null default now(),
  unique (card_print_id, face_index)
);

comment on table public.card_print_image_faces is
  'Exact immutable image evidence for individual card faces. Parent card_prints image fields retain the front-image compatibility pointer.';

create index if not exists card_print_image_faces_card_print_id_idx
  on public.card_print_image_faces (card_print_id, face_index);

alter table public.card_print_image_faces enable row level security;

revoke all on table public.card_print_image_faces from public, anon, authenticated;
grant select, insert on table public.card_print_image_faces to service_role;
grant select on table public.card_print_image_faces to authenticated;

drop policy if exists card_print_image_faces_service_v1
  on public.card_print_image_faces;
create policy card_print_image_faces_service_v1
  on public.card_print_image_faces
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists card_print_image_faces_authenticated_read_v1
  on public.card_print_image_faces;
create policy card_print_image_faces_authenticated_read_v1
  on public.card_print_image_faces
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.card_prints card
      where card.id = card_print_image_faces.card_print_id
        and public.catalog_game_id_visible_to_request_v1(card.game_id)
    )
  );

create or replace function public.get_card_print_image_faces_v1(
  p_card_print_id uuid
)
returns table (
  card_print_id uuid,
  face_index smallint,
  face_role text,
  image_path text,
  image_url text,
  image_hash text,
  content_type text,
  width integer,
  height integer,
  image_status text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    face.card_print_id,
    face.face_index,
    face.face_role,
    face.image_path,
    face.image_url,
    face.image_hash,
    face.content_type,
    face.width,
    face.height,
    face.image_status
  from public.card_print_image_faces face
  where face.card_print_id = p_card_print_id
  order by face.face_index;
$$;

revoke all on function public.get_card_print_image_faces_v1(uuid)
  from public, anon;
grant execute on function public.get_card_print_image_faces_v1(uuid)
  to authenticated, service_role;

commit;
