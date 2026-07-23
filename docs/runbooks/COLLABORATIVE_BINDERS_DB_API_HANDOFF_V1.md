# Collaborative Binders Database API Handoff V1

## Status

Non-normative implementation handoff for the approved
`COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1`.

- Database implementation: complete on the collaborative-Binders branch.
- Verification: complete against a clean local Supabase replay.
- Remote apply: not performed.
- Rollout state: all Binder feature flags default to `false`.
- Canonical domain: `https://grookaivault.com`.

The active
[`COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1`](../contracts/COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1.md)
is the sole normative Binder system contract. This runbook describes the
implemented RPC boundary that mobile, web, and service code should call; it
does not create or amend product requirements.

## Source

The API is installed by these forward-only migrations, in order:

1. `20260723100000_collaborative_binders_schema_v1.sql`
2. `20260723101000_collaborative_binders_core_rpcs_v1.sql`
3. `20260723102000_collaborative_binders_collaboration_rpcs_v1.sql`
4. `20260723103000_collaborative_binders_read_rpcs_v1.sql`
5. `20260723104000_collaborative_binders_service_rpcs_v1.sql`

No client should query or mutate a raw Binder domain table. The supported
surface is the RPC set below plus the sanitized Realtime refresh table.

## Calling Rules

- Call through `supabase.rpc(...)` and pass the exact `p_*` argument names.
- Authenticated RPCs derive the actor from `auth.uid()`. No client RPC accepts
  an acting user ID.
- Every mutation requires a nonblank `p_idempotency_key` of at most 128
  characters.
- Reuse the same idempotency key only when retrying the same logical operation.
  Keys are SHA-256 hashed before persistence.
- Successful JSON responses use an allow-listed `{ "ok": true, ... }`
  envelope.
- Missing, revoked, blocked, unauthorized-to-discover, and otherwise private
  resources generally converge on `unavailable`.
- Treat IDs and cursors as opaque.
- Send null explicitly when an optional nullable field is meant to be cleared.
  In particular, `binder_update_metadata_v1.p_cover_card_print_id = null`
  clears the cover.
- Render all returned text as text, never as HTML.

`binder_refresh_signal_visible_v1` and
`binder_card_event_visible_to_viewer_v1` have narrow authenticated execute
grants because RLS/Pulse composition evaluates them under an authenticated
session. They are internal predicates, not application entrypoints; clients
must not call them directly.

Invitation and view-link creation/rotation return the plaintext capability
token only on the first successful response. The idempotent replay response
contains `token_available: false` and `replayed: true`; it does not reproduce
the secret. Store or present the first response immediately without logging
the token.

## Domain Values

| Field | Values |
| --- | --- |
| Target kind | `species`, `set`, `custom` |
| Checklist mode | Species currently creatable: `card_prints`; Species reserved/not yet shippable: `master_variants`; Set: `master_set`; Custom: `custom` |
| Role | `owner`, `manager`, `contributor`, `viewer` |
| Membership state | `active`, `suspended`, `left`, `removed` |
| Read access | `private`, `link`, `public` |
| Discoverability | `unlisted`, `listed` |
| Join policy | `closed`, `invite_only`, `request_to_join` |
| Contribution policy | `owner_only`, `members_direct`, `approval_required` |
| Binder lifecycle | `active`, `archived`, `deleted_tombstone` |
| Moderation state | `clear`, `forced_unlisted`, `frozen`, `removed` |
| Consent scope | `none`, `link`, `public` |
| Notification preference | `immediate`, `digest`, `muted` |
| Contribution state | `pending`, `active`, `withdrawn`, `removed`, `rejected`, `invalidated` |

`owner` is singular for every active or archived Binder. Ownership transfer is
an offer/accept operation and never creates an owner gap.

## Feature Gates

All gates are independently stored in `binder_feature_flags` and default off.

| Flag | Enables |
| --- | --- |
| `schema_internal` | Base schema/RPC kill switch |
| `personal` | Species/personal Binders |
| `set_binders` | Set Binder targets |
| `custom` | Custom checklist Binders |
| `shared` | Membership, invitations, and collaborative writes |
| `view_links` | Revocable view-only capabilities |
| `public` | Public projections |
| `community` | Explore, request-to-join, and community flows |
| `templates` | Template submission, publication, listing, and cloning |
| `notifications` | Binder notification integration |
| `pulse_milestones` | Explicit Binder milestone sharing to Pulse |

Clients must still handle a disabled gate after a screen has loaded. A flag
change can invalidate permissions immediately.

## Authenticated Read RPCs

These functions require an authenticated user. Member-scoped functions enforce
active membership and role server-side.

| RPC | Parameters | Result purpose |
| --- | --- | --- |
| `binder_dashboard_v1` | `p_limit`, `p_before_updated_at`, `p_before_id` | Active/archived Binder cards, suspended Binder summaries, invitations, and next cursor |
| `binder_suspended_binders_v1` | `p_limit`, `p_before_updated_at`, `p_before_id` | Dedicated suspended-membership page |
| `binder_invitation_inbox_v1` | `p_limit`, `p_before_created_at`, `p_before_id` | Account-targeted pending invitations |
| `binder_detail_v1` | `p_public_id` | Bounded member workspace model: Binder, viewer, consent, permissions, progress, counts, management queues, links, and transfer state |
| `binder_pending_contributions_v1` | `p_public_id`, `p_limit`, `p_before_created_at`, `p_before_id` | Owner/Manager approval queue |
| `binder_join_requests_queue_v1` | `p_public_id`, `p_limit`, `p_before_requested_at`, `p_before_id` | Owner/Manager community join queue |
| `binder_checklist_v1` | `p_public_id`, `p_filter`, `p_limit`, `p_after_position` | Member checklist page and member-visible contribution state |
| `binder_activity_v1` | `p_public_id`, `p_limit`, `p_before_created_at`, `p_before_id` | Sanitized Binder activity feed |
| `binder_members_v1` | `p_public_id`, `p_limit`, `p_after_member_id` | Binder member page with lawful labels and permissions |
| `binder_eligible_copies_v1` | `p_public_id`, `p_limit`, `p_after_created_at`, `p_after_instance_id` | Caller-owned Vault copies eligible for one-at-a-time contribution |
| `binder_bulk_preview_v1` | `p_public_id`, `p_limit`, `p_after_created_at`, `p_after_instance_id` | Bounded preview for bulk add |
| `binder_invitation_preview_v1` | `p_token` | Secret invitation preview after account/block/expiry checks |
| `binder_legacy_candidates_v1` | none | Reviewed legacy watch candidates eligible for conversion or dismissal |

Checklist filters are:

- `all`
- `missing`
- `completed`
- `pending`
- `mine`

The checklist page is limited before card/contribution enrichment, so a
1,000-slot Binder does not enrich the full checklist for a 50-row request.

## Anonymous or Authenticated Sanitized Reads

These functions are the only supported external projections. They never return
raw Vault rows, raw storage paths, private membership columns, or private
activity payloads.

| RPC | Parameters | Result purpose |
| --- | --- | --- |
| `binder_public_detail_v1` | `p_public_id` | Moderated public Binder summary and progress |
| `binder_public_checklist_v1` | `p_public_id`, `p_limit`, `p_after_position` | Public-consented checklist page |
| `binder_view_link_detail_v1` | `p_token` | Revocable, unlisted link projection |
| `binder_view_link_checklist_v1` | `p_token`, `p_limit`, `p_after_position` | Link-consented checklist page |
| `binder_explore_v1` | `p_limit`, `p_before_created_at`, `p_before_id` | Listed, moderated community discovery |
| `binder_templates_v1` | `p_limit`, `p_before_created_at`, `p_before_id` | Published template library |
| `binder_template_detail_v1` | `p_public_id` | Published immutable template version metadata |
| `binder_template_checklist_v1` | `p_public_id`, `p_version`, `p_limit`, `p_after_position` | Published template checklist page |

Public projection may include opaque action references for an authenticated
viewer. Anonymous projection does not include moderation action references.
Use only those opaque references with the public report/block RPCs below.

## Core Authenticated Mutations

| RPC | Parameters | Purpose |
| --- | --- | --- |
| `binder_create_v1` | `p_title`, `p_target_kind`, `p_checklist_mode`, `p_idempotency_key`, `p_description`, `p_species_id`, `p_set_id`, `p_cover_card_print_id`, `p_custom_slots` | Create a Binder and its owner membership |
| `binder_update_metadata_v1` | `p_public_id`, `p_title`, `p_description`, `p_cover_card_print_id`, `p_idempotency_key` | Owner/Manager metadata update |
| `binder_update_policy_v1` | `p_public_id`, `p_read_access`, `p_discoverability`, `p_join_policy`, `p_contribution_policy`, `p_idempotency_key` | Owner visibility/collaboration policy update |
| `binder_set_lifecycle_v1` | `p_public_id`, `p_lifecycle`, `p_idempotency_key` | Owner archive or restore |
| `binder_delete_v1` | `p_public_id`, `p_confirmation`, `p_idempotency_key` | Owner tombstone deletion; confirmation must be `DELETE {current title}` |
| `binder_member_preferences_v1` | `p_public_id`, `p_alias`, `p_content_scope`, `p_identity_scope`, `p_notification_preference`, `p_idempotency_key` | Binder-scoped alias, consent, and notification preference |
| `binder_custom_revision_publish_v1` | `p_public_id`, `p_slots`, `p_idempotency_key` | Publish immutable custom checklist revision and recalculate coverage |

Custom creation/revision accepts at most 1,000 slots and at most 25,000 total
required copies. A slot contains `card_print_id`, optional
`card_printing_id`, and `required_quantity`.

## Contribution Mutations

| RPC | Parameters | Purpose |
| --- | --- | --- |
| `binder_contribution_add_v1` | `p_public_id`, `p_vault_item_instance_id`, `p_idempotency_key`, `p_source = 'manual'` | Add caller-owned exact copy; activates or queues according to policy |
| `binder_bulk_add_v1` | `p_public_id`, `p_vault_item_instance_ids`, `p_idempotency_key` | Add 1–100 distinct caller-owned exact copies with per-item outcomes |
| `binder_contribution_withdraw_v1` | `p_contribution_id`, `p_idempotency_key` | Contributor withdraws own pending/active copy |
| `binder_contribution_decide_v1` | `p_contribution_id`, `p_decision`, `p_idempotency_key` | Owner/Manager `approve` or `reject` pending contribution |
| `binder_contribution_remove_v1` | `p_contribution_id`, `p_reason`, `p_idempotency_key` | Owner/Manager removes a lawful contribution |

The server revalidates exact-copy ownership, active membership, membership
epoch, Binder target, contribution policy, block state, Vault archival, and
capacity inside the write transaction. The client must never infer acceptance
from its preview.

## Invitations and View Links

| RPC | Parameters | Purpose |
| --- | --- | --- |
| `binder_invite_create_v1` | `p_public_id`, `p_max_role`, `p_idempotency_key`, `p_recipient_user_id`, `p_expires_at` | Owner/Manager creates account-targeted or general one-use invite |
| `binder_invite_accept_v1` | `p_token`, `p_idempotency_key` | Accept token invitation |
| `binder_invite_decline_v1` | `p_token`, `p_idempotency_key` | Decline token invitation |
| `binder_invite_respond_v1` | `p_invitation_id`, `p_decision`, `p_idempotency_key` | Account inbox `accept` or `decline` |
| `binder_invite_revoke_v1` | `p_invitation_id`, `p_idempotency_key` | Owner/Manager revokes pending invitation |
| `binder_view_link_create_v1` | `p_public_id`, `p_idempotency_key`, `p_label`, `p_expires_at` | Owner creates revocable view-only link |
| `binder_view_link_rotate_v1` | `p_view_link_id`, `p_idempotency_key` | Atomically revoke old link and return a new capability once |
| `binder_view_link_revoke_v1` | `p_view_link_id`, `p_idempotency_key` | Revoke active link |

Invitation expiry must be more than five minutes and no more than 30 days in
the future. General invitations cannot grant Manager; Manager invitations must
target an account and can be created only by the Owner.

After invitation redemption, route to the token-free Binder URL. Never place a
token in analytics, logs, crash reports, activity text, or cached state.

## Community, Membership, and Ownership Mutations

| RPC | Parameters | Purpose |
| --- | --- | --- |
| `binder_join_request_create_v1` | `p_public_id`, `p_idempotency_key` | Request to join a lawful community Binder |
| `binder_join_request_decide_v1` | `p_request_id`, `p_decision`, `p_role`, `p_idempotency_key` | Owner/Manager approve or reject |
| `binder_join_request_withdraw_v1` | `p_request_id`, `p_idempotency_key` | Requester withdraws pending request |
| `binder_member_change_role_v1` | `p_member_id`, `p_role`, `p_idempotency_key` | Authorized role change below Owner |
| `binder_member_suspend_v1` | `p_member_id`, `p_reason`, `p_idempotency_key` | Suspend member and close live contributions |
| `binder_member_reinstate_v1` | `p_member_id`, `p_idempotency_key` | Reinstate into a new membership epoch |
| `binder_member_remove_v1` | `p_member_id`, `p_reason`, `p_idempotency_key` | Remove member and close live contributions |
| `binder_leave_v1` | `p_public_id`, `p_idempotency_key` | Non-owner leaves; remains available as a safety action while blocked |
| `binder_owner_transfer_offer_v1` | `p_public_id`, `p_target_member_id`, `p_former_owner_role`, `p_idempotency_key`, `p_expires_at` | Owner creates transfer offer |
| `binder_owner_transfer_accept_v1` | `p_offer_id`, `p_idempotency_key` | Target accepts and becomes Owner atomically |
| `binder_owner_transfer_revoke_v1` | `p_offer_id`, `p_idempotency_key` | Current Owner revokes, or target declines, pending offer |

`p_former_owner_role` is `manager`, `contributor`, `viewer`, or `leave`.
Suspended membership still counts toward the account and Binder capacity.

## Safety Mutations

| RPC | Parameters | Purpose |
| --- | --- | --- |
| `binder_block_owner_v1` | `p_public_id`, `p_idempotency_key` | Lawful Binder viewer blocks the Owner |
| `binder_block_member_v1` | `p_member_id`, `p_idempotency_key` | Active Binder member blocks a lawful member target |
| `binder_public_member_block_v1` | `p_public_id`, `p_member_action_ref`, `p_idempotency_key` | Public surface block using opaque action reference |
| `binder_report_v1` | `p_surface`, `p_surface_id`, `p_reason`, `p_details`, `p_idempotency_key` | Member-surface report |
| `binder_invitation_report_v1` | `p_token`, `p_reason`, `p_details`, `p_idempotency_key` | Invitation report without exposing token authority |
| `binder_public_action_report_v1` | `p_public_id`, `p_surface`, `p_action_ref`, `p_reason`, `p_details`, `p_idempotency_key` | Public member/contribution/Binder report using opaque reference |

Report and public block calls intentionally return a generic success envelope
for valid, stale, random, and unauthorized targets. Do not use their response
as a discovery signal. Reasons are `spam`, `harassment`, `scam`,
`inappropriate`, or `other`; details are limited to 2,000 characters.

## Templates, Legacy Adoption, and Pulse

| RPC | Parameters | Purpose |
| --- | --- | --- |
| `binder_template_submit_v1` | `p_public_id`, `p_name`, `p_description`, `p_idempotency_key` | Submit current Binder definition for moderation |
| `binder_template_clone_v1` | `p_template_public_id`, `p_title`, `p_version_number`, `p_idempotency_key` | Clone published template into a private Binder |
| `binder_legacy_decide_v1` | `p_watch_id`, `p_decision`, `p_title`, `p_idempotency_key` | Convert or dismiss reviewed legacy watch |
| `binder_pulse_milestone_share_v1` | `p_public_id`, `p_threshold`, `p_idempotency_key` | Explicitly share a current crossed milestone to Pulse |

Milestone thresholds are `25`, `50`, `75`, `90`, and `100`. Sharing is
explicit; Binder activity does not automatically become Wall or Pulse content.

## Service-Role-Only RPCs

These functions reject normal clients even if called through an exposed REST
endpoint. Service calls require the expected service provenance and a nonblank
correlation ID.

| RPC | Parameters | Required provenance |
| --- | --- | --- |
| `binder_service_template_publish_v1` | `p_template_version_id`, `p_decision`, `p_correlation_id`, `p_idempotency_key` | `template_moderation` |
| `binder_service_vault_instance_changed_v1` | `p_vault_item_instance_id`, `p_correlation_id`, `p_idempotency_key` | `vault_lifecycle` |
| `binder_service_canonical_refresh_v1` | `p_binder_id`, `p_correlation_id`, `p_idempotency_key` | `canonical_catalog` |
| `binder_service_moderate_v1` | `p_binder_id`, `p_moderation_state`, `p_correlation_id`, `p_idempotency_key` | `platform_moderation` |
| `binder_service_account_delete_v1` | `p_user_id`, `p_correlation_id`, `p_idempotency_key` | `account_deletion` |
| `binder_service_retention_finalize_v1` | `p_binder_id`, `p_correlation_id`, `p_idempotency_key` | `retention` |
| `binder_service_expire_capabilities_v1` | `p_before`, `p_limit`, `p_correlation_id`, `p_idempotency_key` | `capability_expiry` |

Service functions take internal IDs because service jobs already possess trusted
internal authority. Client code must use Binder public IDs and opaque surface
references instead.

## Pagination

Pagination is keyset-based. Never calculate an offset.

| Surface | Maximum page | Cursor |
| --- | ---: | --- |
| Dashboard | 20 | `updated_at` + `id` |
| Suspended Binders | 20 | `updated_at` + `id` |
| Invitations, activity, pending contributions | 50 | `created_at` + `id` |
| Join requests | 50 | `requested_at` + `id` |
| Checklist/public/link/template checklist | 50 | `position` |
| Members | 50 | opaque member ID |
| Eligible copies | 50 | `created_at` + instance ID |
| Bulk preview | 100 | `created_at` + instance ID |
| Explore/templates | 20 | `created_at` + `id` |

Pass both fields from a composite cursor. Do not synthesize cursors from the
visible item list.

## Realtime

The only Binder table in `supabase_realtime` is
`public.binder_refresh_signals`.

It contains only:

- `binder_public_id`
- `revision`
- `changed_at`

Authenticated active members may select the row for their open Binder through
RLS. Anonymous users, outsiders, suspended members, removed Binders, and users
after the schema kill switch cannot read it.

Subscribe only while the member Binder is open, filter by
`binder_public_id`, debounce INSERT/UPDATE events, and refetch the guarded RPCs.
The signal is invalidation authority, not a domain event or payload. No raw
Binder activity, member, contribution, policy, actor, or token data is
published.

## Media Projection

All Binder card JSON uses the Grookai canonical proxy:

`https://grookaivault.com/api/canon/cards/{gv_id}/image`

Responses do not expose `image_path`, direct storage paths, or third-party
source URLs. Public listed covers require a hosted canonical image. A client
may apply its normal UI fallback only when the guarded response has no usable
canonical image.

## Error Handling

Use the Postgres error message as the stable Binder error discriminator for V1.

| Message | Client behavior |
| --- | --- |
| `not_authenticated` | Require sign-in |
| `unavailable` | Show generic unavailable/revoked/no-access state |
| `not_authorized` | Refresh permissions; show role-safe denial |
| `feature_disabled` or target-specific disabled error | Exit the gated flow and refresh navigation |
| `capacity` | Explain the relevant server limit and do not retry automatically |
| `rate_limited` | Back off; retain the idempotency key for the same operation |
| `conflict` | Refetch; the requested state already changed or exact copy is already live |
| `invalid_*`, `hosted_cover_required`, `overlapping_custom_slot`, `printing_parent_mismatch`, `custom_revision_mismatch` | Correct submitted input |

Internal invariant messages such as owner, fanout, contribution-capacity, or
template immutability violations are operational alerts. Do not translate them
into an optimistic client state.

## Server Limits

| Limit | V1 value |
| --- | ---: |
| Active/archived Binders owned by one account | 20 |
| Active/suspended Binder memberships per account | 100 |
| Active/suspended members per Binder | 50 |
| Pending invitations per Binder | 20 |
| Active view links per Binder | 5 |
| Active contributions per Binder | 25,000 |
| Live Binder references per exact Vault instance | 20 |
| Bulk contribution batch | 100 |
| Custom checklist slots | 1,000 |
| Title | 80 characters |
| Description | 1,000 characters |
| Binder alias | 40 characters |
| Invitations | 10/hour and 50/day per actor |
| Contribution mutations | 120/hour per member |

Limits are enforced transactionally. UI limits are hints, not authority.

## Verified Local Evidence

The final clean local replay produced:

- all five migrations applied successfully;
- pgTAP contract suite: `127/127`;
- synchronized boundary races: `10/10`, covering duplicate contribution,
  member removal, Vault archival, invitation replay, visibility/approval,
  ownership/invite mutation, duplicate milestone crossing, per-Binder
  membership `49 -> 50`, account membership `99 -> 100`, and exact-copy fanout
  `19 -> 20`;
- destructive terminal races: `5/5` iterations for Withdraw/Delete and
  AccountDelete/Delete, with no deadlock or timeout;
- load fixture: 50 active members, 1,000 custom slots, and 25,000 active
  contributions;
- 20-sample local p95: checklist `141.76 ms`, contribution add `180.46 ms`,
  contribution withdraw `177.41 ms`, dashboard `1.26 ms`, detail `1.38 ms`;
- Binder functions reported no issues in `supabase db lint --local --level
  warning`;
- zero default `PUBLIC` execute grants on Binder functions;
- zero anonymous raw Binder table privileges;
- zero authenticated raw Binder mutations;
- authenticated raw SELECT limited to `binder_refresh_signals`;
- every Binder function has a fixed `search_path`;
- all feature flags are disabled after clean replay.

The load and race fixtures clean up after themselves or run inside a rolled-back
transaction. These results are local proof only and do not authorize or imply a
remote database apply.
