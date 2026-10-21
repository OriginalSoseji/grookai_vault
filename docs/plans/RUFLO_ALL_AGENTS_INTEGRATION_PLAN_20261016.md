# Ruflo All-Agents Integration Plan — October 16, 2026

## Status

`IMPLEMENTATION IN PROGRESS — R0 READ-ONLY ONLY`

This document defines how Grookai can use Ruflo as a bounded coordination
layer across the repository's agents, workers, supervisors, workflows, and
active development lanes. It does not authorize production writes, workflow
dispatch, branch cleanup, worktree mutation, deployment, publication, or a
Ruflo version/tool-surface change.

The existing repository-scoped integration remains the baseline:

- exact package pin `ruflo@3.56.9`;
- child-process stdio transport started by Codex on demand;
- explicit coordination, task, memory, progress, guidance, and workflow-read
  allowlist;
- no initializer, daemon, HTTP, WebSocket, Docker, terminal, GitHub, browser,
  federation, managed-agent, or unrestricted fetch surface;
- Grookai contracts, the Operations Agent Protocol, and explicit founder
  authorization remain authoritative.

Implementation progress as of October 21, 2026:

- PR step 1 has a stacked registry, semantic validator, and protected-worktree
  inventory candidate at `docs/checkpoints/RUFLO_AGENT_REGISTRY_V1_20261016.md`;
- PR step 2 has a stacked local-only Operations health/evidence adapter and
  frozen R0 task-envelope candidate at
  `docs/checkpoints/RUFLO_READONLY_OPERATIONS_ADAPTER_V1_20261017.md`;
- PR step 3 has a stacked seven-cycle Universal Catalog Discovery shadow pilot
  at `docs/checkpoints/RUFLO_UNIVERSAL_CATALOG_SHADOW_PILOT_V1_20261019.md`;
- none of the candidates is merged or activated, and the pilot remains R0 with
  zero qualifying cycles because all seven observations were source-degraded;
  Cycle 7 predates merged fallback repair
  `6f43ce2e70900ca978fd7260c6bb8434787f67f0`, so the next gate is its first
  naturally scheduled post-merge run.

## Outcome

Ruflo will become a coordination plane, not a second execution platform.
It will help Codex and Grookai operators decompose work, assign bounded tasks,
track dependencies, retain sanitized coordination memory, and aggregate
evidence. Existing Grookai systems will continue to own execution:

- GitHub Actions owns hosted workflow execution;
- systemd and scheduled tasks own their existing host runtimes;
- Supabase migrations and bounded executors own database changes;
- the Operations Agent Protocol owns registered-agent identity, health,
  incidents, work items, commands, leases, and durable evidence;
- Git branches and isolated worktrees own source changes;
- domain contracts own truth, safety, promotion, publication, and release
  decisions.

No worker becomes safer or more authorized merely because Ruflo can name,
schedule, or observe it.

## Non-Goals

- Replacing the Operations Agent Protocol or Founder Operations.
- Replacing GitHub Actions, systemd, Windows Task Scheduler, Supabase, or Codex.
- Giving Ruflo direct shell, GitHub, browser, database, deployment, or
  production credentials.
- Importing every script as an independently runnable autonomous agent.
- Letting one agent write into another agent's worktree.
- Treating stale age, merged ancestry, a closed PR, or missing registration as
  permission to delete a branch, worktree, directory, artifact, or checkpoint.
- Running `ruflo init`, installing a user-scoped plugin, or following
  `ruflo@latest`.

## Authority Model

The authority order is:

1. Founder instruction and explicit action-specific approval.
2. `AGENTS.md`, the Grookai rulebook, and domain contracts.
3. Frozen plans, fingerprints, exact commits, and existing execution gates.
4. Operations Agent Protocol registration and command policy.
5. Ruflo coordination state.

When records disagree, the higher layer wins and the Ruflo task stops. Ruflo
memory is never canonical proof of production, Git, database, or release state.
Direct readback from the owning system is required.

## Target Architecture

```text
Founder / operator
        |
        v
Codex session in one assigned worktree
        |
        v
Pinned Ruflo stdio MCP — planning, delegation, status, sanitized memory
        |
        v
Grookai Ruflo adapter — registry validation, leases, policy, evidence links
        |
        +----------------------+----------------------+-------------------+
        |                      |                      |                   |
        v                      v                      v                   v
Catalog coordinator      Pricing coordinator   Product/release     Governance/review
        |                      |                  coordinator         coordinator
        v                      v                      v                   v
Existing scripts, GitHub Actions, host services, and bounded executors
        |
        v
Operations control plane + immutable artifacts + direct system readback
```

Ruflo may propose and coordinate. A Grookai adapter must validate every task
against registry, worktree, authority, risk, concurrency, and evidence rules
before an executor can receive it.

## Integration Dimensions

Every current and future automation surface must be represented across three
orthogonal dimensions. A value in one dimension never lowers or replaces the
restrictions imposed by another dimension.

| Dimension | Allowed values | Meaning |
|---|---|---|
| Lifecycle state | `registered`, `unregistered`, `retired` | Whether the surface has a stable registry identity and active Operations Agent Protocol lifecycle. Dirty, experimental, detached, or otherwise in-flight work remains `unregistered`; historical evidence remains `retired`. |
| Topology role | `operations_agent`, `domain_supervisor`, `bounded_worker` | Whether Ruflo observes a durable agent, decomposes a bounded domain, or prepares one deterministic operation. This describes coordination shape, not write authority. |
| Action risk | `read_only`, `source_write`, `external_write` | The highest-impact action the surface can request. `source_write` is limited to its assigned worktree. `external_write` includes deploy, publish, submit, migration, database, Storage, account, payment, and other external-state changes. |

Lifecycle registration and action risk are independent. For example,
`catalog-set-outcome-v1` and `tk-sm-r-hidden-set-apply-v1` are registered
operations agents whose action risk is `external_write`; registration does not
make their writers Ruflo-executable. Ruflo may observe their lifecycle and
prepare review material, while execution remains behind the existing command,
approval, frozen-plan, lease, and readback gates. An unregistered surface is
observe-only regardless of its intended topology role or action risk, and a
retired surface is index-only until a new review creates new authority.

## Current Agent Estate

This is the October 16 inventory baseline. Phase 1 will convert it into a
machine-validated registry and will fail closed when a source cannot be
represented across every required dimension.

### Registered Operations Agents

| Agent key | Domain | Trigger | Initial Ruflo mode |
|---|---|---|---|
| `universal-catalog-discovery-v1` | Catalog discovery | Cron every six hours | Observe and coordinate review |
| `tcgplayer-pricing-completion-v1` | Pricing completion | Hourly cron | Observe backlog and route bounded review |
| `catalog-set-outcome-v1` | Catalog outcome workflow | Event/manual workflow | Plan-only until command adapter is separately approved |
| `tk-sm-r-hidden-set-apply-v1` | Catalog bounded apply | Event | Status-only; high-risk execution remains external |

The following completion lanes are named in current policy but are not all
registered executable agents. They enter Ruflo as backlog owners, not as
automatic writers:

- `new-set-admission-v1`;
- `cross-tcg-sealed-completion-v1`;
- `funko-catalog-completion-v1`.

The pricing backlog policy also assigns work to these logical repair owners:

- `tcgplayer-identity-mapping-repair-v1`;
- `catalog-printing-evidence-repair-v1`;
- `exact-printing-repair-v1`;
- `market-price-source-recovery-v1`;
- `printing-finish-assignment-repair-v1`;
- `special-variant-pricing-expansion-v1`;
- `tcgplayer-edition-authority-repair-v1`;
- `pricing-backlog-triage-v1`.

These names must not be passed to `agent_execute` until each has a real registry
entry, source locator, owner, permission tier, execution contract, and tests.

### Catalog And Discovery Family

| Surface | Current role | Ruflo adoption |
|---|---|---|
| Universal catalog discovery | Multi-TCG official-source, evidence-only gap detection | Phase 2 read-only pilot |
| English Pokémon Master Index refresh | Language-scoped authority refresh and reconciliation | Phase 3 catalog coordinator |
| Japanese Pokémon Master Index refresh | Language-scoped authority; active global-catalog work remains protected | Phase 2 status/evidence pilot, then Phase 3 |
| Pokémon global discovery agent | In-flight English/Japanese/Chinese discovery planner in the dirty primary tree | `unregistered` and observe-only until checkpointed and merged; then Phase 2 read-only pilot |
| MTG catalog supervisor | Read-only frozen-manifest watchdog | Phase 2 read-only pilot |
| MTG incremental promotion and hidden runner | Bounded source-specific promotion | Phase 4, single-writer only |
| One Piece incremental promotion and set closure | Source-specific promotion and release reconciliation | Phase 4, single-writer only |
| English/Japanese Pokémon incremental promotion | Source-specific promotion | Phase 4, single-writer only |
| Cross-TCG publication and cover-gap lanes | Publication gates and image/cover repair | Phase 3 observe; writes Phase 4 |
| Collectible shadow adapters and wave-one parsers | Non-canonical discovery/reconciliation | Phase 3 read-only/advisory |
| Sealed-product catalog lanes | Pokémon, MTG, and cross-TCG sealed evidence and completion | Phase 3 observe; writes Phase 4 |
| Funko catalog completion | Policy-defined but incomplete registration | Hold until a source contract and agent registration exist |

### Pricing, Market Evidence, And MEE Family

| Surface | Current role | Ruflo adoption |
|---|---|---|
| TCGPlayer pricing completion agent | Measures full backlog and routes deterministic repair lanes | Phase 2 read-only pilot |
| TCGPlayer market pipeline, health, publication, active ask, rollback, scheduler | Production pricing lifecycle | Phase 3 observe; Phase 4 dispatch only through existing gates |
| TCGPlayer mapping and repair workers | Exact product/printing/finish resolution | Phase 3 plan/review; Phase 4 bounded applies |
| Local Ollama triage and market-evidence review | Advisory classification only | Phase 2 advisory pilot; never truth or write authority |
| MEE nightly and reference refresh workers | Market evidence execution and reference provenance | Phase 3 observe; preserve independent runtime and schedule |
| MTG pricing publication and sealed pricing refresh | Game-specific pricing publication | Phase 3 observe; Phase 4 existing writer gates only |
| eBay, JustTCG, and generic import workers | Source acquisition or pricing evidence | Phase 3 per-source registration before use |

### Identity, Images, Ingestion, Warehouse, And Vault Family

This family includes the backend identity scan, vision, species, mapping,
source-image enrichment, controlled-growth ingestion, Pokémon import/normalize,
set import, TCGCSV warehouse, classification, metadata extraction, promotion,
image normalization, print-identity backfill, and Vault-instance backfill
workers. Ruflo adoption is Phase 3 for observation and Phase 4 only for workers
that already have a bounded writer contract. No generic warehouse or identity
worker receives canonical-write authority from the integration.

### Condition, Billing, Commerce, And External Systems Family

Condition-analysis workers, eBay account synchronization, vendor billing,
vendor commerce, seller closeout, receipt delivery, storefront, mobile release,
and store-console work receive independent lifecycle, topology-role, and
action-risk values. Ruflo may coordinate local analysis and evidence. Payments,
customer communications, account changes, store submission, public release,
and other external actions remain outside Ruflo authority and require their
existing explicit approvals.

### CI, Release, And Infrastructure Family

The repository contains contract gates, Flutter/build workflows, release
workflows, probes, capacity audits, migration workflows, deployment helpers,
and special-variant apply/health lanes. They are integrations to observe, not
agents to duplicate. Phase 3 records their status and artifacts. Phase 4 may
prepare a dispatch request, but the current Ruflo tool surface has no GitHub or
terminal capability and must remain that way.

## Active Worktree Protection Baseline

All current worktrees are protected inputs to the plan. Their existence or age
must never be interpreted as abandonment.

| Worktree or group | Current branch/domain | Ruflo rule |
|---|---|---|
| `C:\grookai_vault` | Dirty app visual simplification and in-flight Pokémon global discovery | Observe only; no writes, checkout, clean, reset, move, or removal |
| `C:\grookai_cog_tracking_20261016` | Main/cognitive tracking | Separate owner lease required |
| `C:\grookai_market_links` | Flutter market links | Separate owner lease required |
| `C:\grookai_mee_governance_20261015` | Dirty MEE governance | Observe only until owner assigns it |
| `C:\grookai_vault_app_visual_integration` | App visual integration | Separate owner lease required |
| `C:\grookai_vault_full_route_redesign_20261015` | Web route redesign | Separate owner lease required |
| `C:\grookai_vault_vault_add_repair_20260916` | Anniversary Vault-add repair | Separate owner lease required |
| `C:\gv_gamestop_zoroark_20261001` | Catalog repair | Separate owner lease required |
| `C:\gv_jpn_catalog_checkpoint_20261016` | Active Japanese global catalog checkpoint | Active; preserve and resume from its checkpoint |
| `C:\gv_jungle_edition_20261001` | Jungle production catalog repair | Separate owner lease required |
| `C:\gv_mep_catalog_backfill_20261016` and detached release | MEP catalog backfill | Treat as one protected release lane |
| `C:\gv_ollama_bulk_mapper_20261017` | Dirty Ollama mapping lane | Observe only until owner assigns it |
| `C:\gv_overhaul_release_20261011` | Dirty overhaul release | Observe only until owner assigns it |
| `C:\gv_pricing_completion_agent_20261013` | Dirty pricing completion | Observe only until owner assigns it |
| `C:\gv_pricing_market_history_20261012` | Dirty market history | Observe only until owner assigns it |
| Pricing review-lead release checkouts | Detached validation/release | Evidence-only unless exact release contract assigns them |
| Receipt delivery worktree | Receipt delivery | External-action class; no dispatch |
| TCGPlayer mass-cleanup worktree and detached release | Pricing cleanup/release | Treat as one protected release lane |
| Sparse-clone release worktrees | MTG deck cover, One Piece release, shadow baseline | Preserve; One Piece audit directory remains untracked and protected |
| `C:\gv_ruflo_all_agents_plan_20261016` | This documentation-only plan | The only worktree assigned to this planning task |

The registry must discover new worktrees dynamically. An unknown directory,
detached checkout, dirty status, untracked file, running process, scheduled
task, or unreadable state always increases protection; it never makes cleanup
eligible.

## Registry Contract To Implement

Phase 1 adds a versioned registry, proposed at
`config/ruflo/agent_registry_v1.json`. Each record must include:

- `agent_key`, display name, domain, owner label, lifecycle state, topology role,
  and action-risk class;
- source branch/ref, source locator, and entrypoint;
- execution platform and schedule/trigger semantics;
- assigned worktree policy and protected path patterns;
- read/write boundary and permission tier;
- allowed work-item and command types;
- required contract, frozen-plan, commit, and fingerprint inputs;
- concurrency/resource-lock keys;
- timeout, retry, idempotency, and cancellation behavior;
- evidence outputs, retention class, and direct-readback requirement;
- heartbeat/staleness policy appropriate to cron, timer, continuous, event, or
  manual execution;
- Ruflo topology role and memory namespace;
- current coordination-adoption state: `not_adopted`, `observed`, `pilot`,
  `coordinated`, `execution_eligible`, or `held`. Lifecycle `unregistered` and
  `retired` are recorded only in the lifecycle dimension, not overloaded as
  adoption states.

Registry validation must reject duplicate agent keys, duplicate lock
declarations within one record, missing contracts, unsafe paths, secret-bearing
fields, unpinned source references, and write-capable records without rollback
and readback requirements. Multiple agents may and should declare the same
resource-lock key when they can contend for that resource. The runtime lease
manager, not registry uniqueness, enforces exclusive ownership so that only one
write-capable task holds the shared resource lock at a time.

## Permission Tiers

| Tier | Allowed | Required gate |
|---|---|---|
| R0 | Read repository state and existing sanitized evidence | Valid registry record |
| R1 | Produce plan/report artifacts in the assigned clean worktree | Worktree lease and path allowlist |
| R2 | Modify source in the assigned isolated worktree | Explicit task scope, clean baseline, tests, diff review |
| R3 | Request remote workflow/PR action | Existing GitHub authorization path; not a Ruflo tool |
| R4 | Request bounded staging/production execution | Operations command claim, frozen plan, approval, exact commit, readback |
| R5 | Irreversible/public/account/legal/payment/store action | Never autonomous; explicit founder action authorization |

The initial rollout supports only R0 and R1. R2 is added per domain after the
worktree-protection contract passes. R3-R5 remain outside the Ruflo MCP tool
surface.

## Worktree Ownership And Concurrency

1. One Ruflo task may hold one write lease for one exact worktree.
2. A task may read other worktrees only when the path is registered and no
   private artifact is exposed.
3. A dirty worktree is read-only unless its current owner explicitly assigns
   that exact tree and scope.
4. Ruflo and its adapters may never run branch deletion, worktree removal,
   `git clean`, `git reset`, broad pruning, recursive deletion, or cross-tree
   moves.
5. Branch age, merge ancestry, closed PR state, and missing remote refs are
   informational only.
6. Resource locks are separate from worktree locks. At minimum use:
   `catalog:<game>:<set>`, `pricing:<source>:publication`,
   `database:<project>:migration`, `storage:<bucket>:<prefix>`,
   `release:<platform>:<audience>`, and `github:<workflow>:dispatch`.
7. Only one write-capable task may hold a resource lock. Read-only tasks may
   share it only when the governing contract permits consistent observation.
8. A lost lease stops execution. Recovery begins with direct readback, never
   an assumed cursor or replay of the prior command.

## Task Envelope And Lifecycle

Every Ruflo-coordinated task must carry a frozen envelope:

- task ID, parent goal, agent key, lifecycle state, topology role, action-risk
  class, and permission tier;
- exact repository, commit/ref, assigned worktree, and initial status hash;
- objective, inclusions, exclusions, and explicit non-goals;
- required inputs and their SHA-256 fingerprints;
- allowed commands or workflow references, if any;
- worktree and resource lease keys;
- time, row, request, cost, and concurrency budgets;
- expected artifacts and acceptance tests;
- cancellation and rollback procedure;
- required independent readback;
- authority record for any R3+ request.

Lifecycle:

```text
proposed -> validated -> leased -> running -> evidence_pending
         -> verified -> complete
         -> held | failed | cancelled | superseded
```

`complete` requires the declared outcome and readback, not merely a successful
process exit. A nonzero backlog may be a valid incomplete result rather than a
failed agent. Superseding a task preserves the prior evidence and creates a new
fingerprint.

## Ruflo Memory Policy

Ruflo memory is coordination cache, not system of record.

- Namespace: `grookai/<domain>/<agent_key>/<task_id>/<commit>`.
- Store decisions, dependency summaries, artifact paths, hashes, test results,
  and sanitized failure classifications.
- Do not store tokens, keys, cookies, environment dumps, personal collector
  data, customer data, private artifact contents, or approval secrets.
- Store references to frozen plans and durable evidence, not unbounded logs.
- Default task memory retention: 30 days after terminal state.
- Durable milestones must be copied into repository checkpoints, Operations
  evidence, or the owning external artifact store before memory expires.
- Memory from one domain cannot authorize another domain.
- A registry or contract version change invalidates cached execution advice.

## Domain Coordination Topology

Use a hierarchical topology with cross-domain review, not an unrestricted
mesh:

- a root coordination task owns dependencies and final aggregation;
- domain coordinators own catalog, pricing/MEE, identity/warehouse,
  product/release, and governance/review;
- worker tasks have one parent coordinator and one bounded output;
- cross-domain agents exchange artifact references, never write directly into
  another domain's state;
- reviewer tasks have no writer permission;
- production writer tasks cannot review or approve their own result;
- release tasks consume immutable commits and manifests, not mutable working
  directories.

Recommended initial concurrency is four total Ruflo tasks, no more than two
network-heavy read-only tasks, and exactly one task with any write lease. Domain
contracts may lower these limits. Raising them requires measured resource and
race-condition evidence.

## Rollout Plan

### Phase 0 — Freeze Boundaries And Protect Current Work

Deliverables:

- preserve the current pinned stdio integration and existing contract test;
- snapshot worktrees, dirty/untracked state, scheduled tasks, active processes,
  registered operations agents, and active goals;
- mark every current tree protected by default;
- record the Japanese global catalog and Pokémon global discovery as active,
  not abandoned;
- establish that no cleanup action is part of Ruflo integration.

Exit gate: a read-only inventory can be reproduced without changing any target.

### Phase 1 — Registry, Policy, And Read-Only Adapter

Deliverables:

- `config/ruflo/agent_registry_v1.json`;
- schema and semantic validator;
- worktree/resource lease model;
- sanitized task-envelope builder;
- adapter that reads Operations Agent Protocol health and evidence without
  publishing commands;
- generated inventory report covering every backend worker, script worker,
  GitHub workflow, host-scheduled lane, and protected active worktree;
- contract tests for pin, tool allowlist, registry completeness, secret
  rejection, worktree protection, and duplicate-writer rejection.

Exit gate: Ruflo can list and reason about all classified surfaces with R0 only.

### Phase 2 — Read-Only Pilots

Pilot order:

1. `universal-catalog-discovery-v1` — stable registered agent and evidence-only
   contract.
2. MTG catalog supervisor — read-only frozen-manifest watchdog.
3. `tcgplayer-pricing-completion-v1` — read-only backlog measurement and
   deterministic repair routing.
4. Japanese global catalog — status and artifact coordination from its active
   checkpoint, without taking ownership of its worktree.
5. Pokémon global discovery — only after its in-flight source is checkpointed,
   reviewed, and merged into an isolated pilot branch.
6. Local Ollama advisory lanes — recommendations only, with deterministic
   filters and no truth/write authority.

Each pilot must run shadow-only for at least seven successful cycles or seven
days, whichever produces more meaningful schedule coverage. Zero cross-worktree
mutation, zero secret leakage, stable task fingerprints, and complete evidence
links are mandatory.

### Phase 3 — Domain Coordinators

Add catalog, pricing/MEE, identity/warehouse, product/release, and
governance/review coordinators. They may create plans, identify blockers, and
aggregate evidence. They do not dispatch production writers.

Exit gate: replaying the same inputs produces the same task graph and no
duplicate work items; event/manual agents are not falsely marked stale.

### Phase 4 — Supervised Bounded Execution

Enable R2 source work first, one domain at a time. R3/R4 requests may be
prepared only for existing governed executors. Required controls:

- exact clean commit and assigned worktree;
- frozen plan and payload fingerprint;
- existing approval/command claim;
- one writer resource lock;
- idempotency key and retry-safe executor;
- rollback or stop procedure;
- independent readback by a separate reviewer;
- evidence retained outside Ruflo memory.

No generic terminal or GitHub Ruflo tool is added. Codex or the existing
operations gateway performs the authorized action through the existing system.

### Phase 5 — Observability And Operations

Add dashboards for coordination health, task age, lease state, evidence
completeness, failure class, retries, resource use, and outcome status. Feed
durable lifecycle events into the Operations Agent Protocol rather than making
Ruflo a competing health database.

Exit gate: disabling Ruflo leaves every existing worker and schedule functional.

### Phase 6 — Controlled Expansion And Upgrade Policy

Only after the previous phases pass may additional Ruflo tools or a new version
be considered. Follow the existing package review, tarball hashing, initializer
inspection, stdio handshake, and forbidden-prefix checks. An upgrade is a new
security/integration review, not routine dependency drift.

## Pull Request Sequence

1. **Registry foundation:** schema, current inventory, validators, and tests.
2. **Read-only adapter:** Operations health/evidence reader and task envelopes.
3. **Catalog pilots:** universal discovery and MTG supervisor.
4. **Active Pokémon pilots:** Japanese checkpoint adapter, then merged global
   discovery agent.
5. **Pricing pilots:** pricing completion and advisory/Ollama lanes.
6. **Domain coordinators:** deterministic task graphs and resource locks.
7. **R2 source execution:** isolated worktree lease and diff/test evidence.
8. **Governed command bridge:** optional R3/R4 request preparation through the
   existing Operations command system.
9. **Observability and recovery:** dashboards, failure injection, disable and
   rollback drills.

Every PR must be independently rollbackable and must leave the existing agents
operational when Ruflo is disabled.

## Required Test Matrix

- Exact Ruflo version, stdio transport, timeout, and tool allowlist.
- Zero forbidden tool prefixes or user-scoped configuration.
- Registry schema, unique keys, stable serialization, and complete lifecycle,
  topology-role, and action-risk classification.
- Secret-key and sensitive-payload rejection.
- Dirty, detached, untracked, unreadable, unknown, and actively owned worktree
  protection.
- Cross-worktree write rejection and path traversal rejection.
- Worktree lease and resource-lock contention.
- Single-writer enforcement for catalog, pricing, migration, Storage, and
  release resources.
- Deterministic task graph and idempotency under retry.
- Cancellation, timeout, lost lease, partial evidence, and lost response.
- Operations health semantics for cron/timer/continuous versus event/manual.
- Memory namespace isolation, retention, redaction, and invalidation.
- Failure recovery by direct readback, without assumed cursor or replay.
- Ruflo-disabled continuity for existing workflows and host services.
- Independent reviewer/readback before completion of any write-capable task.

## Success Metrics

- Zero deleted, reset, cleaned, moved, or cross-mutated active worktrees.
- Zero production or external actions without the pre-existing approval gate.
- Zero secrets or personal/customer data in Ruflo memory or artifacts.
- Zero duplicate production writer runs caused by coordination retries.
- 100% of coordinated tasks mapped to registry, contract, commit, owner, and
  evidence records.
- 100% of write-capable tasks protected by one writer lock and independent
  readback.
- Correct health classification for periodic and event/manual agents.
- Existing agent schedules continue unchanged when Ruflo is disabled.
- Pilot tasks show deterministic plans and complete evidence for seven cycles.

## Stop Conditions

Disable the project Ruflo MCP integration and halt new coordination when any of
the following occurs:

- a worktree outside the assigned path changes;
- a protected branch, directory, untracked artifact, or checkpoint is moved or
  removed;
- a forbidden tool appears;
- a task reaches an executor without a valid registry record or lease;
- two writers hold the same resource;
- a secret or customer/private payload is persisted;
- a task claims completion without direct readback;
- Ruflo memory disagrees with the owning system and the task continues;
- an upgrade or initializer changes project or user-scoped files unexpectedly.

Recovery preserves all worktrees and evidence. It may set
`[mcp_servers.ruflo].enabled = false` in a reviewed repository change or revert
the exact integration commit. It must not use Git cleanup as a recovery method.

## Decisions And Recommended Defaults

| Decision | Recommended default |
|---|---|
| Initial authority | R0/R1 only |
| Pilot domains | Universal catalog, MTG supervisor, pricing completion, Japanese checkpoint |
| Total concurrency | 4 tasks |
| Network-heavy concurrency | 2 read-only tasks |
| Write concurrency | 1 globally until domain lock evidence exists |
| Memory retention | 30 days after terminal task state |
| Secrets/private data | Prohibited |
| GitHub/terminal/browser tools | Keep disabled |
| Production dispatch | Existing Operations command path only |
| Active dirty worktrees | Observe only unless their owner assigns them |
| Cleanup authority | None |
| Ruflo upgrade | Separate reviewed change; retain `3.56.9` for this rollout |

These defaults allow implementation to begin without widening authority. Any
different choice must be captured as a versioned contract change before it is
used.

## First Implementation Milestone

The next implementation step is PR 1 only: build the registry foundation and
read-only inventory validator from a fresh isolated worktree based on current
`origin/main`. It must not call `agent_execute`, dispatch a workflow, touch a
production system, or edit any existing active worktree.

PR 1 is complete when:

1. every current automation surface has lifecycle, topology-role, and
   action-risk values;
2. every current worktree is represented as protected state;
3. registered operations-agent records reconcile with source code;
4. the validator fails closed on an unknown writer, duplicate lock declaration
   within one record, dirty-tree write assignment, secret field, or missing
   contract, while allowing agents that contend for the same resource to share
   a lock key;
5. focused tests and `git diff --check` pass;
6. a generated report proves zero external and production writes.

Implementation candidate status is recorded in
`docs/checkpoints/RUFLO_AGENT_REGISTRY_V1_20261016.md`. It remains read-only and
does not authorize the later pilot or execution phases.

## References

- [Grookai Ruflo Codex integration runbook](../ops/RUFLO_CODEX_INTEGRATION_20261015.md)
- [Operations Agent Protocol V1](../contracts/OPERATIONS_AGENT_PROTOCOL_V1.md)
- [Universal Catalog Discovery Supervisor V1](../contracts/UNIVERSAL_CATALOG_DISCOVERY_SUPERVISOR_V1.md)
- [MTG Catalog Supervisor V1](../contracts/MTG_CATALOG_SUPERVISOR_V1.md)
- [Grookai Operator Playbook](../ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md)
- [Grookai rulebook](../GROOKAI_RULEBOOK.md)
- [OpenAI Agents guide](https://developers.openai.com/api/docs/guides/agents)
- [OpenAI Codex CLI and Agents SDK workflow example](https://developers.openai.com/cookbook/examples/codex/codex_mcp_agents_sdk/building_consistent_workflows_codex_cli_agents_sdk)
- [Ruflo repository](https://github.com/ruvnet/ruflo)
- [Ruflo V3 documentation](https://github.com/ruvnet/ruflo/blob/main/v3/README.md)
