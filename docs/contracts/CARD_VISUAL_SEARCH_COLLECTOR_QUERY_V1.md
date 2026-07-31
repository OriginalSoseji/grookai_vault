# Card Visual Search Collector Query V1

## Status

Active local-search contract. No production activation is authorized.

## Purpose

Collectors may ask natural visual questions without choosing canonical, cameo,
or Fact Graph search first.

This contract adds deterministic collector grammar on top of
`CARD_VISUAL_SEARCH_UNIFIED_EVIDENCE_V1`.

## Identity Aliases

Common collector shorthand and spelling variants normalize before parsing:

- `Pika` becomes `Pikachu`;
- `Ghastly` becomes `Gastly`;
- `Pokeball`, `Poké Ball`, and `Poke Ball` share the query object
  `poke ball`.

The result evidence still uses canonical identity and raw source wording.

## Multiple Subjects

Multiple required identities must occur in one artwork group.

Examples:

- `Mimikyu and Pikachu together`
  - requires Mimikyu evidence AND Pikachu evidence.
- `Gengar and Haunter or Gastly`
  - requires Gengar evidence AND either Haunter OR Gastly evidence.

No result may satisfy different required identities using different cards.

Independent character-presence evidence may come from:

- observation-backed scene subjects;
- observation-backed depicted subjects;
- human image-confirmed scene or depicted subjects;
- explicitly role-confirmed external scene or depicted subjects.

Character representations do not satisfy an unqualified multi-character
presence requirement. They require explicit object language such as `Pikachu
cookie`, `Pikachu pin`, or `Pikachu plush`.

Intrinsic mimicry, disguises, lookalike anatomy, and species resemblance are
`visual_resemblance_reference` evidence. They never prove a second character
is independently present.

Canonical card identity helps locate direct cards but does not fabricate a
missing visual observation.

## Representations

`Pika shaped cookie` requires Pikachu-bound food-shape evidence whose visible
object form is a cookie.

Slurpuff `GV-PK-ASC-094` has a governed founder image-review record confirming:

- one Pikachu-shaped cookie is visibly present;
- the held cookie's identity remains unconfirmed.

The correction is external human evidence. It does not modify the paid Fact
Graph or invent an observation ID.

## Subject-Object Relationships

`Pokemon holding a pokeball` requires:

- a visible Pokémon subject;
- visible Poké Ball object evidence;
- a holding relationship connected to that same Pokémon through shared
  evidence.

A Trainer holding a Poké Ball while an unrelated Pokémon appears elsewhere
does not satisfy the query.

The same evidence-binding rule applies to future supported subject-object
relationships.

## Minimum Visible Pokémon Counts

`card with 3 or more Pokemon` counts supported visible Pokémon appearances
across:

- scene subjects;
- depicted subjects;

Representations may be included only when the query explicitly requests
represented characters or character-shaped objects. Resemblance references and
role-unresolved curated associations are never counted as independently
present Pokémon.

Identities are deduplicated across duplicate evidence terms.

An exact per-identity count, such as three visible Jumpluff, may increase the
instance count beyond one.

Results above the requested minimum receive a small bounded ranking bonus.
They do not bypass other query constraints.

## Strict-Zero Rule

The parser may understand a query even when the current corpus has no supported
result.

For example, `Gengar and Haunter or Gastly` returns zero in the current
9,532-artwork projection because no eligible artwork proves the requested
co-occurrence. The engine must not weaken the query to separate Gengar,
Haunter, or Gastly cards.

## Result Explanation

Results preserve:

- every parsed subject and AND/OR group;
- query aliases;
- relationship constraints;
- minimum-count constraints;
- matched evidence authority;
- observation or external evidence IDs;
- derived visible Pokémon count;
- governance status for curated or human-reviewed evidence.

Ordinary collectors see concise reasons and editable interpretation chips.
Observation IDs, governance codes, and internal tiers remain inside the
expandable evidence panel or reviewer exports.

When a hard multi-constraint query has no exact match, the UI explains which
constraints were understood and offers explicit relaxations. Partial cards are
not displayed until the collector chooses a relaxation.

## Boundaries

- No OpenAI calls.
- No paid Fact Graph regeneration.
- No database reads or writes.
- No embeddings.
- No approval-status mutation.
- No production or public search activation.

## Next Gate

Add these query families to mixed-query human calibration:

- shorthand identity;
- two required subjects;
- required subject plus alternatives;
- representation form;
- bound subject-object relationship;
- minimum visible-subject count;
- valid zero with understood grammar.

Freeze behavior only after image-based relevance review.
