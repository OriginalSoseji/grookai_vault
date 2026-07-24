# COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1

## Status

**ACTIVE — OWNER APPROVED**

Date: 2026-07-23

Approved: 2026-07-23

Branch: `codex/collaborative-binders-v1`

Parent: `codex/dex-ux-adoption-v1` at
`cf7294aa01ae971c184bf89d2ded8036c8d3eaaa`

This contract authorizes no implementation, migration, remote database change,
deployment, notification, public launch, or conversion of existing data.

Activation record:

1. The Grookai owner explicitly approved this version on 2026-07-23.
2. The review decisions at the end of this document were accepted as written.
3. This contract is listed as Active in `docs/CONTRACT_INDEX.md`.

Activation makes this document the guardrail for later work; it does not itself
authorize implementation. Implementation, creation of migration files, and
remote migration apply are three separate later authorization gates.

## Purpose

Define Binders as Grookai's durable, collaborative collection-goal system.

The product model is:

- **Vault** — what each collector owns.
- **Binders** — what one or more collectors are building.
- **Wall** — what a collector explicitly displays.
- **Pulse** — what changed.
- **Dex and Sets** — canonical checklists and discovery.

A Binder may be personal, shared with invited people, shared through a
view-only link, publicly visible, or community-oriented. Collaboration must
never become shared Vault access or accidental public exposure.

## Current-Reality Finding

The existing Collection Projects feature is not a durable project or Binder
object. It is a mobile-only view over owner-scoped `watches` rows:

- one row per `(user_id, subject_type, subject_id)`;
- no custom title or independent identity;
- no members, roles, invitations, visibility, share link, or activity history;
- no exact-copy contribution relationship;
- progress derived from one owner's complete matching Vault;
- owner-only row-level security;
- no equivalent web surface.

Therefore:

- a user-facing rename alone can produce only private personal Binders;
- collaborative, family, public, or community Binders require additive,
  forward-only schema migrations;
- `watches` may remain an interest signal but must never become Binder
  membership, contribution, sharing, or authorization authority.

## Product Outcome

The system must make this flow truthful and natural:

1. A collector creates **Pikachu Family Binder**.
2. They invite another authenticated collector as a Contributor.
3. The Contributor adds an eligible exact copy from their own Vault.
4. The copy remains owned by and stored in that Contributor's Vault.
5. The shared Binder checklist and progress update.
6. Binder members can see the contribution and resulting milestone.
7. Removing the contribution changes Binder progress but never changes the
   underlying Vault copy.

The UI must explain this in plain language:

> Cards stay in each collector's Vault. The Binder combines the copies members
> choose to contribute.

## Scope

The complete contracted system includes independently gated phases:

1. Binder identity, personal Binders, and truthful discovery.
2. Invite-only shared and family Binders.
3. Revocable view-only links.
4. Public listed and unlisted Binder pages.
5. Community discovery, join requests, and approved contributions.
6. Versioned Binder templates and “Build your own” cloning.
7. Binder activity, notifications, and explicit Pulse milestone sharing.

Mobile and web must consume the same server truth and reach feature parity
before a phase is considered complete.

## Explicit Non-Goals

This contract does not authorize:

- managed child accounts, age collection, guardian relationships, or claims of
  child-account compliance;
- anonymous contribution or editing;
- “anyone with this link can add” behavior;
- chat, direct messaging, or comments inside Binders;
- card ownership transfer between members;
- shared access to another member's Vault;
- automatic contribution of a member's whole Vault;
- automatic Wall placement or public-profile activation;
- automatic global Pulse publication;
- arbitrary external cover-image URLs or public exact-copy photos;
- pricing, marketplace, trade, or sale authority;
- replacement of canonical card, printing, species, set, slab, or GVVI truth;
- a physical-storage claim that Grookai cannot verify.

Family is a collaboration use case, not an identity or legal classification.
Initial contribution requires an existing authenticated Grookai account.

## Definitions

### Binder

A durable collection goal with stable identity, a checklist definition,
members, permissions, contributions, progress, and activity.

### Binder Target

The checklist authority for a Binder:

- `species` — canonical Pokémon species completion;
- `set` — canonical master-set finish-option completion;
- `custom` — an explicitly selected and versioned checklist.

### Contribution

An explicit link from one active exact `vault_item_instances` copy, owned by a
Binder member, to a Binder. The row ID is the private relational ownership
anchor; its governed GVVI is the durable product identity required by the
locked Vault-instance contract.

“Contributed” means the copy is recorded in that member's Grookai Vault and was
explicitly linked. It does not claim physical authenticity, custody, or
verification beyond existing Vault truth.

### Member

An authenticated Grookai account with an active Binder role.

### View Link

A revocable bearer link that permits only a sanitized, read-only Binder
projection. A view link is not an invitation.

### Invitation

A one-time, expiring capability that allows one authenticated account to accept
a maximum Binder role.

### Community Binder

A public, listed Binder that permits authenticated join requests and uses
approval-required contributions. Public visibility alone does not make a
Binder a Community Binder.

### Binder Template

An immutable published checklist version that another collector can clone into
a new Binder. Cloning never joins the source Binder and never copies its
contributions.

## Non-Negotiable Invariants

1. A Binder references cards; it never owns or transfers them.
2. Every contribution anchors to an exact active `vault_item_instances.id`.
3. An active contribution requires a valid governed GVVI for that instance.
   Missing legacy GVVI truth must be allocated through the canonical ownership
   path, never invented by the Binder client.
4. Only the current owner of an exact copy may contribute that copy.
5. A Binder Owner or Manager may detach another member's contribution but may
   never update, archive, transfer, delete, publish, or change the intent of
   that member's Vault copy.
6. Binder membership never grants access to a member's unrelated Vault rows.
7. Adding a contribution never changes `public_profiles`, `shared_cards`,
   `vault_item_instances.intent`, Wall sections, trade/sale state, or pricing.
8. Visibility, discoverability, joining, and contribution permissions remain
   separate axes.
9. A link that grants view access can never grant membership or contribution.
10. Anonymous writes are forbidden.
11. Public and link projections are allow-listed projections, never direct raw
    Binder/Vault table reads.
12. Progress counts satisfied checklist slots, not contribution rows.
13. Duplicate copies may be visible but never inflate completion.
14. Unresolved finish truth remains unresolved and cannot satisfy a
    finish-specific slot.
15. Direct and slab-backed copies resolve through the same exact ownership
    truth.
16. Every mutation is authorized and audited on the server in one transaction.
17. Every user-initiated actor is derived from `auth.uid()`; clients never
    supply acting-user authority.
18. Private collaboration does not require a public profile.
19. Existing interest-graph watches are never silently deleted, muted, or
    reclassified during Binder adoption.
20. External contribution content and identity attribution are separate,
    opt-in choices per member and per Binder.
21. Disabled or rolled-back UI never destroys Binder data.
22. Every active or archived Binder has one active Owner membership matching
    `binders.owner_user_id`; it may change only through one locked transfer
    operation. A `deleted_tombstone` has no active membership authority and
    retains only the historical owner reference permitted by the approved
    retention/account-deletion policy.
23. Trusted maintenance, canonical-correction, Vault-lifecycle, and platform
    moderation actions use an explicit system/service actor kind and
    allow-listed service provenance; a client can never select or impersonate
    that actor kind.

## Product Language

Use:

- Binder
- Create Binder
- Start Pikachu Binder
- Add to Binder
- Add your copy
- Continue Binder
- Invite people
- Share view-only link
- Make public
- Community Binder
- Archive Binder
- Leave Binder
- Remove contribution
- Owner, Manager, Contributor, Viewer
- card print, finish option, checklist slot

Avoid:

- Project
- Track project
- Stop project
- shared Vault
- Binder owns this card
- anyone can add
- public meaning collaborative
- view link meaning invitation
- language implying automatic publication or ownership transfer

## Binder Types and Checklist Modes

### Species Binder

Default mode: **Card Prints**

- Denominator: distinct active `card_print_species` mappings where
  `counts_for_completion = true`.
- Numerator: distinct eligible parent `card_print_id` values covered by active
  contributions.
- Cameos and additional mappings excluded from completion remain visibly
  separate when shown.
- Finishes may be displayed, but do not create additional completion slots in
  Card Prints mode.

Optional advanced mode: **Master Variants**

- Each governed finish/parallel option is a separate slot.
- This mode must not ship until its denominator has a single server authority
  matching the set Master Set contract.

### Set Binder

Mode: **Master Set**

- The Set Binder flag stays off until one approved server read model defines
  the set's required, public, non-provisional completion slots.
- Raw presence in `card_printings` is not sufficient completion authority.
- Once that read model is active, each governed required child printing is one
  slot. A fallback parent slot exists only when the same authority says the
  parent genuinely has no governed child printing.
- Numerator: exact eligible printing/finish options covered by active
  contributions.
- A copy with no assigned `card_printing_id` cannot be guessed into Normal,
  Reverse Holo, Holo, or another finish.
- A slab-backed instance resolves its parent card through `slab_certs`, but does
  not satisfy a finish-specific slot unless a governed exact printing
  relationship exists. Label text or grader metadata is never used to guess.

### Custom Binder

- The Owner chooses canonical checklist slots.
- A slot references `card_print_id` and may optionally require an exact
  `card_printing_id`.
- A custom slot may require more than one distinct exact copy. It still counts
  as one completed slot only after its declared quantity is satisfied.
- Published checklist versions are immutable.
- Editing a live custom Binder creates a new definition revision and records an
  activity event.
- V1 custom covers use Grookai-hosted canonical artwork only.

### Dynamic Canonical Corrections

Species and set denominators use current canonical truth. If a governed
catalog correction changes the denominator:

- the Binder recalculates;
- no stored percentage remains authoritative;
- members see “Checklist updated” with the old and new total;
- completion may move backward without deleting the prior milestone event.

Species and set target identity cannot be edited in place. An Owner creates a
new Binder and may archive the old one. Custom Binders may publish a new
checklist-definition revision, after which every contribution is revalidated.

## Collaboration Axes

These values must remain independent:

| Axis | Values |
| --- | --- |
| Read access | `private`, `link`, `public` |
| Discoverability | `unlisted`, `listed` |
| Joining | `closed`, `invite_only`, `request_to_join` |
| Contribution | `owner_only`, `members_direct`, `approval_required` |

Supported presets:

| Preset | Read | Discovery | Join | Contribution |
| --- | --- | --- | --- | --- |
| Personal | Private | Unlisted | Closed | Owner only |
| Family/shared | Private | Unlisted | Invite only | Members direct |
| Add view-only sharing | Link | Unlisted | Unchanged | Unchanged |
| Make an existing Binder public | Public | Unlisted or listed | Unchanged | Unchanged |
| Community Binder | Public | Listed | Request to join | Approval required |

No preset may weaken an invariant. Advanced settings may expose the axes
individually after the presets are stable.

Database constraints enforce valid combinations:

- `listed` requires `public`;
- `private` and `link` are always `unlisted`;
- `request_to_join` requires `public`, `listed`, and `approval_required`;
- changing read access or discoverability never silently changes contribution
  authority.

## Roles and Permissions

The matrix defines each role's maximum capability. Binder policy and lifecycle
may narrow it.

| Capability | Owner | Manager | Contributor | Viewer | Link/public viewer |
| --- | ---: | ---: | ---: | ---: | ---: |
| Read member Binder | Yes | Yes | Yes | Yes | Sanitized projection only |
| Add/withdraw own copies | Yes | Yes | Yes | No | No |
| Approve/reject pending contributions | Yes | Yes | No | No | No |
| Invite Contributors/Viewers | Yes | Yes | No | No | No |
| Approve/reject join requests | Yes | Yes | No | No | No |
| Remove Contributors/Viewers | Yes | Yes | No | No | No |
| Edit title/description/cover | Yes | Yes | No | No | No |
| Publish a custom checklist revision | Yes | No | No | No | No |
| Change a species/set target in place | Never | Never | Never | Never | Never |
| Change visibility/join policy | Yes | No | No | No | No |
| Promote or remove Managers | Yes | No | No | No | No |
| Transfer/archive/delete Binder | Yes | No | No | No | No |
| Edit another member's Vault copy | Never | Never | Never | Never | Never |

Additional rules:

- Every active or archived Binder has exactly one authoritative Owner.
- For an active or archived Binder, `binders.owner_user_id` must equal the user
  on the sole active Owner membership. A deleted tombstone has no active Owner
  and retains only the historical reference permitted by retention policy.
- The Owner cannot leave an active or archived Binder. Ownership must be
  transferred, or the Binder must enter `deleted_tombstone`.
- Ownership transfer is offered only to an active authenticated member and
  requires that member's explicit acceptance. Until acceptance, the existing
  Owner remains authoritative.
- On accepted transfer, the former Owner becomes a Manager by default; the
  transfer preview may instead select Contributor, Viewer, or leave. The role
  result and both parties are written in the one atomic transfer event. Viewer
  or leave also closes the former Owner's live contributions according to the
  disclosed role/leave rules, with one corresponding event per contribution
  state transition.
- A Manager cannot promote themselves, remove the Owner, transfer ownership,
  broaden visibility, or change the target.
- A Contributor may withdraw their own contribution at any time.
- An Owner or Manager removing a contribution removes only the Binder link.
- Downgrading a Contributor to Viewer deactivates that member's active
  contributions as `removed` atomically unless the Owner cancels the change.
- Leaving withdraws that member's live contributions; Owner/Manager removal
  closes them as `removed`.
- Historical activity remains member-private and sanitized.

Contribution-policy behavior:

- `owner_only`: only the Owner may add a new copy. Other members may still
  withdraw copies they previously contributed.
- `members_direct`: Owner, Manager, and Contributor additions become active
  after complete server validation.
- `approval_required`: Owner additions become active after validation; Manager
  and Contributor additions enter `pending`.
- An Owner may decide any pending contribution. A Manager may decide another
  Manager's or Contributor's pending contribution, but never their own.
- Changing policy governs future additions. It never silently removes active
  contributions; incompatible pending contributions are closed as rejected in
  the same policy-change transaction.

### Membership Suspension

- The Owner may suspend a Manager, Contributor, or Viewer.
- A Manager may suspend a Contributor or Viewer, but not the Owner, another
  Manager, or themselves.
- The Owner is never placed in membership `suspended`; platform action against
  an Owner uses Binder/account moderation authority.
- Suspension atomically removes member-only read/write/notification access,
  closes pending contributions as `rejected`, and closes active contributions
  as `invalidated`, with one event per transition.
- A suspended account may still use guarded Leave and Report endpoints. Its
  contributions are already in terminal states, so Withdraw is unavailable.
  Public viewing, if otherwise lawful, receives only the same sanitized
  projection available to a non-member.
- Reinstatement requires an authorized Owner/Manager action, begins a new
  membership epoch, and never restores prior contributions or consent. The
  reinstated member must explicitly contribute and consent again.
- Removing, reinstating, or leaving from suspension is one locked transition
  with an auditable reason and actor.

## Contribution Contract

### Adding a Copy

The add operation must:

1. authenticate the caller;
2. lock and validate the Binder state;
3. validate active membership and role;
4. validate the contribution policy;
5. load the exact Vault instance;
6. prove `auth.uid()` owns that active instance;
7. resolve direct or slab-backed canonical card truth;
8. verify any `card_printing_id` belongs to its parent;
9. prove the copy satisfies the Binder checklist;
10. enforce one-live-row uniqueness across `pending` and `active` for
    `(binder_id, vault_item_instance_id)`;
11. enforce the account-membership and exact-copy Binder-reference limits;
12. create the contribution as `active` or `pending` according to policy;
13. recalculate the affected checklist slot and milestone state; and
14. append one corresponding audit/activity event for the accepted contribution
    state transition in the same transaction.

### Contribution State Machine

Allowed states:

- `pending`
- `active`
- `withdrawn`
- `removed`
- `rejected`
- `invalidated`

Allowed transitions:

- `pending` to `active`, `withdrawn`, `rejected`, or `invalidated`;
- `active` to `withdrawn`, `removed`, or `invalidated`.

`withdrawn` means the contributor acted, `removed` means authorized Binder
management acted, `rejected` means approval was denied, and `invalidated` means
current ownership, identity, checklist, membership, block, lifecycle, or
moderation truth no longer permits the relationship.

Only one live row across `pending` and `active` may exist for one
`(binder_id, vault_item_instance_id)`. Re-submission after a terminal state uses
a new idempotent transition while retaining history. Approval revalidates all
conditions from **Adding a Copy**; it never trusts validation performed when the
row first became pending.

### Explicit and Bulk Contribution

- No Binder may automatically scan or expose a member's complete Vault.
- “Add all matching cards from my Vault” is allowed only as an explicit,
  previewed, confirmed bulk action.
- The preview shows eligible, duplicate, unresolved, and ineligible counts.
- Bulk writes are bounded, resumable, and idempotent.
- After adding a new Vault copy, Grookai may suggest an eligible Binder, but
  the member must confirm.

### Copy Lifecycle

- One exact copy may contribute to multiple separate Binders.
- A copy may appear only once in one Binder.
- Archiving, deleting, transferring, or changing the owner, `card_print_id`,
  `card_printing_id`, slab anchor, or resolved slab canonical card truth of a
  Vault copy transactionally invalidates or recalculates every affected Binder
  contribution without deleting Binder history.
- Restoring a copy does not silently restore its contribution; the owner must
  confirm or use an explicit restore action.
- A contribution never changes the copy's Vault intent.
- Binder invalidation is integrated into every canonical Vault identity/lifecycle
  writer under `NEW_WRITE_PATH_CHECKLIST`; a Binder trigger or worker cannot
  become a second ownership authority.

### Binder Lifecycle

- Binder lifecycle is `active`, `archived`, or `deleted_tombstone`.
- Platform moderation is a separate axis: `clear`, `forced_unlisted`,
  `frozen`, or `removed`.
- Archiving is reversible, removes the Binder from active collaboration, and
  makes ordinary collaboration read-only without changing any member's Vault.
- While archived, any member may still withdraw a contribution; a non-Owner may
  leave. The Owner may restore, transfer, or delete the Binder but may not
  leave without a completed transfer.
- Restoring an archived Binder re-enables collaboration only after current
  membership, block, capacity, target, and moderation rules are revalidated.
- User-facing deletion is an explicit Owner-only action with a destructive
  confirmation. It revokes invitations/view links, removes public projections,
  and deactivates membership and contributions. The resulting tombstone keeps
  historical `owner_user_id` for audit but has no active Owner membership.
  Account deletion may null or pseudonymize that historical reference under the
  approved retention policy. Binder deletion never deletes Vault copies.
- Permanent record disposal, including any legally required deletion, follows
  Grookai's approved retention/deletion authority and is not performed by a
  client-side cascade.
- A platform-frozen Binder is removed from public discovery and rejects
  metadata, invite, join, contribution, and sharing changes. Members retain
  leave/withdraw and Report access; platform moderation remains available.
- `forced_unlisted` removes discovery/indexing without blocking lawful member
  collaboration. `removed` returns the generic unavailable state to users and
  atomically invalidates live contributions and revokes invitations/view links;
  it remains accessible only to authorized moderation/retention processes.
- Deleting a non-Owner account deactivates its memberships and contributions
  while retaining sanitized audit history under the approved retention policy.
  An Owner account cannot be deleted until each owned Binder is transferred or
  explicitly deleted through the account-deletion orchestrator. No auth foreign
  key may silently cascade-delete a shared Binder.

### Completion Semantics

- One or more active contributions may cover one checklist slot.
- Completion counts that slot once.
- Species Card Prints and Set Master Set slots require one distinct exact copy.
  A custom slot with a declared quantity requires that many distinct active
  copies, then counts once; extra copies do not increase completion.
- Copy and contributor counts may be shown separately.
- Progress copy must always name its unit, for example:
  - `59 of 611 card prints`;
  - `87 of 142 finish options`.
- “Complete” is a derived current state, not an irreversible lifecycle status.

## Privacy and Public Projection

### Member View

Members may see:

- Binder metadata and settings allowed by role;
- canonical checklist identity and hosted artwork;
- contribution identity within the Binder;
- Binder-scoped member attribution;
- member-only activity.

Members must not receive another member's:

- unrelated Vault contents;
- acquisition cost;
- private pricing or notes;
- certificate number;
- private condition analysis;
- uploaded private media or raw storage paths;
- email, auth claims, or raw auth user ID.

Even inside a Binder, another member's exact Vault instance ID is not required.
Management actions use a Binder contribution ID.

### Link and Public View

Allow-listed fields:

- Binder title, description, canonical cover, target, checklist mode;
- current completion counts and percentages;
- canonical card identity, Grookai-hosted artwork, and public-safe finish label;
- aggregate count of members/contributors participating in the external
  projection, never the private total;
- attribution only for members who opted in.

Forbidden fields:

- raw member or auth UUIDs;
- email or private account metadata;
- GVVI, internal Vault instance ID, or other exact-copy ownership key;
- slab certificate numbers;
- prices, acquisition cost, private notes, provenance, or storage location;
- full member lists by default;
- exact-copy photos in V1;
- any unrelated Vault card or total Vault quantity.

Default public attribution is **A Binder member**.

### Visibility Escalation Consent

Changing a Binder from private to link/public cannot unilaterally expose
existing members' contributions.

- Existing contributions remain excluded from the broader projection until
  their contributor grants the required external content scope.
- Consent may expose the canonical contribution, not private exact-copy data.
- Content-sharing consent and identity-attribution consent each use a maximum
  audience scope: `none`, `link`, or `public`. `public` covers link and public;
  `link` never authorizes public exposure.
- Consent is bound to an external-projection revision. Broadening from private
  to link, link to public, or unlisted to listed increments that revision and
  requires consent for the newly broader audience.
- Consent is also bound to the current membership epoch. Leave, removal,
  suspension, or any later rejoin/reactivation prevents old consent from
  authorizing new external content.
- Invitations to an already link/public Binder disclose that state before
  acceptance.
- A member may withdraw public consent without leaving the private Binder.
- Link/public checklist coverage and progress are derived only from
  contributions whose owners consented to that external projection. The member
  view may therefore show more progress than the external view.
- Contribution-content consent and identity-attribution consent are separate.
  A member may permit a canonical card to appear externally while remaining
  attributed only as **A Binder member**.

Creating or joining a Binder never enables:

- `public_profile_enabled`;
- `vault_sharing_enabled`;
- local discovery;
- Wall visibility;
- public Pulse.

## Family Participation

Initial family collaboration supports existing authenticated accounts.

It must not:

- ask for date of birth;
- record a family relationship;
- create a hidden public profile;
- claim parental-consent compliance;
- market the feature as a managed child-account system.

Each member may choose a Binder-scoped display alias, limited to plain text and
40 characters. It is presentation only—not an account, family relationship, or
permission principal—and it does not create or enable a public profile. If no
alias is chosen, the UI uses a neutral Binder-member label rather than email or
auth identity. External display of the alias still requires separate public
identity-attribution consent.

Managed household profiles, guardian controls, or minor accounts require a
separate contract and legal/privacy review.

## Invitations

### Invitation Types

- Account-targeted invitation: only the intended authenticated account may
  accept.
- General one-use invitation: the first eligible authenticated account may
  accept, and its maximum role is Contributor or Viewer.

Managers may invite only Contributors or Viewers without individual Owner
approval. Only the Owner may issue an account-targeted Manager invitation or
promote a Manager.

### Token Rules

- At least 256 bits of cryptographically secure randomness.
- Store only a token hash.
- Return plaintext exactly once.
- Bind to one Binder, maximum role, expiry, and optional recipient.
- Default expiry: seven days.
- Every invitation permits exactly one accepted membership.
- Accept only after authentication.
- Before authentication, an invitation route shows only a generic sign-in
  prompt. Binder, inviter, recipient, and role details appear only after the
  intended or otherwise eligible authenticated account is validated.
- Atomically reject wrong account, self-invite, replay, expiry, revocation,
  block, archived/frozen Binder, capacity, and role escalation.
- Redirect to a token-free route immediately after acceptance.
- Never write tokens to logs, analytics, error payloads, activity, or URLs
  after redemption.
- Revocation takes effect immediately.

Invitation routes use only `https://grookaivault.com`.

Secret invitation and view-link pages require:

- `Referrer-Policy: no-referrer`;
- `Cache-Control: private, no-store`;
- `X-Robots-Tag: noindex, nofollow`;
- no token-bearing analytics;
- a generic unavailable state that does not disclose Binder existence.

## View-Only Links

Invitation and view capabilities are separate records and RPCs.

- A view token can never be redeemed as membership.
- A view link grants no write capability.
- An Owner may create, name, revoke, or rotate a bounded number of links.
- Revocation is immediate.
- Rotating a link invalidates the prior token.
- A private Binder does not become publicly discoverable merely because a view
  link exists.

## Community Binders

A Community Binder is public and listed, but contribution remains governed.

Required controls:

- request to join;
- Owner/Manager approve or reject;
- approval-required contribution queue;
- contributor withdraw;
- Owner/Manager remove, suspend, reject, and revoke;
- Report and Block on Binder and contribution surfaces;
- platform moderation state: `clear`, `forced_unlisted`, `frozen`, `removed`;
- plain-text title and description;
- canonical hosted covers only in V1;
- server rate limits and capacity limits.

Forbidden:

- anonymous writes;
- edit-by-link;
- automatic join;
- unmoderated arbitrary media;
- Binder comments/chat in the initial release;
- public exact-copy data leakage.

### Community Counts

Two concepts must not be mixed:

- **Contributors** — active members of one shared Binder.
- **Collectors building this** — collectors who created a Binder from one
  published Template.

Template adoption counts may be public only as aggregate data and only after a
minimum privacy threshold of five unique collectors. No identities or private
Binder titles are exposed.

## Binder Templates

- A Template is a checklist definition, not a live Binder.
- System Templates may represent governed species and sets.
- A custom Binder may publish an immutable Template version after moderation.
- Only that custom Binder's Owner may submit a Template version. Publication is
  explicit and never changes the source Binder's visibility.
- “Build your own” creates a new private Binder owned by the caller.
- It copies checklist definition only.
- It never copies members, invitations, contributions, activity, visibility,
  or public consent.
- Cloning a system species/set Template creates a species/set Binder that
  follows governed canonical corrections; the Template is a discovery preset,
  not frozen card truth.
- Cloning a published custom Template creates a custom Binder pinned to that
  immutable Template version. A newer Template version never silently changes
  the clone.

## Pulse, Wall, and Vault Boundaries

### Vault

- Vault remains exact ownership authority.
- Binder contribution is a relationship to an exact copy.
- Binder members cannot mutate each other's Vault.

### Wall

- Wall remains explicit public presentation.
- A contribution never creates Wall membership.
- “Show this copy on Wall” is a separate action available only to the copy
  owner.
- A Binder Owner or Manager cannot place another member's card on Wall.
- A public Binder is not a Wall section.

### Pulse

- Binder Activity is the authoritative member history.
- Private and link-only Binder activity never enters global/public Pulse.
- Member-safe Binder events may appear in each member's private Pulse.
- A public milestone reaches public Pulse only through an explicit, previewed
  share action.
- No contribution creates a `card_event` merely to force Pulse visibility.
- Watches remain interest signals and do not define Binder audience.

## Navigation and Discoverability

### Mobile

Required:

- A prominent Vault card: **Binders — What you're building**.
- A Binders library reachable without an icon-only affordance.
- Visible species action: **Start Pikachu Binder**, **Open Binder**, or
  **In 2 Binders**.
- Visible set action: **Start [Set] Binder**.
- Exact-copy action: **Add to Binder**.
- Contextual post-scan/post-Vault suggestion, never automatic.
- A one-time, dismissible “What's new” introduction.

The parent branch's experimental Pulse/Wall/Vault architecture contract defines
the five-item dock as Pulse, Wall, Vault, Scan, and Search. This Binder contract
does not authorize changing it. Binders must not displace Search or another
dock item without a separately approved navigation-contract amendment.

### Web

Required:

- Binders in authenticated primary navigation.
- Private Binders library and member workspace.
- Public/unlisted safe projection.
- Invitation preview/acceptance.
- Community discovery.
- Responsive parity with mobile.

### Binder Library

Title: **Binders**

Helper: **Collection goals powered by cards in your Vault.**

Sections:

- Continue building
- Shared with me
- Invitations
- Completed
- Archived

Primary action: **Create Binder**

Wanted Cards remains a Vault/Wants concept and must not masquerade as a Binder.

### Binder Detail

Header:

- cover, title, target, and checklist mode;
- visibility;
- exact progress unit;
- member summary;
- Share/Invite.

Tabs:

- Checklist
- Activity
- Members
- Settings, role-gated

Checklist filters:

- All
- In Binder
- Missing
- In your Vault
- Contributed by you
- Needs finish/review

Every contribution surface must reinforce:

> This copy stays in the contributor's Vault.

### Share Surface

The Share action presents distinct choices:

- Invite people
- Create/copy view-only link
- Make public

It must never silently broaden visibility.

## Required UX States

- Empty library: “No Binders yet. Start with a Pokémon or set.”
- No shared Binders: “Build together—invite family or friends.”
- No activity: “No one has added a card yet.”
- No eligible copy: “You don't have a matching copy in Vault. Scan or search
  to add one.”
- Offline: cached progress may render, but additions and invitations require a
  connection.
- Invite: valid, expired, revoked, accepted, wrong account, blocked, and
  archived/frozen Binder.
- No access: generic unavailable message with no existence leak.
- Conflict: permission changed, contribution duplicate, copy no longer owned,
  wrong checklist, archived/frozen Binder.
- Failed refresh: preserve safe cached read-only content and offer Retry.
- Revoked view link: generic unavailable response with no private fallback.
- Empty community queue and rejected contribution states.
- Visibility-consent-required state.

Collaborative mutations must not be queued offline. The server response is
authoritative; optimistic UI must roll back on rejection.

Private/member cache is scoped to the signed-in account, is inaccessible after
logout or account change, and is purged when the server reports lost access.
Offline content must show its last-authorized timestamp. Invitation and view
tokens are never persisted in general application cache.

## Proposed Data Model

All schema names are proposed and may be refined without weakening the
invariants.

### `binders`

Required concepts:

- internal stable `id`;
- non-recycled `public_id` with at least 128 bits of cryptographically secure
  entropy; it is public-safe routing identity, never authorization;
- authoritative `owner_user_id`, required for active/archived Binders and
  nullable only for a deleted tombstone under approved account deletion;
- title and description;
- target kind and exactly matching species/set/custom definition;
- checklist mode and definition revision;
- read access, discoverability, join policy, contribution policy;
- external-projection revision for scoped member consent;
- lifecycle and platform moderation state;
- canonical hosted cover reference;
- optional `legacy_watch_id` conversion reference;
- timestamps and archive state.

Multiple Binders may target the same Pokémon or set.

### `binder_members`

Required concepts:

- Binder and authenticated user;
- role: Owner, Manager, Contributor, Viewer;
- active/left/removed/suspended state;
- optional Binder-scoped display alias;
- monotonically increasing membership epoch;
- inviter and join/end timestamps;
- external contribution-content scope (`none`, `link`, `public`), default
  `none`, plus consented projection revision;
- external identity-attribution scope (`none`, `link`, `public`), default
  `none`, plus consented projection revision;
- notification preference.

Every inactive-to-active membership transition increments the membership epoch
and resets both external scopes to `none`. Consent records must match both the
current membership epoch and the Binder's required projection revision.

There is one membership record per Binder/user. Every active or archived Binder
has exactly one active, authoritative Owner matching `binders.owner_user_id`;
a deleted tombstone has none. Ownership transfer locks the Binder and both
affected membership records, changes both authorities atomically, and writes
one transfer event.

### `binder_invitations`

Required concepts:

- Binder, inviter, optional intended account;
- maximum role;
- token hash only;
- pending/accepted/declined/revoked/expired state;
- expiry, accepting account, one-time `used_at`, and response timestamps.

### `binder_view_links`

Required concepts:

- Binder, creator, optional label;
- token hash only;
- expiry, use policy, revoked/rotated state;
- no membership role.

### `binder_join_requests`

Required concepts:

- Binder and requester;
- pending/approved/rejected/withdrawn state;
- requested role ceiling;
- decision actor and timestamps.

### `binder_owner_transfer_offers`

Required concepts:

- Binder, current Owner, and intended active member;
- intended former-Owner role after transfer;
- pending/accepted/revoked/expired state;
- expiry and response timestamps;
- at most one pending offer per Binder.

Acceptance locks the Binder, offer, and both membership rows and performs the
no-gap ownership transition defined above.

### `binder_contributions`

Required concepts:

- Binder;
- contributor;
- exact `vault_item_instances.id`;
- pending/active/withdrawn/removed/rejected/invalidated state;
- canonical card/printing snapshot for private audit only;
- add/approval/removal actors and timestamps;
- source and idempotency key;
- one-live-row uniqueness across pending/active on
  `(binder_id, vault_item_instance_id)`.

The snapshot is not completion authority and is never included in public
projections.

### `binder_custom_slots`

Required concepts:

- Binder definition revision;
- canonical `card_print_id`;
- optional required `card_printing_id`;
- position and required quantity;
- active state and timestamps.

### `binder_activity_events`

Append-only events for:

- create, archive, restore, transfer;
- metadata, target, checklist, and visibility changes;
- invitation and view-link lifecycle;
- join requests;
- member join, leave, role, removal, suspension;
- contribution add, withdraw, approve, reject, invalidate;
- milestone and checklist-definition changes;
- moderation and block effects.

The server supplies the actor. Event payloads exclude tokens, email, auth
claims, exact-copy IDs, notes, costs, certificates, and private media.
Each accepted authoritative state transition has one corresponding event.
Bounded bulk operations write one event per accepted item transition; a batch
summary may be additional but cannot replace the item events.

User events store the authenticated user actor. Trusted automated events store
a non-user actor kind plus an allow-listed service source and correlation ID.
User IDs and service provenance are mutually exclusive, and neither can be
selected through a client parameter.

### `binder_progress_crossings`

- Binder-scoped 25/50/75/90/100 crossings;
- idempotent per Binder, checklist revision, and threshold;
- permits a later recrossing only under an explicitly versioned rule.

### `binder_legacy_watch_decisions`

- User and legacy watch;
- converted/dismissed state;
- resulting Binder when converted;
- timestamps;
- unique source watch for idempotency.

### `binder_templates` and `binder_template_versions`

- creator/system authority;
- public-safe identity;
- moderation status;
- immutable versioned checklist;
- clone/adoption aggregate without member identity exposure.

### `trust_reports` Binder Extension

The existing trust/report authority is extended with explicit Binder surfaces:

- `binder`
- `binder_contribution`
- `binder_member`
- `binder_invitation`

`surface_id` references the relevant Binder-domain record and
`reported_user_id` remains optional when the report concerns content rather
than one member. Existing reporter-only read and service-owned moderation rules
remain binding. Do not create a competing Binder-only report authority or
overload `other`.

Binder reports are created through a guarded RPC that derives the reporter,
verifies the caller can lawfully see the reported surface, rate-limits abuse,
and returns a generic result that cannot probe inaccessible Binder IDs. Direct
client insertion of a Binder surface is not report authority.

## Server Write Authority

Raw Binder tables:

- enable RLS;
- grant no anonymous DML;
- reject direct authenticated DML;
- allow only narrowly granted RPCs and service-owned maintenance.

Every user mutation RPC must:

- derive the actor from `auth.uid()`;
- use a fixed `search_path`;
- revoke default `PUBLIC` execute;
- grant only the required authenticated/service role;
- lock transition rows;
- validate role, state, blocks, capacity, target, and ownership;
- accept and enforce an idempotency key;
- mutate and append its audit event transactionally;
- return an allow-listed response.

Service-owned maintenance entrypoints satisfy the same locking, validation,
idempotency, event, and allow-list requirements, but are executable only by the
service role and record the trusted service actor provenance defined above.

Required RPC families:

- create/update permitted Binder metadata and policy/archive/restore/delete;
- offer/accept/revoke ownership transfer;
- invite/accept/decline/revoke;
- create/rotate/revoke view link;
- request/approve/reject/withdraw join;
- leave/remove/suspend/change role;
- update contribution-content consent, identity-attribution consent, alias, and
  Binder notification preference;
- list caller's eligible copies;
- add/withdraw/approve/reject contribution;
- publish a custom checklist revision and transactionally revalidate coverage;
- publish/version/clone a Template under its system-or-custom semantics;
- submit a guarded Binder-surface trust report;
- authenticated Binder dashboard/detail/checklist/activity;
- sanitized link/public detail and public discovery;
- convert or dismiss a reviewed legacy watch candidate;
- service-owned canonical-correction, Vault-lifecycle invalidation, moderation,
  retention, and account-deletion maintenance entrypoints.

No RPC accepts an acting user ID from the client.

The existing `interest_graph_upsert_watch_v1` function is `SECURITY DEFINER`,
accepts an arbitrary user ID, and has no repository-defined execute revocation.
Before any Binder code reuses it, its callers and grants must be audited and
public/anonymous/authenticated execution must be removed unless a legitimate
client contract is proven. It is never a Binder client entrypoint.

## Row-Level Security and Trust

Required personas:

- Owner
- Manager
- Contributor with public profile disabled
- Viewer
- authenticated outsider
- anonymous viewer
- blocked account
- platform service/moderator

Policies and RPC checks must prove:

- raw private rows are invisible to outsider/anonymous users;
- active members see only Binder-scoped data;
- public and link reads use sanitized projections;
- only the copy owner contributes a copy;
- blocked pairs cannot invite, join, directly interact, or notify;
- a blocked member can still leave;
- owner/member block immediately removes private access where required;
- membership and contribution changes recalculate progress atomically.

Use a single Binder block helper that incorporates Grookai's active two-way
trust/block authorities. A member blocked by the Owner loses access and active
contributions. Blocked non-owner members do not receive identity-attributed
activity about each other.

Binding block behavior:

- If the Owner blocks an active member, that member is removed and their live
  contributions are closed atomically.
- If a non-Owner member blocks the Owner, the blocker leaves the Binder and
  their live contributions are withdrawn atomically after confirmation.
- Two blocked non-Owner members may remain in the same Binder, but neither sees
  the other's alias, identity-attributed activity, or direct notifications.
  Canonical checklist coverage remains visible without identity.
- Blocking a Manager does not remove the Manager's Binder moderation authority.
  The Manager may still approve, reject, remove, or suspend through Binder
  contribution/member IDs, so Block cannot be used to evade moderation.
- No client may call Binder block logic with an arbitrary selected user pair.
  Binder RPCs evaluate the authenticated actor and relevant Binder principals
  server-side.

## Public and Link Read Models

Public/link pages must call dedicated sanitized views or RPCs.

They must not:

- query raw Binder membership or contribution tables from anonymous clients;
- expose private columns and rely on the UI to hide them;
- return raw storage paths;
- reveal a private Binder exists when access fails;
- be shared-cacheable when token-bearing or member-specific.

Public listed pages may use bounded caching only when visibility, contribution,
consent, block, moderation, and link revocation changes invalidate that cache.

The shared-cacheable public core contains no member identity attribution.
Authenticated, identity-attributed overlays are uncached and require
viewer-dependent block checks. Unlisted public and view-link pages are always
`noindex`; only a moderated, listed public page may be indexable.

## Activity and Notifications

### Activity

Binder activity uses `binder_activity_events`, not `watches` or public
`card_events`, as authority.

### Notification Limitation

The current `notification_outbox.card_print_id` is non-null. Binder invitations
and membership events have no lawful card anchor.

Therefore:

- never insert a fake card ID;
- the initial in-app invitation inbox, approval queue, and activity indicators
  are derived from Binder invitation/request/activity authority and do not
  misuse the push outbox;
- generic Binder push requires a separate approved notification-subject
  extension and migration;
- existing dispatcher ownership, quiet hours, dedupe, retry, delivery budget,
  and recipient-only logs remain binding.

Recommended defaults:

- invitation: in-app, optional generic push after extension;
- contribution activity: digest;
- approval request: actionable Owner/Manager notification;
- milestone: deduplicated at 25/50/75/90/100;
- own action: no notification;
- private lock-screen copy: “A shared Binder was updated”;
- removed member: no later content-bearing notification.

Notification tap and dispatch recheck membership, visibility, block, and Binder
state at delivery time.

## Moderation and Abuse Controls

Required before public/community enablement:

- Binder, contribution, member, and invitation Report actions;
- Block on every public/community surface;
- Owner/Manager moderation queue;
- platform freeze/remove state;
- invite, join, contribution, and creation rate limits;
- server-enforced capacity;
- text-length and plain-text rendering enforcement;
- no arbitrary cover uploads in V1;
- XSS and URL injection tests;
- no public release when report/block paths are unavailable.

Proposed initial server defaults:

| Limit | Default |
| --- | ---: |
| Active owned Binders | 20 |
| Active Binder memberships per account | 100 |
| Active members per Binder | 50 |
| Pending invitations per Binder | 20 |
| Active view links per Binder | 5 |
| Active contributions per Binder | 25,000 |
| Live Binder references per Vault instance | 20 |
| Title length | 80 characters |
| Description length | 1,000 characters |
| Binder-scoped alias | 40 characters |
| Invitations | 10/hour and 50/day per actor |
| Contribution mutations | 120/hour per member |

“Live Binder references” includes pending and active contributions. Membership
and exact-copy fanout are checked transactionally under concurrency.
Entitlements may raise limits later only after synchronous Vault-lifecycle
fanout is re-proven at the higher ceiling; UI-only limits are forbidden.

## Performance Contract

The existing owner-Vault progress scan must not be multiplied by Binder member
count.

Required:

- dashboard keyset pagination, 20 Binders per page;
- checklist, member, contribution, and activity pagination, 50 rows per page;
- one bounded Binder-detail read model;
- no client N+1 member-Vault reads;
- transactionally maintained or efficiently aggregated progress counters;
- indexes for active membership, Binder/lifecycle/activity, exact-copy
  contribution, canonical slot, pending invite, and public listed lookup;
- subscription only to the currently open Binder;
- bounded bulk contribution batches;
- bounded, indexed exact-copy fanout so Vault archive/transfer/identity
  transactions never scan an unbounded Binder set;
- public cache invalidation on visibility, consent, contribution, and
  moderation changes;
- no shared caching for member or secret-link pages.

Acceptance budgets:

- Binder dashboard/detail API p95 below 750 ms on production-like data;
- contribution mutation p95 below 750 ms;
- useful Binder content below two seconds on the Samsung SM-S908U target;
- public mobile LCP below 2.5 seconds;
- load proof with 50 members, 1,000 checklist slots, and the contracted maximum
  of 25,000 active contributions.

Concurrency proof must cover:

- simultaneous duplicate contribution;
- member removal during contribution;
- Vault archival during contribution;
- invitation replay;
- visibility change during approval;
- owner transfer during invite/member mutation;
- duplicate milestone crossing;
- membership and exact-copy fanout-limit races at the exact boundary.

## Legacy Collection Projects Adoption

Automatic backfill of all manual set/character watches is forbidden.

Although repository code currently shows Collection Projects as the live writer
for those manual watches:

- `reason = 'manual'` is generic interest language;
- `origin` distinguishes only `live` and `backfill_v1`;
- the row has no Project-specific marker;
- production history or external writers cannot be proven from repository code.

Fail-closed conversion:

1. Present eligible watches as **Tracked goals available to convert**.
2. Let the owner review and select each candidate.
3. Create a private, owner-only Binder transactionally.
4. Record `source_watch_id` and the conversion decision idempotently.
5. Offer a separate preview and confirmation to add matching current Vault
   copies.
6. Keep the original watch unchanged as interest-graph data.
7. Allow the owner to dismiss future prompts without muting the watch.

No conversion publishes, invites, or changes the owner’s Vault.

## Routes and Deep Links

Proposed canonical routes:

- `/binders` — authenticated Binder library;
- `/binders/{publicId}` — authenticated member workspace or public projection
  according to server authorization;
- `/b/{viewToken}` — revocable unlisted view-only capability;
- `/binder-invites/{inviteToken}` — invitation preview and acceptance;
- `/binders/explore` — public/community discovery;
- `/binder-templates/{templateId}` — public-safe Template page.

After token redemption, redirect to a token-free Binder route.

Required mobile support:

- in-app route resolution;
- `grookai://binders/{publicId}`;
- `grookaivault://binders/{publicId}`;
- canonical `https://grookaivault.com` links;
- Android/iOS association only after authorized certificate/domain files exist.

No `grookai.com` route is permitted.

## Migration and Apply Contract

Collaborative Binders require new forward-only migrations.

Before implementation begins:

- this contract is active and indexed; and
- the owner separately authorizes the implementation scope.

Before any migration file is created:

- the owner separately authorizes migration-file creation and schema scope;
- current linked migration state must be clean;
- active remote drift must be absent.

Before any remote apply:

- migrations replay from a clean local database;
- strict migration preflight passes;
- complete RLS/RPC fixture tests pass;
- generated schema diff contains only approved Binder and required
  notification/report/trust extensions;
- production backup and rollback flags are confirmed;
- owner explicitly authorizes apply.

Normal remote schema edits through Supabase Studio or ad hoc SQL are forbidden.

## Feature Flags and Rollout

Independent, default-off gates:

1. Binder schema/RPC internal gate.
2. Personal Binders.
3. Invite-only shared Binders.
4. View-only links.
5. Public Binders.
6. Community discovery/join/approval.
7. Templates.
8. Binder notifications.
9. Explicit Pulse milestone sharing.

Recommended release order:

1. Local schema, RLS, RPC, threat-model proof.
2. Internal personal Binder conversion preview.
3. Private personal and invite-only shared Binders.
4. Revocable view links.
5. Public unlisted/listed pages with Report/Block.
6. Community requests and approval queue.
7. Templates and aggregate adoption.
8. Generic Binder notifications and explicit Pulse integration.

Rollback is feature-flag based and non-destructive. It never deletes Binders,
contributions, activity, or legacy watches.

## Verification

### Contract Tests

Must verify:

- approved terminology and absence of user-facing Project copy;
- route contracts;
- role/visibility/contribution matrices;
- exact-copy and slab truth;
- no Wall/Pulse/Vault/public-profile side effects;
- public projection allow-list;
- invitation/view-token separation;
- migration files and contract-index activation only after approval.

### Local Database Fixture

Use a real local Supabase fixture, not regex assertions alone.

Required personas:

- Alice — Owner;
- Bob — Manager;
- Carlos — Contributor with public profile disabled;
- Dana — Viewer;
- Eve — authenticated outsider;
- anonymous viewer;
- blocked account.

Required negative proof:

- anonymous/outsider cannot read private raw rows;
- Viewer cannot write;
- Manager cannot transfer ownership or broaden visibility;
- contribution policy narrows role capability and Manager self-approval fails;
- pending plus active live uniqueness survives concurrent submission/approval;
- foreign, archived, unresolved, or wrong-target copies are rejected;
- missing/invalid GVVI cannot activate a contribution;
- invitation wrong-account, replay, expired, revoked, blocked, over-capacity,
  and role-escalation attacks are rejected;
- view token cannot join;
- direct authenticated table writes are rejected;
- audit rows are immutable;
- every accepted authoritative state transition has exactly one corresponding
  event, including each accepted item in a bulk operation;
- service events have allow-listed provenance and cannot be client-forged;
- leave/remove/archive changes progress but never the Vault item;
- Vault owner/card/printing/slab identity changes invalidate or recalculate
  affected contributions;
- visibility escalation respects member consent;
- member and external progress diverge only according to external-content
  consent;
- ownership transfer has no Owner gap and applies the disclosed former-Owner
  role;
- active/archived/deleted Owner invariants hold through leave, transfer,
  archive, deletion, and account deletion;
- suspension role limits, access loss, contribution closure, safe Leave/Report,
  and no-silent-restore behavior pass;
- rejoin/reinstatement increments membership epoch and cannot reuse old external
  consent;
- active-membership and exact-copy-reference limits hold under boundary and
  concurrent mutations;
- every co-member block case and guarded report access-probe case passes;
- Set Binder reads remain unavailable until the approved checklist-slot
  authority is active;
- no mutation touches Wall, public-profile flags, Vault intent/ownership, or
  public Pulse.

### Flutter and Web

Required tests:

- create, archive, restore, and owner transfer;
- invitation preview, acceptance, decline, expiry, and revoke;
- role management;
- add, withdraw, approve, reject, duplicate, and bulk contribution;
- checklist filters and completion truth;
- view-link create, rotate, revoke;
- public consent;
- join request and moderation;
- Report and Block;
- loading, empty, error, offline, stale permission, and revoked-access states;
- accessibility and keyboard/screen-reader labels;
- plain-text rendering for hostile title/description input;
- responsive mobile/desktop parity;
- private routes are `noindex`;
- secret routes are `no-store` and token-safe;
- HTML, JSON, Open Graph metadata, logs, analytics, and network responses
  contain no forbidden private/exact-copy fields.

Required gates:

- `flutter analyze`;
- focused and full `flutter test`;
- web typecheck and lint;
- full contract suite;
- strict production web build;
- migration replay and diff audit;
- secret-packaging guard;
- full `npm run shipcheck`.

### Real Acceptance

Use:

- Samsung SM-S908U;
- a second authenticated account in a browser or second device;
- both accounts with public profile disabled for private collaboration proof.

Required flow:

1. Owner creates a private Pikachu Binder.
2. Owner invites Contributor.
3. Contributor accepts after seeing role and privacy copy.
4. Contributor explicitly adds an owned eligible exact copy.
5. Owner sees progress update.
6. Contributor withdraws; progress reverses.
7. Contributor adds again; archiving the copy invalidates active progress
   without deleting Binder history.
8. Viewer cannot write.
9. Outsider cannot read private content.
10. View link works and immediate revocation works.
11. Public consent, community request/approval, Report, and Block pass.
12. Deep links recheck current permission.
13. Wall, Pulse publication, Vault intent, ownership, and public-profile flags
    remain unchanged.

Share choosers may be opened for verification but must be dismissed unsent.
No purchase, outbound share, unwanted user-content write, or unrelated mutation
is part of acceptance.

Device logs must contain no:

- fatal exception;
- ANR;
- Flutter exception;
- RenderFlex overflow;
- raw invite/view token;
- email, auth UUID, certificate number, acquisition cost, or private note.

## Forbidden Behavior

- Extending `watches` into Binder authorization.
- Treating membership as permission to scan another member's Vault.
- Passing `user_id` to a security-definer mutation as actor authority.
- Direct authenticated writes to Binder authority tables.
- UI-only role, visibility, capacity, or rate-limit enforcement.
- Anonymous or edit-by-link contribution.
- Silent public/profile/Wall/Pulse changes.
- Guessing finish or printing truth.
- Counting duplicate contributions as additional completion.
- Returning raw Binder tables to public clients.
- Logging plaintext tokens.
- Using a fake `card_print_id` to fit the existing notification outbox.
- Auto-converting ambiguous watches.
- Removing a Vault copy when a Binder link is removed.
- Changing the primary mobile dock without an approved navigation-contract
  amendment.
- Applying migrations or remote schema before contract approval.

## Review Decisions

Approving this document as written accepts the recommended choices below.
The owner may amend any item before activation.

1. **Schema gates**
   - Recommended: acknowledge that additive Binder migrations are technically
     required.
   - Contract activation, implementation authorization, migration-file
     authorization, and remote-apply authorization remain separate approvals.
   - Without migrations, only a cosmetic private-Binder rename is possible.

2. **Initial account model**
   - Recommended: existing authenticated accounts only.
   - Managed household/minor profiles remain a separate future contract.

3. **Contribution model**
   - Recommended: explicit exact-copy links with previewed bulk add.
   - Never automatic whole-Vault contribution.

4. **Target scope and edit behavior**
   - Recommended: Species Binders first.
   - Set Binders remain off until an approved server read model defines required
     completion slots; custom checklist architecture may land behind its own
     flag.
   - Species/set targets are immutable in place; start a new Binder instead.

5. **Collaboration roles**
   - Recommended: Owner, Manager, Contributor, Viewer.
   - Approval-required Manager/Contributor submissions cannot be self-approved.
   - Adopt the role-bounded suspension and no-silent-restore rules.

6. **External content and identity consent**
   - Recommended: both contribution-content consent and identity-attribution
     consent are off by default for every member.
   - External progress counts only consented contributions; identity remains
     “A Binder member” until separately enabled.
   - Rejoin or reinstatement resets consent through a new membership epoch.

7. **Community contribution**
   - Recommended: authenticated request-to-join plus approval-required
     contribution; no open editing.

8. **Legacy Project adoption**
   - Recommended: owner-reviewed opt-in conversion; never automatic backfill.

9. **Mobile navigation**
   - Recommended: prominent Vault entry and visible Dex/Set actions first.
   - Do not change the five-item dock without separately approving an amendment
     to the parent branch's experimental Pulse/Wall/Vault architecture contract.

10. **Wanted Cards**
    - Recommended: keep Wants in Vault; do not present Wanted Cards as a Binder.

11. **Notifications**
    - Recommended: in-app first; generic push only after the notification
      subject contract is safely extended.

12. **Community Templates**
    - Recommended: build after private sharing/public projection, using
      immutable versions and privacy-thresholded adoption counts.
    - A system species/set Template clones into dynamic canonical truth; a
      custom Template clone pins its immutable version.

13. **Initial limits**
    - Recommended: adopt the server defaults in Moderation and Abuse Controls,
      prove the full 25,000-contribution ceiling, then revise only through
      measured load/abuse evidence.
    - Keep the 100-membership account cap and 20-live-Binder-reference
      exact-copy cap unless higher synchronous fanout is separately proven.

14. **Lifecycle, ownership transfer, and account deletion**
    - Recommended: reversible archive; explicit Owner-only tombstone deletion;
      no client hard cascade.
    - Ownership transfer requires recipient acceptance, defaults the former
      Owner to Manager, and has no Owner gap.
    - Active and archived Binders always retain an Owner; only a deleted
      tombstone has no active Owner membership.
    - Account deletion requires transfer or explicit deletion of owned Binders.

15. **Block and report authority**
    - Recommended: the block cases in Row-Level Security and Trust are binding;
      Block cannot evade Manager moderation.
    - Extend guarded `trust_reports` Binder surfaces; do not add a competing
      Binder report system.

16. **Invitations and private member identity**
    - Recommended: support account-targeted and general one-use invitations.
    - Use an optional Binder-scoped alias for members with public profiles off;
      never fall back to email or auth identity.

## Success Definition

The system is successful when:

- a collector can understand Binders without prior explanation;
- two private authenticated collectors can build one checklist together;
- each exact copy remains in its contributor's Vault;
- progress is exact across direct, slab, and finish truth;
- sharing and collaboration are separate, explicit choices;
- a family can collaborate without enabling public profiles;
- a public/community Binder exposes no private Vault information;
- blocks, reports, revocation, roles, and consent are enforced server-side;
- mobile and web agree;
- Pulse, Wall, and Vault keep their distinct responsibilities; and
- the system can be disabled without data loss.

## Related Artifacts

- `docs/contracts/PULSE_WALL_VAULT_PRODUCT_ARCHITECTURE_V1.md`
- `docs/contracts/WALL_SECTIONS_SYSTEM_CONTRACT_V1.md`
- `docs/contracts/GV_VAULT_INSTANCE_CONTRACT_V1.md`
- `docs/contracts/CHILD_PRINTING_CONTRACT_V1.md`
- `docs/contracts/PRINTING_TRUTH_CONTRACT_V1.md`
- `docs/contracts/STABILIZATION_CONTRACT_V1.md`
- `docs/contracts/MASTER_SET_VARIANT_CONTRACT_V1.md` (currently Draft; not
  launch authority)
- `docs/contracts/LOCAL_COMMUNITY_FEED_V1.md`
- `docs/contracts/NEW_WRITE_PATH_CHECKLIST.md`
- `docs/contracts/REMOTE_SCHEMA_EDIT_POLICY_V1.md`
- `docs/DEX_UX_ADOPTION_V1.md`
- `lib/models/vault/collection_project.dart`
- `lib/services/vault/collection_project_service.dart`
- `lib/screens/vault/collection_projects_screen.dart`
- `lib/screens/dex/grookai_dex_species_screen.dart`
- `lib/screens/sets/public_set_detail_screen.dart`
- `supabase/migrations/20260706100000_product_evolution_e1_interest_graph_schema_v1.sql`
- `supabase/migrations/20260316104500_create_vault_item_instances_v1.sql`
- `supabase/migrations/20260518123000_card_printing_ownership_v1.sql`
- `supabase/migrations/20260422133000_wall_sections_data_model_v1.sql`
- `supabase/migrations/20260706120000_product_evolution_e2_notification_schema_v1.sql`
