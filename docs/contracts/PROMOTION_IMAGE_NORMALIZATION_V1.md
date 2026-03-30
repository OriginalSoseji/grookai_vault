# PROMOTION_IMAGE_NORMALIZATION_V1

## Status

ACTIVE

## Type

Asset Preparation Contract

## Scope

This contract governs promotion image normalization for warehouse candidates that already have founder-usable identity and write-plan truth.

It defines:

- normalization inputs
- derived asset rules
- normalization outputs
- persistence rules
- founder review visibility
- failure semantics
- replay safety

It does not define:

- warehouse intake
- metadata extraction
- warehouse interpretation
- canon mutation
- promotion execution
- public collector UI

## Purpose

Produce clean app-grade promotion image assets from immutable warehouse evidence before promotion apply.

## Core Principle

Raw warehouse evidence is immutable provenance.

Normalization creates derived assets only.

It must never overwrite, replace, or mutate the original evidence rows.

## System Position

The normalization position is:

`warehouse evidence -> metadata extraction -> interpreter -> write plan -> promotion image normalization -> promotion apply`

Normalization happens after identity and promotion intent are known enough to prepare a catalog-grade asset.

Normalization is asset preparation, not identity determination.

## Inputs

`PROMOTION_IMAGE_NORMALIZATION_V1` may read only:

- candidate row
- front evidence image
- back evidence image when present
- latest metadata extraction package
- current write-plan/readiness truth

Front evidence is required for a successful V1 normalization.

Back evidence is optional.

## Outputs

Normalization produces one structured package per run:

```ts
type PromotionImageNormalizationPackageV1 = {
  version: "V1";
  status: "READY" | "PARTIAL" | "BLOCKED";
  candidate_id: string;
  source_refs: {
    front_evidence_id: string | null;
    back_evidence_id: string | null;
    front_storage_path: string | null;
    back_storage_path: string | null;
  };
  outputs: {
    normalized_front_storage_path: string | null;
    normalized_back_storage_path: string | null;
  };
  method: {
    warp_used: boolean;
    openai_tunnel_used: boolean;
    pipeline_version: string;
  };
  quality: {
    front_confidence: number | null;
    back_confidence: number | null;
  };
  missing_fields: string[];
  evidence_gaps: string[];
  next_actions: string[];
  errors: string[];
};
```

The package is append-only warehouse history, not canon truth.

## Hard Rules

Normalization must:

- preserve original evidence unchanged
- write derived assets to separate storage paths
- keep provenance linkage explicit
- preserve identity-bearing details
- remain deterministic and replay-safe

Normalization must not:

- overwrite warehouse evidence
- mutate warehouse evidence rows
- invent or repaint card content
- crop away identity-bearing print details
- treat normalization as canon mutation

## Required Derived Asset Rule

A successful V1 normalization requires a normalized front image asset.

The normalized asset must:

- be perspective-correct or card-plane-correct
- exclude desk/background surroundings from the final frame
- preserve stamp/modifier text when present
- preserve printed number
- preserve set mark or printed set evidence

If the derived front image loses identity-bearing detail, V1 must fail closed.

## Optional Back Asset Rule

Back normalization is optional.

If back evidence exists and can be normalized safely, it may produce a derived back asset.

Back failure does not invalidate a successful front asset, but it must remain visible as `PARTIAL`.

## Failure Modes

Normalization must return exactly one of:

- `READY`
- `PARTIAL`
- `BLOCKED`

`READY` means a normalized front asset exists and passed identity-preservation checks.

`PARTIAL` means the front asset is usable but an optional lane, such as back normalization, did not complete.

`BLOCKED` means no lawful front normalization asset was produced.

## Persistence Rule

Normalization results are append-only warehouse events.

V1 persists only to:

- `public.canon_warehouse_candidate_events.metadata`

Recommended event types:

- `PROMOTION_IMAGE_NORMALIZATION_STARTED`
- `PROMOTION_IMAGE_NORMALIZATION_READY`
- `PROMOTION_IMAGE_NORMALIZATION_PARTIAL`
- `PROMOTION_IMAGE_NORMALIZATION_BLOCKED`

V1 does not mutate evidence rows.

## Founder Truth

Founder review must be able to see:

- latest normalization status
- normalized front preview when present
- normalized back preview when present
- raw evidence alongside derived normalization output

Founder review must never lose access to the original warehouse evidence.

## Replay Safety

If the same candidate, source evidence, pipeline version, and derived result already exist, V1 must not append duplicate events.

Reruns must converge to the same package or fail explicitly.

## Result

Promotion image normalization is now a distinct derived-asset boundary.

It prepares app-grade promotion imagery while keeping raw warehouse evidence immutable and auditable.
