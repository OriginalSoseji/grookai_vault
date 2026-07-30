# Grookai Unified Collector Search V2

Status: IMPLEMENTED, INACTIVE SIGNED-IN BETA

## Product Contract

Grookai Search combines canonical catalog identity, observable visual facts,
approved appearance evidence, and ordinary collector filters without asking
the collector to choose a search engine.

The runtime interfaces are versioned:

- `UnifiedCollectorSearchIntentV2`
- `VisualEvidenceAuthorityV2`
- `UnifiedCollectorSearchResponseV2`

The signed-in beta is disabled unless
`GROOKAI_UNIFIED_COLLECTOR_SEARCH_V2_ENABLED=true`. Anonymous search always
uses the existing canonical path.

## Hard Constraints

Identity, appearance role, subject count, relationship, language, printing,
finish, and canonical filters are hard constraints. Semantic similarity may
improve recall only after these constraints are satisfied.

Vectors can never prove:

- a character identity;
- an appearance role;
- two characters in the same artwork;
- a count;
- a relationship;
- a printing or finish.

No embedding configuration or vector runtime is activated by this contract.

## Appearance Roles

- `scene_subject`: independently present in the illustrated scene.
- `depicted_subject`: shown inside another visible surface.
- `character_representation`: an object shaped or patterned as a character.
- `curated_association_unresolved`: candidate/reviewer use only.
- `visual_resemblance_reference`: intrinsic mimicry, disguise, or lookalike
  appearance.

`Mimikyu and Pikachu` requires separate scene or depicted evidence for both
identities in one artwork group. A Mimikyu costume resembling Pikachu and an
external row with unresolved notes cannot satisfy it.

## Authority

Collector results accept:

- observation-backed Fact Graph evidence;
- human image-confirmed evidence;
- explicitly role-confirmed external evidence.

Candidate and role-unresolved evidence remains in staging.

The active runtime hydrates release-scoped evidence assertions separately from
Fact Graph documents. Assertion IDs remain external evidence IDs; they are
never converted into observation IDs or copied into paid source graphs.

## Collector Response

Collector-facing interpretation uses editable natural-language chips. Results
are grouped by identity or appearance role. Each card has one concise reason.
Full provenance, role, confidence, and visible evidence are available on
request.

Hard zero results show:

- a natural explanation;
- per-constraint coverage;
- explicit relaxation controls.

The response does not silently return partial cards.

## Corrections

Signed-in collectors may report:

- Character not present
- Wrong role
- Wrong object
- Missing detail

Reports enter `card_visual_search_corrections`. They never alter active search,
evidence assertions, or canonical identity.

## Runtime Failure

The V2 server adapter fails closed. Missing migration, inactive release, RPC
failure, unsupported intent, or timeout leaves canonical search available.
No visual result is fabricated from semantic similarity or unresolved
evidence.

The signed-in beta also fails closed when a query contains a hard filter or
relationship that its web adapter cannot yet bind. It never removes the
unrecognized clause and executes a broader visual query. Canonical search
remains available until that structured constraint is implemented.

## Activation Gates

1. Deterministic and lexical evaluation passes.
2. Source-backed collector demand queries join the 250-query contract.
3. The high-risk holdout has zero identity-presence, role-confusion,
   canonical-filter, or printing-expansion failures.
4. Evidence references reconcile at 100 percent.
5. A bounded embedding canary proves ranking benefit without bypassing facts.
6. The private migration is applied and smoke-tested.
7. One immutable release is loaded and verified.
8. The signed-in feature flag is enabled for a bounded canary.

Public anonymous visual search remains a later licensing and product gate.
