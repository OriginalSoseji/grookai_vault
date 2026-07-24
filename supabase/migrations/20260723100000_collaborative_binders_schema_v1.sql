begin;

-- COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1
-- Additive authority tables, fail-closed defaults, and private helpers.
-- All client reads and writes are RPC-only. Raw Binder tables intentionally
-- have no anon/authenticated privileges.

create or replace function public.binder_text_safe_v1(
  p_text text,
  p_allow_multiline boolean default false
)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_codepoint integer;
begin
  if p_text is null then
    return true;
  end if;
  if (
    p_allow_multiline
    and regexp_replace(p_text, E'[\t\n\r]', '', 'g') ~ '[[:cntrl:]]'
  ) or (
    not p_allow_multiline
    and p_text ~ '[[:cntrl:]]'
  ) then
    return false;
  end if;
  foreach v_codepoint in array array[
    173,              -- U+00AD SOFT HYPHEN
    1564,             -- U+061C ARABIC LETTER MARK
    8203,             -- U+200B ZERO WIDTH SPACE
    8206, 8207,       -- U+200E/U+200F directional marks
    8234, 8235, 8236, 8237, 8238, -- U+202A..U+202E embeddings/overrides
    8288,             -- U+2060 WORD JOINER
    8294, 8295, 8296, 8297,        -- U+2066..U+2069 isolates
    65279             -- U+FEFF BOM/zero-width no-break space
  ]
  loop
    if strpos(p_text, chr(v_codepoint)) > 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create table public.binder_feature_flags (
  flag_key text primary key,
  enabled boolean not null default false,
  description text not null,
  updated_at timestamptz not null default now(),
  constraint binder_feature_flags_key_check check (
    flag_key in (
      'schema_internal',
      'personal',
      'shared',
      'view_links',
      'public',
      'community',
      'templates',
      'notifications',
      'pulse_milestones',
      'custom',
      'set_binders'
    )
  ),
  constraint binder_feature_flags_description_check
    check (btrim(description) <> '')
);

insert into public.binder_feature_flags (flag_key, enabled, description)
values
  ('schema_internal', false, 'Internal Binder schema and RPC gate.'),
  ('personal', false, 'Private personal Species Binders.'),
  ('shared', false, 'Invite-only shared Binders.'),
  ('view_links', false, 'Revocable view-only Binder links.'),
  ('public', false, 'Unlisted and listed public Binder projections.'),
  ('community', false, 'Community discovery, join requests, and approval queues.'),
  ('templates', false, 'Published Binder Templates and cloning.'),
  ('notifications', false, 'Generic Binder notification-subject extension; intentionally off.'),
  ('pulse_milestones', false, 'Explicit Binder milestone sharing to Pulse; intentionally off.'),
  ('custom', false, 'Custom Binder definitions.'),
  ('set_binders', false, 'Set Master Set Binders; remains off until governed slot authority exists.')
on conflict (flag_key) do nothing;

create table public.binders (
  id uuid primary key default gen_random_uuid(),
  -- Preserve the UUID wire type while using all 128 bits as CSPRNG entropy.
  -- gen_random_uuid() fixes six version/variant bits and therefore provides
  -- only 122 random bits, below the Binder routing-identity contract.
  public_id uuid not null
    default encode(extensions.gen_random_bytes(16), 'hex')::uuid,
  owner_user_id uuid null references auth.users(id) on delete set null,
  title text not null,
  description text null,
  target_kind text not null,
  species_id uuid null references public.pokemon_species(id) on delete restrict,
  set_id uuid null references public.sets(id) on delete restrict,
  checklist_mode text not null,
  definition_revision integer not null default 1,
  read_access text not null default 'private',
  discoverability text not null default 'unlisted',
  join_policy text not null default 'closed',
  contribution_policy text not null default 'owner_only',
  external_projection_revision bigint not null default 1,
  lifecycle text not null default 'active',
  moderation_state text not null default 'clear',
  cover_card_print_id uuid null references public.card_prints(id) on delete restrict,
  legacy_watch_id uuid null references public.watches(id) on delete restrict,
  archived_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint binders_public_id_key unique (public_id),
  constraint binders_legacy_watch_id_key unique (legacy_watch_id),
  constraint binders_title_check check (
    title = btrim(title)
    and char_length(title) between 1 and 80
    and public.binder_text_safe_v1(title, false)
  ),
  constraint binders_description_check check (
    description is null
    or (
      char_length(description) <= 1000
      and public.binder_text_safe_v1(description, true)
    )
  ),
  constraint binders_target_kind_check
    check (target_kind in ('species', 'set', 'custom')),
  constraint binders_target_exactly_one_check check (
    (target_kind = 'species' and species_id is not null and set_id is null)
    or (target_kind = 'set' and set_id is not null and species_id is null)
    or (target_kind = 'custom' and species_id is null and set_id is null)
  ),
  constraint binders_checklist_mode_check check (
    (target_kind = 'species' and checklist_mode in ('card_prints', 'master_variants'))
    or (target_kind = 'set' and checklist_mode = 'master_set')
    or (target_kind = 'custom' and checklist_mode = 'custom')
  ),
  constraint binders_definition_revision_check check (definition_revision >= 1),
  constraint binders_read_access_check
    check (read_access in ('private', 'link', 'public')),
  constraint binders_discoverability_check
    check (discoverability in ('unlisted', 'listed')),
  constraint binders_join_policy_check
    check (join_policy in ('closed', 'invite_only', 'request_to_join')),
  constraint binders_contribution_policy_check
    check (contribution_policy in ('owner_only', 'members_direct', 'approval_required')),
  constraint binders_external_projection_revision_check
    check (external_projection_revision >= 1),
  constraint binders_lifecycle_check
    check (lifecycle in ('active', 'archived', 'deleted_tombstone')),
  constraint binders_moderation_state_check
    check (moderation_state in ('clear', 'forced_unlisted', 'frozen', 'removed')),
  constraint binders_visibility_axes_check check (
    (read_access = 'public' or discoverability = 'unlisted')
    and (read_access <> 'private' or discoverability = 'unlisted')
    and (read_access <> 'link' or discoverability = 'unlisted')
    and (
      join_policy <> 'request_to_join'
      or (
        read_access = 'public'
        and discoverability = 'listed'
        and contribution_policy = 'approval_required'
      )
    )
  ),
  constraint binders_owner_lifecycle_check check (
    lifecycle = 'deleted_tombstone' or owner_user_id is not null
  ),
  constraint binders_archive_timestamp_check check (
    (lifecycle = 'archived' and archived_at is not null and deleted_at is null)
    or (lifecycle = 'active' and archived_at is null and deleted_at is null)
    or (lifecycle = 'deleted_tombstone' and deleted_at is not null)
  )
);

create table public.binder_members (
  id uuid primary key default gen_random_uuid(),
  public_action_ref uuid not null default gen_random_uuid(),
  binder_id uuid not null references public.binders(id) on delete restrict,
  user_id uuid null references auth.users(id) on delete set null,
  role text not null,
  state text not null default 'active',
  membership_epoch integer not null default 1,
  display_alias text null,
  invited_by_user_id uuid null references auth.users(id) on delete set null,
  joined_at timestamptz null,
  ended_at timestamptz null,
  suspended_at timestamptz null,
  content_scope text not null default 'none',
  content_consent_epoch integer null,
  content_consent_revision bigint null,
  identity_scope text not null default 'none',
  identity_consent_epoch integer null,
  identity_consent_revision bigint null,
  notification_preference text not null default 'digest',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint binder_members_public_action_ref_key unique (public_action_ref),
  constraint binder_members_binder_user_key unique (binder_id, user_id),
  constraint binder_members_role_check
    check (role in ('owner', 'manager', 'contributor', 'viewer')),
  constraint binder_members_state_check
    check (state in ('active', 'left', 'removed', 'suspended')),
  constraint binder_members_live_user_check
    check (state not in ('active', 'suspended') or user_id is not null),
  constraint binder_members_epoch_check check (membership_epoch >= 1),
  constraint binder_members_alias_check check (
    display_alias is null
    or (
      display_alias = btrim(display_alias)
      and char_length(display_alias) between 1 and 40
      and public.binder_text_safe_v1(display_alias, false)
    )
  ),
  constraint binder_members_content_scope_check
    check (content_scope in ('none', 'link', 'public')),
  constraint binder_members_identity_scope_check
    check (identity_scope in ('none', 'link', 'public')),
  constraint binder_members_content_consent_check check (
    (content_scope = 'none'
      and content_consent_epoch is null
      and content_consent_revision is null)
    or (
      content_scope <> 'none'
      and content_consent_epoch = membership_epoch
      and content_consent_revision is not null
      and content_consent_revision >= 1
    )
  ),
  constraint binder_members_identity_consent_check check (
    (identity_scope = 'none'
      and identity_consent_epoch is null
      and identity_consent_revision is null)
    or (
      identity_scope <> 'none'
      and identity_consent_epoch = membership_epoch
      and identity_consent_revision is not null
      and identity_consent_revision >= 1
    )
  ),
  constraint binder_members_notification_check
    check (notification_preference in ('immediate', 'digest', 'muted')),
  constraint binder_members_state_timestamps_check check (
    (state = 'active' and joined_at is not null and ended_at is null and suspended_at is null)
    or (state = 'suspended' and joined_at is not null and ended_at is null and suspended_at is not null)
    or (state in ('left', 'removed') and ended_at is not null)
  )
);

create unique index binder_members_one_active_owner_idx
  on public.binder_members (binder_id)
  where role = 'owner' and state = 'active';

create table public.binder_progress_state (
  binder_id uuid primary key references public.binders(id) on delete restrict,
  definition_revision integer not null,
  unit text not null,
  total_slots integer not null default 0,
  member_completed_slots integer not null default 0,
  link_completed_slots integer not null default 0,
  public_completed_slots integer not null default 0,
  active_contribution_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint binder_progress_state_unit_check
    check (unit in ('card_prints', 'finish_options', 'custom_slots')),
  constraint binder_progress_state_nonnegative_check check (
    total_slots >= 0
    and member_completed_slots >= 0
    and link_completed_slots >= 0
    and public_completed_slots >= 0
    and active_contribution_count >= 0
  ),
  constraint binder_progress_state_bounds_check check (
    member_completed_slots <= total_slots
    and link_completed_slots <= total_slots
    and public_completed_slots <= total_slots
  )
);

create table public.binder_custom_revisions (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders(id) on delete restrict,
  revision integer not null,
  created_by_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint binder_custom_revisions_binder_revision_key unique (binder_id, revision),
  constraint binder_custom_revisions_revision_check check (revision >= 1)
);

create table public.binder_custom_slots (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.binder_custom_revisions(id) on delete restrict,
  binder_id uuid not null references public.binders(id) on delete restrict,
  definition_revision integer not null,
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  card_printing_id uuid null references public.card_printings(id) on delete restrict,
  position integer not null,
  required_quantity integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint binder_custom_slots_position_key
    unique (binder_id, definition_revision, position),
  constraint binder_custom_slots_identity_key
    unique nulls not distinct (
      binder_id,
      definition_revision,
      card_print_id,
      card_printing_id
    ),
  constraint binder_custom_slots_revision_check check (definition_revision >= 1),
  constraint binder_custom_slots_position_check check (position >= 0),
  constraint binder_custom_slots_quantity_check
    check (required_quantity between 1 and 100)
);

create table public.binder_invitations (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders(id) on delete restrict,
  inviter_user_id uuid null references auth.users(id) on delete set null,
  is_account_targeted boolean not null default false,
  intended_user_id uuid null references auth.users(id) on delete set null,
  max_role text not null,
  token_hash bytea not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  accepted_by_user_id uuid null references auth.users(id) on delete set null,
  used_at timestamptz null,
  responded_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint binder_invitations_token_hash_key unique (token_hash),
  constraint binder_invitations_hash_length_check
    check (octet_length(token_hash) = 32),
  constraint binder_invitations_role_check
    check (max_role in ('manager', 'contributor', 'viewer')),
  constraint binder_invitations_general_role_check
    check (is_account_targeted or max_role in ('contributor', 'viewer')),
  constraint binder_invitations_target_check check (
    (is_account_targeted and (status <> 'pending' or intended_user_id is not null))
    or (not is_account_targeted and intended_user_id is null)
  ),
  constraint binder_invitations_status_check
    check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  constraint binder_invitations_response_check check (
    (status = 'accepted' and accepted_by_user_id is not null and used_at is not null and responded_at is not null)
    or (status in ('declined', 'revoked', 'expired') and responded_at is not null)
    or (status = 'pending' and responded_at is null and used_at is null and revoked_at is null)
  )
);

create table public.binder_view_links (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders(id) on delete restrict,
  created_by_user_id uuid null references auth.users(id) on delete set null,
  label text null,
  token_hash bytea not null,
  status text not null default 'active',
  expires_at timestamptz null,
  revoked_at timestamptz null,
  rotated_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint binder_view_links_token_hash_key unique (token_hash),
  constraint binder_view_links_hash_length_check check (octet_length(token_hash) = 32),
  constraint binder_view_links_label_check
    check (
      label is null
      or (
        label = btrim(label)
        and char_length(label) between 1 and 80
        and public.binder_text_safe_v1(label, false)
      )
    ),
  constraint binder_view_links_status_check
    check (status in ('active', 'revoked', 'rotated', 'expired')),
  constraint binder_view_links_status_timestamp_check check (
    (status = 'active' and revoked_at is null and rotated_at is null)
    or (status = 'revoked' and revoked_at is not null)
    or (status = 'rotated' and rotated_at is not null)
    or status = 'expired'
  )
);

create table public.binder_join_requests (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders(id) on delete restrict,
  requester_user_id uuid null references auth.users(id) on delete set null,
  requested_role_ceiling text not null default 'contributor',
  status text not null default 'pending',
  decision_user_id uuid null references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  responded_at timestamptz null,
  constraint binder_join_requests_role_check
    check (requested_role_ceiling in ('contributor', 'viewer')),
  constraint binder_join_requests_status_check
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  constraint binder_join_requests_live_requester_check
    check (status <> 'pending' or requester_user_id is not null),
  constraint binder_join_requests_response_check check (
    (status = 'pending' and responded_at is null and decision_user_id is null)
    or (status = 'withdrawn' and responded_at is not null)
    or (status in ('approved', 'rejected') and responded_at is not null and decision_user_id is not null)
  )
);

create unique index binder_join_requests_one_pending_idx
  on public.binder_join_requests (binder_id, requester_user_id)
  where status = 'pending';

create table public.binder_owner_transfer_offers (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders(id) on delete restrict,
  current_owner_user_id uuid null references auth.users(id) on delete set null,
  target_member_id uuid not null references public.binder_members(id) on delete restrict,
  target_user_id uuid null references auth.users(id) on delete set null,
  former_owner_role text not null default 'manager',
  status text not null default 'pending',
  expires_at timestamptz not null,
  responded_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint binder_owner_transfer_offers_former_role_check
    check (former_owner_role in ('manager', 'contributor', 'viewer', 'leave')),
  constraint binder_owner_transfer_offers_status_check
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  constraint binder_owner_transfer_offers_live_principal_check
    check (status <> 'pending' or (current_owner_user_id is not null and target_user_id is not null)),
  constraint binder_owner_transfer_offers_response_check
    check ((status = 'pending' and responded_at is null) or (status <> 'pending' and responded_at is not null))
);

create unique index binder_owner_transfer_one_pending_idx
  on public.binder_owner_transfer_offers (binder_id)
  where status = 'pending';

create table public.binder_contributions (
  id uuid primary key default gen_random_uuid(),
  public_action_ref uuid not null default gen_random_uuid(),
  binder_id uuid not null references public.binders(id) on delete restrict,
  contributor_member_id uuid not null references public.binder_members(id) on delete restrict,
  contributor_user_id uuid null references auth.users(id) on delete set null,
  contributor_membership_epoch integer not null,
  vault_item_instance_id uuid null references public.vault_item_instances(id) on delete set null,
  state text not null,
  snapshot_gv_vi_id text not null,
  snapshot_card_print_id uuid not null references public.card_prints(id) on delete restrict,
  snapshot_card_printing_id uuid null references public.card_printings(id) on delete restrict,
  source text not null default 'manual',
  added_by_user_id uuid null references auth.users(id) on delete set null,
  decided_by_user_id uuid null references auth.users(id) on delete set null,
  terminal_by_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint binder_contributions_public_action_ref_key unique (public_action_ref),
  activated_at timestamptz null,
  decided_at timestamptz null,
  terminal_at timestamptz null,
  constraint binder_contributions_state_check
    check (state in ('pending', 'active', 'withdrawn', 'removed', 'rejected', 'invalidated')),
  constraint binder_contributions_epoch_check
    check (contributor_membership_epoch >= 1),
  constraint binder_contributions_gvvi_check check (
    snapshot_gv_vi_id = upper(btrim(snapshot_gv_vi_id))
    and btrim(snapshot_gv_vi_id) <> ''
  ),
  constraint binder_contributions_source_check
    check (source in ('manual', 'bulk', 'legacy_preview', 'restore')),
  constraint binder_contributions_live_anchor_check check (
    state not in ('pending', 'active')
    or (contributor_user_id is not null and vault_item_instance_id is not null)
  ),
  constraint binder_contributions_state_timestamps_check check (
    (state = 'pending' and activated_at is null and terminal_at is null)
    or (state = 'active' and activated_at is not null and terminal_at is null)
    or (state in ('withdrawn', 'removed', 'rejected', 'invalidated') and terminal_at is not null)
  )
);

create unique index binder_contributions_one_live_copy_idx
  on public.binder_contributions (binder_id, vault_item_instance_id)
  where state in ('pending', 'active') and vault_item_instance_id is not null;

create table public.binder_activity_events (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders(id) on delete restrict,
  event_type text not null,
  actor_kind text not null,
  actor_user_id uuid null,
  service_source text null,
  correlation_id text null,
  subject_member_id uuid null references public.binder_members(id) on delete restrict,
  contribution_id uuid null references public.binder_contributions(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint binder_activity_events_event_type_check
    check (btrim(event_type) <> '' and char_length(event_type) <= 80),
  constraint binder_activity_events_actor_kind_check
    check (actor_kind in ('user', 'service')),
  constraint binder_activity_events_service_source_check
    check (
      service_source is null
      or service_source in (
        'vault_lifecycle',
        'canonical_catalog',
        'platform_moderation',
        'retention',
        'account_deletion',
        'template_moderation',
        'capability_expiry'
      )
    ),
  constraint binder_activity_events_actor_check check (
    (
      actor_kind = 'user'
      and actor_user_id is not null
      and service_source is null
      and correlation_id is null
    )
    or (
      actor_kind = 'service'
      and actor_user_id is null
      and service_source is not null
      and btrim(coalesce(correlation_id, '')) <> ''
    )
  ),
  constraint binder_activity_events_payload_check check (
    jsonb_typeof(payload) = 'object'
    and lower(payload::text) !~ '"(token|email|auth_user_id|user_id|vault_item_instance_id|gv_vi_id|certificate_number|acquisition_cost|private_note|photo_url)"[[:space:]]*:'
  )
);

create table public.binder_progress_crossings (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid not null references public.binders(id) on delete restrict,
  definition_revision integer not null,
  threshold integer not null,
  previous_percent integer not null,
  crossed_percent integer not null,
  created_at timestamptz not null default now(),
  constraint binder_progress_crossings_key
    unique (binder_id, definition_revision, threshold),
  constraint binder_progress_crossings_revision_check
    check (definition_revision >= 1),
  constraint binder_progress_crossings_threshold_check
    check (threshold in (25, 50, 75, 90, 100)),
  constraint binder_progress_crossings_percent_check check (
    previous_percent between 0 and 100
    and crossed_percent between 0 and 100
    and previous_percent < threshold
    and crossed_percent >= threshold
  )
);

create table public.binder_legacy_watch_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  source_watch_id uuid null references public.watches(id) on delete set null,
  decision text not null,
  resulting_binder_id uuid null references public.binders(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint binder_legacy_watch_decisions_source_key unique (source_watch_id),
  constraint binder_legacy_watch_decisions_decision_check
    check (decision in ('converted', 'dismissed')),
  constraint binder_legacy_watch_decisions_result_check check (
    (decision = 'converted' and resulting_binder_id is not null)
    or (decision = 'dismissed' and resulting_binder_id is null)
  )
);

create table public.binder_templates (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid(),
  authority_kind text not null,
  creator_user_id uuid null references auth.users(id) on delete set null,
  source_binder_id uuid null references public.binders(id) on delete restrict,
  system_key text null,
  title text not null,
  description text null,
  target_kind text not null,
  checklist_mode text not null,
  status text not null default 'pending',
  moderation_state text not null default 'clear',
  latest_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint binder_templates_public_id_key unique (public_id),
  constraint binder_templates_system_key_key unique (system_key),
  constraint binder_templates_authority_check
    check (authority_kind in ('system', 'custom_owner')),
  constraint binder_templates_authority_source_check check (
    (authority_kind = 'system' and creator_user_id is null and system_key is not null)
    or (authority_kind = 'custom_owner' and creator_user_id is not null and source_binder_id is not null and system_key is null)
  ),
  constraint binder_templates_title_check
    check (
      title = btrim(title)
      and char_length(title) between 1 and 80
      and public.binder_text_safe_v1(title, false)
    ),
  constraint binder_templates_description_check
    check (
      description is null
      or (
        char_length(description) <= 1000
        and public.binder_text_safe_v1(description, true)
      )
    ),
  constraint binder_templates_target_check
    check (target_kind in ('species', 'set', 'custom')),
  constraint binder_templates_mode_check check (
    (target_kind = 'species' and checklist_mode in ('card_prints', 'master_variants'))
    or (target_kind = 'set' and checklist_mode = 'master_set')
    or (target_kind = 'custom' and checklist_mode = 'custom')
  ),
  constraint binder_templates_status_check
    check (status in ('pending', 'published', 'rejected', 'removed')),
  constraint binder_templates_moderation_check
    check (moderation_state in ('clear', 'frozen', 'removed')),
  constraint binder_templates_latest_version_check check (latest_version >= 0)
);

create table public.binder_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.binder_templates(id) on delete restrict,
  version_number integer not null,
  definition jsonb not null,
  checklist_hash text not null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint binder_template_versions_key unique (template_id, version_number),
  constraint binder_template_versions_number_check check (version_number >= 1),
  constraint binder_template_versions_definition_check check (jsonb_typeof(definition) = 'object'),
  constraint binder_template_versions_hash_check check (btrim(checklist_hash) <> '')
);

create table public.binder_template_adoptions (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.binder_template_versions(id) on delete restrict,
  binder_id uuid not null references public.binders(id) on delete restrict,
  adopter_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint binder_template_adoptions_binder_key unique (binder_id)
);

create table public.binder_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  actor_key text not null,
  actor_user_id uuid null,
  operation text not null,
  idempotency_key text not null,
  binder_id uuid null references public.binders(id) on delete restrict,
  response jsonb not null,
  created_at timestamptz not null default now(),
  constraint binder_idempotency_keys_key
    unique (actor_key, operation, idempotency_key),
  constraint binder_idempotency_keys_actor_check
    check (btrim(actor_key) <> '' and char_length(actor_key) <= 160),
  constraint binder_idempotency_keys_operation_check
    check (btrim(operation) <> '' and char_length(operation) <= 100),
  constraint binder_idempotency_keys_idempotency_check
    check (
      char_length(idempotency_key) = 64
      and idempotency_key ~ '^[0-9a-f]{64}$'
    ),
  constraint binder_idempotency_keys_response_check check (
    jsonb_typeof(response) = 'object'
    and lower(response::text) !~ '"(token|url|invite_token|view_token)"[[:space:]]*:'
  )
);

create table public.binder_rate_limit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null,
  binder_id uuid null references public.binders(id) on delete restrict,
  action text not null,
  created_at timestamptz not null default now(),
  constraint binder_rate_limit_events_action_check
    check (btrim(action) <> '' and char_length(action) <= 80)
);

-- Bounded indexes used by dashboard, detail, exact-copy fanout, moderation,
-- capability lookup, and public discovery.
create index binders_owner_lifecycle_updated_idx
  on public.binders (owner_user_id, lifecycle, updated_at desc, id desc);
create index binders_public_discovery_idx
  on public.binders (created_at desc, id desc)
  where read_access = 'public' and discoverability = 'listed' and lifecycle = 'active';
create index binders_species_active_idx
  on public.binders (species_id, id) where target_kind = 'species' and lifecycle <> 'deleted_tombstone';
create index binders_set_active_idx
  on public.binders (set_id, id) where target_kind = 'set' and lifecycle <> 'deleted_tombstone';
create index binder_members_user_state_updated_idx
  on public.binder_members (user_id, state, updated_at desc, id desc);
create index binder_members_binder_state_role_idx
  on public.binder_members (binder_id, state, role, id);
create index binder_invitations_binder_pending_idx
  on public.binder_invitations (binder_id, expires_at, id) where status = 'pending';
create index binder_invitations_target_pending_idx
  on public.binder_invitations (intended_user_id, created_at desc, id desc) where status = 'pending';
create index binder_view_links_binder_active_idx
  on public.binder_view_links (binder_id, created_at desc, id) where status = 'active';
create index binder_join_requests_binder_pending_idx
  on public.binder_join_requests (binder_id, requested_at, id) where status = 'pending';
create index binder_contributions_binder_state_card_idx
  on public.binder_contributions (binder_id, state, snapshot_card_print_id, snapshot_card_printing_id);
create index binder_contributions_member_state_idx
  on public.binder_contributions (contributor_member_id, state, created_at desc, id desc);
create index binder_contributions_pending_queue_idx
  on public.binder_contributions (binder_id, created_at desc, id desc)
  where state = 'pending';
create index binder_contributions_instance_live_idx
  on public.binder_contributions (vault_item_instance_id, binder_id)
  where state in ('pending', 'active') and vault_item_instance_id is not null;
create index binder_activity_events_binder_created_idx
  on public.binder_activity_events (binder_id, created_at desc, id desc);
create index binder_custom_slots_revision_position_idx
  on public.binder_custom_slots (binder_id, definition_revision, active, position, id);
create index binder_custom_slots_revision_identity_idx
  on public.binder_custom_slots (
    binder_id,
    definition_revision,
    card_print_id,
    card_printing_id
  )
  where active is true;
create index binder_templates_public_idx
  on public.binder_templates (created_at desc, id desc)
  where status = 'published' and moderation_state = 'clear';
create index binder_template_adoptions_version_idx
  on public.binder_template_adoptions (template_version_id, created_at desc);
create index binder_rate_limit_actor_action_idx
  on public.binder_rate_limit_events (actor_user_id, action, created_at desc);
create index binder_idempotency_created_idx
  on public.binder_idempotency_keys (created_at);

-- Mutable-row timestamps.
create trigger trg_binder_feature_flags_updated_at
before update on public.binder_feature_flags
for each row execute function public.set_timestamp_updated_at();
create trigger trg_binders_updated_at
before update on public.binders
for each row execute function public.set_timestamp_updated_at();
create trigger trg_binder_members_updated_at
before update on public.binder_members
for each row execute function public.set_timestamp_updated_at();
create trigger trg_binder_templates_updated_at
before update on public.binder_templates
for each row execute function public.set_timestamp_updated_at();

-- Raw tables are service-only. App clients use guarded SECURITY DEFINER RPCs.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'binder_feature_flags',
    'binders',
    'binder_members',
    'binder_progress_state',
    'binder_custom_revisions',
    'binder_custom_slots',
    'binder_invitations',
    'binder_view_links',
    'binder_join_requests',
    'binder_owner_transfer_offers',
    'binder_contributions',
    'binder_activity_events',
    'binder_progress_crossings',
    'binder_legacy_watch_decisions',
    'binder_templates',
    'binder_template_versions',
    'binder_template_adoptions',
    'binder_idempotency_keys',
    'binder_rate_limit_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated', v_table);
    execute format('grant all on table public.%I to service_role', v_table);
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      v_table || '_service_role_all',
      v_table
    );
  end loop;
end;
$$;

-- Identity sequences inherit the platform's public-schema defaults separately
-- from their owning tables. Keep the rate-limit counter service-only too.
revoke all on sequence public.binder_rate_limit_events_id_seq
from public, anon, authenticated;
grant all on sequence public.binder_rate_limit_events_id_seq
to service_role;

-- Existing report authority is extended, not replaced. Direct authenticated
-- insertion remains available only for the pre-existing surfaces; Binder
-- surfaces must pass binder_report_v1.
alter table public.trust_reports
  drop constraint if exists trust_reports_surface_check;

alter table public.trust_reports
  add constraint trust_reports_surface_check check (
    surface in (
      'profile',
      'message',
      'wall_card',
      'listing',
      'card',
      'gvvi',
      'other',
      'binder',
      'binder_contribution',
      'binder_member',
      'binder_invitation'
    )
  );

drop policy if exists trust_reports_insert_reporter on public.trust_reports;
create policy trust_reports_insert_reporter
on public.trust_reports
for insert
to authenticated
with check (
  auth.uid() = reporter_user_id
  and (reported_user_id is null or auth.uid() <> reported_user_id)
  and surface not in (
    'binder',
    'binder_contribution',
    'binder_member',
    'binder_invitation'
  )
);

-- The arbitrary-user E1 helper is internal trigger/service authority only.
revoke all on function public.interest_graph_upsert_watch_v1(uuid, text, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.interest_graph_upsert_watch_v1(uuid, text, uuid, text, text)
to service_role;

create or replace function public.binder_require_user_v1()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;

create or replace function public.binder_feature_enabled_v1(p_flag_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_flag_key = 'schema_internal' then coalesce((
      select enabled
      from public.binder_feature_flags
      where flag_key = 'schema_internal'
    ), false)
    else
      coalesce((
        select enabled
        from public.binder_feature_flags
        where flag_key = 'schema_internal'
      ), false)
      and coalesce((
        select enabled
        from public.binder_feature_flags
        where flag_key = p_flag_key
      ), false)
  end;
$$;

-- Defined once in the schema migration because progress is compiled against
-- exact governed instance identity and pending migrations must not repeat a
-- function signature.
create or replace function public.binder_gvvi_valid_v1(
  p_user_id uuid,
  p_gv_vi_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner public.vault_owners%rowtype;
  v_prefix text;
  v_suffix text;
  v_instance_index bigint;
begin
  select * into v_owner
  from public.vault_owners
  where user_id = p_user_id;
  if not found or nullif(btrim(p_gv_vi_id), '') is null then
    return false;
  end if;

  v_prefix := 'GVVI-' || v_owner.owner_code || '-';
  if left(p_gv_vi_id, char_length(v_prefix)) <> v_prefix then
    return false;
  end if;
  v_suffix := substring(p_gv_vi_id from char_length(v_prefix) + 1);
  if v_suffix !~ '^[0-9]{6,}$' or char_length(v_suffix) > 19 then
    return false;
  end if;
  begin
    v_instance_index := v_suffix::bigint;
  exception when numeric_value_out_of_range then
    return false;
  end;
  return
    v_instance_index >= 1
    and v_instance_index < v_owner.next_instance_index
    and p_gv_vi_id = public.generate_gv_vi_id_v1(
      v_owner.owner_code,
      v_instance_index
    );
end;
$$;

create or replace function public.binder_role_rank_v1(p_role text)
returns integer
language sql
immutable
set search_path = pg_catalog
as $$
  select case lower(btrim(coalesce(p_role, '')))
    when 'viewer' then 1
    when 'contributor' then 2
    when 'manager' then 3
    when 'owner' then 4
    else 0
  end;
$$;

create or replace function public.binder_pair_blocked_v1(p_user_id uuid, p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is null
    or p_other_user_id is null
    or public.trust_block_exists_between_v1(p_user_id, p_other_user_id);
$$;

create or replace function public.binder_advisory_lock_v1(p_key text)
returns void
language sql
volatile
set search_path = pg_catalog
as $$
  select pg_advisory_xact_lock(hashtextextended(coalesce(p_key, ''), 0));
$$;

create or replace function public.binder_idempotency_get_v1(
  p_actor_key text,
  p_operation text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_response jsonb;
  v_key_hash text;
begin
  if btrim(coalesce(p_actor_key, '')) = ''
     or btrim(coalesce(p_operation, '')) = ''
     or btrim(coalesce(p_idempotency_key, '')) = ''
     or char_length(p_idempotency_key) > 128 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;
  v_key_hash := encode(
    extensions.digest(convert_to(p_idempotency_key, 'UTF8'), 'sha256'),
    'hex'
  );

  perform public.binder_advisory_lock_v1(
    'binder:idempotency:' || p_actor_key || ':' || p_operation || ':' || v_key_hash
  );

  select response
  into v_response
  from public.binder_idempotency_keys
  where actor_key = p_actor_key
    and operation = p_operation
    and idempotency_key = v_key_hash;

  return v_response;
end;
$$;

create or replace function public.binder_idempotency_store_v1(
  p_actor_key text,
  p_actor_user_id uuid,
  p_operation text,
  p_idempotency_key text,
  p_binder_id uuid,
  p_response jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_key_hash text;
begin
  if btrim(coalesce(p_actor_key, '')) = ''
     or btrim(coalesce(p_operation, '')) = ''
     or btrim(coalesce(p_idempotency_key, '')) = ''
     or char_length(p_idempotency_key) > 128 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;
  v_key_hash := encode(
    extensions.digest(convert_to(p_idempotency_key, 'UTF8'), 'sha256'),
    'hex'
  );
  insert into public.binder_idempotency_keys (
    actor_key,
    actor_user_id,
    operation,
    idempotency_key,
    binder_id,
    response
  ) values (
    p_actor_key,
    p_actor_user_id,
    p_operation,
    v_key_hash,
    p_binder_id,
    p_response
  )
  on conflict (actor_key, operation, idempotency_key)
  do nothing;

  return (
    select response
    from public.binder_idempotency_keys
    where actor_key = p_actor_key
      and operation = p_operation
      and idempotency_key = v_key_hash
  );
end;
$$;

create or replace function public.binder_rate_limit_assert_v1(
  p_actor_user_id uuid,
  p_binder_id uuid,
  p_action text,
  p_hour_limit integer,
  p_day_limit integer default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hour_count integer;
  v_day_count integer;
begin
  perform public.binder_advisory_lock_v1(
    'binder:rate:' || p_actor_user_id::text || ':' || p_action
  );

  select count(*)::integer
  into v_hour_count
  from public.binder_rate_limit_events
  where actor_user_id = p_actor_user_id
    and action = p_action
    and created_at >= now() - interval '1 hour';

  if v_hour_count >= p_hour_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if p_day_limit is not null then
    select count(*)::integer
    into v_day_count
    from public.binder_rate_limit_events
    where actor_user_id = p_actor_user_id
      and action = p_action
      and created_at >= now() - interval '24 hours';

    if v_day_count >= p_day_limit then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  insert into public.binder_rate_limit_events (
    actor_user_id,
    binder_id,
    action
  ) values (
    p_actor_user_id,
    p_binder_id,
    p_action
  );
end;
$$;

create or replace function public.binder_rate_limit_reserve_v1(
  p_actor_user_id uuid,
  p_binder_id uuid,
  p_action text,
  p_reservation_count integer,
  p_hour_limit integer,
  p_day_limit integer default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hour_count integer;
  v_day_count integer;
begin
  if p_reservation_count < 1 or p_reservation_count > p_hour_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  perform public.binder_advisory_lock_v1(
    'binder:rate:' || p_actor_user_id::text || ':' || p_action
  );

  select count(*)::integer
  into v_hour_count
  from public.binder_rate_limit_events
  where actor_user_id = p_actor_user_id
    and action = p_action
    and created_at >= now() - interval '1 hour';

  if v_hour_count + p_reservation_count > p_hour_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if p_day_limit is not null then
    select count(*)::integer
    into v_day_count
    from public.binder_rate_limit_events
    where actor_user_id = p_actor_user_id
      and action = p_action
      and created_at >= now() - interval '24 hours';

    if v_day_count + p_reservation_count > p_day_limit then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  insert into public.binder_rate_limit_events (
    actor_user_id,
    binder_id,
    action
  )
  select
    p_actor_user_id,
    p_binder_id,
    p_action
  from generate_series(1, p_reservation_count);
end;
$$;

create or replace function public.binder_append_activity_v1(
  p_binder_id uuid,
  p_event_type text,
  p_actor_kind text,
  p_actor_user_id uuid default null,
  p_service_source text default null,
  p_correlation_id text default null,
  p_subject_member_id uuid default null,
  p_contribution_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  insert into public.binder_activity_events (
    binder_id,
    event_type,
    actor_kind,
    actor_user_id,
    service_source,
    correlation_id,
    subject_member_id,
    contribution_id,
    payload
  ) values (
    p_binder_id,
    lower(btrim(p_event_type)),
    p_actor_kind,
    p_actor_user_id,
    p_service_source,
    p_correlation_id,
    p_subject_member_id,
    p_contribution_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.binder_contribution_matches_v1(
  p_binder_id uuid,
  p_card_print_id uuid,
  p_card_printing_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_binder public.binders%rowtype;
begin
  select * into v_binder
  from public.binders
  where id = p_binder_id;

  if not found or p_card_print_id is null then
    return false;
  end if;

  if v_binder.target_kind = 'species'
     and v_binder.checklist_mode = 'card_prints' then
    return exists (
      select 1
      from public.card_print_species cps
      where cps.species_id = v_binder.species_id
        and cps.card_print_id = p_card_print_id
        and cps.active is true
        and cps.counts_for_completion is true
    );
  end if;

  if v_binder.target_kind = 'custom' then
    return exists (
      select 1
      from public.binder_custom_slots slot
      where slot.binder_id = v_binder.id
        and slot.definition_revision = v_binder.definition_revision
        and slot.active is true
        and slot.card_print_id = p_card_print_id
        and (
          slot.card_printing_id is null
          or slot.card_printing_id = p_card_printing_id
        )
    );
  end if;

  -- Set and Species Master Variants fail closed until the governed slot
  -- authority named by the active contract exists.
  return false;
end;
$$;

create or replace function public.binder_progress_recalculate_v1(
  p_binder_id uuid,
  p_actor_kind text,
  p_actor_user_id uuid default null,
  p_service_source text default null,
  p_correlation_id text default null
)
returns public.binder_progress_state
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_binder public.binders%rowtype;
  v_previous public.binder_progress_state%rowtype;
  v_result public.binder_progress_state%rowtype;
  v_total integer := 0;
  v_member integer := 0;
  v_link integer := 0;
  v_public integer := 0;
  v_active_count integer := 0;
  v_unit text;
  v_previous_percent integer := 0;
  v_next_percent integer := 0;
  v_threshold integer;
  v_crossing_id uuid;
begin
  select * into v_binder
  from public.binders
  where id = p_binder_id
  for update;

  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_previous
  from public.binder_progress_state
  where binder_id = p_binder_id;

  if found and v_previous.total_slots > 0 then
    v_previous_percent := round(
      (v_previous.member_completed_slots::numeric / v_previous.total_slots::numeric) * 100
    )::integer;
  end if;

  if v_binder.target_kind = 'species'
     and v_binder.checklist_mode = 'card_prints' then
    v_unit := 'card_prints';

    select count(distinct cps.card_print_id)::integer
    into v_total
    from public.card_print_species cps
    where cps.species_id = v_binder.species_id
      and cps.active is true
      and cps.counts_for_completion is true;

    select
      count(distinct governed_slot.card_print_id) filter (
        where c.state = 'active'
      )::integer,
      count(distinct governed_slot.card_print_id) filter (
        where c.state = 'active'
          and m.content_scope in ('link', 'public')
          and m.content_consent_epoch = m.membership_epoch
          and m.content_consent_revision = v_binder.external_projection_revision
      )::integer,
      count(distinct governed_slot.card_print_id) filter (
        where c.state = 'active'
          and m.content_scope = 'public'
          and m.content_consent_epoch = m.membership_epoch
          and m.content_consent_revision = v_binder.external_projection_revision
      )::integer,
      count(*) filter (where c.state = 'active')::integer
    into v_member, v_link, v_public, v_active_count
    from public.binder_contributions c
    join public.binder_members m
      on m.id = c.contributor_member_id
     and m.binder_id = c.binder_id
     and m.user_id = c.contributor_user_id
     and m.state = 'active'
     and m.role <> 'viewer'
     and m.membership_epoch = c.contributor_membership_epoch
     and not public.binder_pair_blocked_v1(m.user_id, v_binder.owner_user_id)
    join public.vault_item_instances vii
      on vii.id = c.vault_item_instance_id
     and vii.user_id = c.contributor_user_id
     and vii.archived_at is null
     and public.binder_gvvi_valid_v1(vii.user_id, vii.gv_vi_id)
    left join public.slab_certs slab
      on slab.id = vii.slab_cert_id
    join public.card_print_species governed_slot
      on governed_slot.species_id = v_binder.species_id
     and governed_slot.card_print_id = coalesce(vii.card_print_id, slab.card_print_id)
     and governed_slot.active is true
     and governed_slot.counts_for_completion is true
    where c.binder_id = p_binder_id
      and vii.gv_vi_id = c.snapshot_gv_vi_id
      and coalesce(vii.card_print_id, slab.card_print_id)
            is not distinct from c.snapshot_card_print_id
      and vii.card_printing_id
            is not distinct from c.snapshot_card_printing_id
      and (
        vii.card_printing_id is null
        or exists (
          select 1
          from public.card_printings cpn
          where cpn.id = vii.card_printing_id
            and cpn.card_print_id = coalesce(vii.card_print_id, slab.card_print_id)
        )
      );
  elsif v_binder.target_kind = 'custom' then
    v_unit := 'custom_slots';

    select count(*)::integer
    into v_total
    from public.binder_custom_slots slot
    where slot.binder_id = p_binder_id
      and slot.definition_revision = v_binder.definition_revision
      and slot.active is true;

    with valid_contributions as materialized (
      select
        c.vault_item_instance_id,
        coalesce(vii.card_print_id, slab.card_print_id) as card_print_id,
        vii.card_printing_id,
        m.content_scope,
        m.membership_epoch,
        m.content_consent_epoch,
        m.content_consent_revision
      from public.binder_contributions c
      join public.binder_members m
        on m.id = c.contributor_member_id
       and m.binder_id = c.binder_id
       and m.user_id = c.contributor_user_id
       and m.state = 'active'
       and m.role <> 'viewer'
       and m.membership_epoch = c.contributor_membership_epoch
       and not public.binder_pair_blocked_v1(m.user_id, v_binder.owner_user_id)
      join public.vault_item_instances vii
        on vii.id = c.vault_item_instance_id
       and vii.user_id = c.contributor_user_id
       and vii.archived_at is null
       and public.binder_gvvi_valid_v1(vii.user_id, vii.gv_vi_id)
       and vii.gv_vi_id = c.snapshot_gv_vi_id
      left join public.slab_certs slab on slab.id = vii.slab_cert_id
      where c.binder_id = p_binder_id
        and c.state = 'active'
        and coalesce(vii.card_print_id, slab.card_print_id)
              is not distinct from c.snapshot_card_print_id
        and vii.card_printing_id
              is not distinct from c.snapshot_card_printing_id
        and (
          vii.card_printing_id is null
          or exists (
            select 1
            from public.card_printings printing
            where printing.id = vii.card_printing_id
              and printing.card_print_id = coalesce(
                vii.card_print_id,
                slab.card_print_id
              )
          )
        )
        and exists (
          select 1
          from public.binder_custom_slots current_slot
          where current_slot.binder_id = p_binder_id
            and current_slot.definition_revision = v_binder.definition_revision
            and current_slot.active is true
            and current_slot.card_print_id = coalesce(
              vii.card_print_id,
              slab.card_print_id
            )
            and (
              current_slot.card_printing_id is null
              or current_slot.card_printing_id = vii.card_printing_id
            )
        )
    ),
    slot_coverage as (
      select
        slot.id,
        slot.required_quantity,
        count(distinct valid.vault_item_instance_id) as member_qty,
        count(distinct valid.vault_item_instance_id) filter (
          where valid.content_scope in ('link', 'public')
            and valid.content_consent_epoch = valid.membership_epoch
            and valid.content_consent_revision = v_binder.external_projection_revision
        ) as link_qty,
        count(distinct valid.vault_item_instance_id) filter (
          where valid.content_scope = 'public'
            and valid.content_consent_epoch = valid.membership_epoch
            and valid.content_consent_revision = v_binder.external_projection_revision
        ) as public_qty
      from public.binder_custom_slots slot
      left join valid_contributions valid
        on valid.card_print_id = slot.card_print_id
       and (
         slot.card_printing_id is null
         or slot.card_printing_id = valid.card_printing_id
       )
      where slot.binder_id = p_binder_id
        and slot.definition_revision = v_binder.definition_revision
        and slot.active is true
      group by slot.id, slot.required_quantity
    )
    select
      count(*) filter (where member_qty >= required_quantity)::integer,
      count(*) filter (where link_qty >= required_quantity)::integer,
      count(*) filter (where public_qty >= required_quantity)::integer,
      (select count(*)::integer from valid_contributions)
    into v_member, v_link, v_public, v_active_count
    from slot_coverage;
  else
    v_unit := 'finish_options';
    v_total := 0;
    v_member := 0;
    v_link := 0;
    v_public := 0;
    v_active_count := 0;
  end if;

  insert into public.binder_progress_state (
    binder_id,
    definition_revision,
    unit,
    total_slots,
    member_completed_slots,
    link_completed_slots,
    public_completed_slots,
    active_contribution_count,
    updated_at
  ) values (
    p_binder_id,
    v_binder.definition_revision,
    v_unit,
    coalesce(v_total, 0),
    least(coalesce(v_member, 0), coalesce(v_total, 0)),
    least(coalesce(v_link, 0), coalesce(v_total, 0)),
    least(coalesce(v_public, 0), coalesce(v_total, 0)),
    coalesce(v_active_count, 0),
    now()
  )
  on conflict (binder_id) do update
  set
    definition_revision = excluded.definition_revision,
    unit = excluded.unit,
    total_slots = excluded.total_slots,
    member_completed_slots = excluded.member_completed_slots,
    link_completed_slots = excluded.link_completed_slots,
    public_completed_slots = excluded.public_completed_slots,
    active_contribution_count = excluded.active_contribution_count,
    updated_at = excluded.updated_at
  returning * into v_result;

  if v_result.total_slots > 0 then
    v_next_percent := round(
      (v_result.member_completed_slots::numeric / v_result.total_slots::numeric) * 100
    )::integer;
  end if;

  if v_next_percent > v_previous_percent then
    foreach v_threshold in array array[25, 50, 75, 90, 100]
    loop
      if v_previous_percent < v_threshold and v_next_percent >= v_threshold then
        v_crossing_id := null;
        insert into public.binder_progress_crossings (
          binder_id,
          definition_revision,
          threshold,
          previous_percent,
          crossed_percent
        ) values (
          p_binder_id,
          v_binder.definition_revision,
          v_threshold,
          v_previous_percent,
          v_next_percent
        )
        on conflict (binder_id, definition_revision, threshold) do nothing
        returning id into v_crossing_id;

        if v_crossing_id is not null then
          perform public.binder_append_activity_v1(
            p_binder_id => p_binder_id,
            p_event_type => 'milestone_crossed',
            p_actor_kind => p_actor_kind,
            p_actor_user_id => p_actor_user_id,
            p_service_source => p_service_source,
            p_correlation_id => p_correlation_id,
            p_payload => jsonb_build_object(
              'threshold', v_threshold,
              'completed_slots', v_result.member_completed_slots,
              'total_slots', v_result.total_slots,
              'unit', v_result.unit
            )
          );
        end if;
      end if;
    end loop;
  end if;

  return v_result;
end;
$$;

create or replace function public.binder_assert_custom_slot_parent_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent uuid;
  v_revision public.binder_custom_revisions%rowtype;
begin
  select * into v_revision
  from public.binder_custom_revisions
  where id = new.revision_id;

  if not found
     or v_revision.binder_id <> new.binder_id
     or v_revision.revision <> new.definition_revision then
    raise exception 'custom_revision_mismatch' using errcode = '23514';
  end if;

  if new.card_printing_id is not null then
    select card_print_id into v_parent
    from public.card_printings
    where id = new.card_printing_id;

    if v_parent is null or v_parent <> new.card_print_id then
      raise exception 'printing_parent_mismatch' using errcode = '23514';
    end if;
  end if;

  -- Without a slot-allocation anchor, a wildcard parent slot and any
  -- finish-specific slot for the same card would let one exact copy satisfy
  -- multiple checklist slots. Quantity belongs on one slot instead.
  if exists (
    select 1
    from public.binder_custom_slots existing
    where existing.binder_id = new.binder_id
      and existing.definition_revision = new.definition_revision
      and existing.card_print_id = new.card_print_id
      and existing.active is true
      and (
        existing.card_printing_id is null
        or new.card_printing_id is null
      )
  ) then
    raise exception 'overlapping_custom_slot' using errcode = '23514';
  end if;
  if coalesce((
    select sum(existing.required_quantity)
    from public.binder_custom_slots existing
    where existing.binder_id = new.binder_id
      and existing.definition_revision = new.definition_revision
      and existing.active is true
  ), 0) + new.required_quantity > 25000 then
    raise exception 'custom_copy_capacity_exceeded' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger trg_binder_custom_slots_parent_v1
before insert on public.binder_custom_slots
for each row execute function public.binder_assert_custom_slot_parent_v1();

create or replace function public.binder_assert_owner_invariant_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_binder_id uuid;
  v_binder public.binders%rowtype;
  v_owner_count integer;
begin
  if tg_table_name = 'binders' then
    v_binder_id := coalesce(new.id, old.id);
  else
    v_binder_id := coalesce(new.binder_id, old.binder_id);
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id;

  if not found then
    return null;
  end if;

  select count(*)::integer
  into v_owner_count
  from public.binder_members m
  where m.binder_id = v_binder_id
    and m.role = 'owner'
    and m.state = 'active'
    and m.user_id is not distinct from v_binder.owner_user_id;

  if v_binder.lifecycle in ('active', 'archived') and v_owner_count <> 1 then
    raise exception 'binder_owner_invariant_violation' using errcode = '23514';
  end if;

  if v_binder.lifecycle = 'deleted_tombstone'
     and exists (
       select 1
       from public.binder_members m
       where m.binder_id = v_binder_id
         and m.role = 'owner'
         and m.state = 'active'
     ) then
    raise exception 'binder_tombstone_owner_invariant_violation' using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger trg_binders_owner_invariant_v1
after insert or update or delete on public.binders
deferrable initially deferred
for each row execute function public.binder_assert_owner_invariant_v1();

create constraint trigger trg_binder_members_owner_invariant_v1
after insert or update or delete on public.binder_members
deferrable initially deferred
for each row execute function public.binder_assert_owner_invariant_v1();

create or replace function public.binder_append_only_guard_v1()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'binder_activity_events',
    'binder_progress_crossings',
    'binder_legacy_watch_decisions',
    'binder_template_versions',
    'binder_template_adoptions',
    'binder_idempotency_keys',
    'binder_rate_limit_events',
    'binder_custom_revisions',
    'binder_custom_slots'
  ]
  loop
    execute format(
      'create trigger %I before update or delete on public.%I for each row execute function public.binder_append_only_guard_v1()',
      'trg_' || v_table || '_append_only_v1',
      v_table
    );
  end loop;
end;
$$;

-- Helpers are never app entrypoints.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.binder_require_user_v1()',
    'public.binder_text_safe_v1(text,boolean)',
    'public.binder_feature_enabled_v1(text)',
    'public.binder_role_rank_v1(text)',
    'public.binder_pair_blocked_v1(uuid,uuid)',
    'public.binder_advisory_lock_v1(text)',
    'public.binder_idempotency_get_v1(text,text,text)',
    'public.binder_idempotency_store_v1(text,uuid,text,text,uuid,jsonb)',
    'public.binder_rate_limit_assert_v1(uuid,uuid,text,integer,integer)',
    'public.binder_rate_limit_reserve_v1(uuid,uuid,text,integer,integer,integer)',
    'public.binder_append_activity_v1(uuid,text,text,uuid,text,text,uuid,uuid,jsonb)',
    'public.binder_contribution_matches_v1(uuid,uuid,uuid)',
    'public.binder_progress_recalculate_v1(uuid,text,uuid,text,text)',
    'public.binder_assert_custom_slot_parent_v1()',
    'public.binder_assert_owner_invariant_v1()',
    'public.binder_append_only_guard_v1()'
  ]
  loop
    execute 'revoke all on function ' || v_signature || ' from public, anon, authenticated';
  end loop;
end;
$$;

comment on table public.binders is
  'Collaborative Binder identity and policy authority. It references cards but never owns or transfers them.';
comment on table public.binder_members is
  'Binder-scoped authenticated roles, membership epochs, aliases, external consent, and notification preference.';
comment on table public.binder_contributions is
  'Explicit exact-copy links. Live rows require an active governed GVVI and never change Vault ownership or intent.';
comment on table public.binder_activity_events is
  'Append-only Binder-private audit/activity stream. Payloads exclude tokens and private exact-copy data.';
comment on table public.binder_progress_state is
  'Transactionally refreshed member/link/public completion counters. Stored percentage is never authoritative.';
comment on table public.binder_feature_flags is
  'Default-off, independently controlled Binder rollout gates.';

commit;
