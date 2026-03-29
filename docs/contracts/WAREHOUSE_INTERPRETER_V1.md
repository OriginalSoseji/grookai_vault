# WAREHOUSE_INTERPRETER_V1

## Status

ACTIVE

## Type

Interpreter Contract

## Scope

This contract governs `WAREHOUSE_INTERPRETER_V1`.

It defines the deterministic interpretation layer that converts current warehouse candidate reality into structured founder-review truth before promotion.

It applies to:

- warehouse candidate review
- founder promotion review
- interpreter summary persistence
- append-only interpreter history

It does not define:

- warehouse intake
- normalization
- scanner extraction
- founder approval
- staging creation
- promotion execution
- canon mutation

## Purpose

The interpreter converts warehouse candidate reality into structured promotion-review truth.

It answers:

- what the submission most likely represents
- whether a lawful promotion action can be proposed
- whether promotion is blocked
- what evidence is missing
- what canon relationship currently exists

## Inputs

`WAREHOUSE_INTERPRETER_V1` may read only:

- candidate row
- linked evidence rows
- normalized package when present
- classification package when present
- current canon match state already derivable in repo
- current staging state
- external reference context already attached to the candidate, including `tcgplayer_id`

It must not invent new inputs outside current repo reality.

## Outputs

The interpreter produces one structured package per reviewed candidate.

The package shape is:

```ts
type WarehouseInterpreterDecision =
  | "NEW_CANONICAL_REQUIRED"
  | "NEW_CHILD_PRINTING_REQUIRED"
  | "IMAGE_REPAIR_ONLY"
  | "DUPLICATE_EXISTING"
  | "HOLD_FOR_REVIEW"
  | "UNRESOLVED";

type WarehouseInterpreterReasonCode =
  | "NO_EXISTING_CANON_MATCH"
  | "PRINTED_IDENTITY_DELTA_DETECTED"
  | "CANONICAL_MATCH_WITH_NEW_CHILD_PRINTING"
  | "CANONICAL_MATCH_IMAGE_MISSING_OR_WEAK"
  | "EXISTING_CANON_ALREADY_COVERS_SUBMISSION"
  | "NO_CLASSIFICATION_DECISION"
  | "MISSING_CANON_MATCH_CONTEXT"
  | "MISSING_IDENTITY_DELTA"
  | "MISSING_REQUIRED_EVIDENCE"
  | "INSUFFICIENT_IMAGE_EVIDENCE"
  | "AMBIGUOUS_TARGET"
  | "MISSING_EXTERNAL_REFERENCE"
  | "NO_LAWFUL_PROMOTION_ACTION"
  | "OTHER";

type WarehouseInterpreterPackage = {
  version: "V1";
  status: "READY" | "BLOCKED";
  decision: WarehouseInterpreterDecision;
  reason_code: WarehouseInterpreterReasonCode;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  founder_explanation: string;
  canon_context: {
    matched_card_print_id: string | null;
    matched_card_printing_id: string | null;
    canonical_set_code: string | null;
    number: string | null;
    variant_key: string | null;
    finish_key: string | null;
  };
  proposed_action:
    | "CREATE_CARD_PRINT"
    | "CREATE_CARD_PRINTING"
    | "ENRICH_CANON_IMAGE"
    | "NO_OP"
    | null;
  missing_fields: string[];
  evidence_gaps: string[];
  next_actions: string[];
  raw_reason_code?: string | null;
};
```

This package is full founder-review truth.

## Hard Rules

The interpreter is advisory but deterministic.

The interpreter:

- cannot mutate canon
- cannot approve promotion
- cannot stage promotion
- cannot fabricate a lawful action
- cannot hide ambiguity

When the system does not have enough grounded evidence, the interpreter must remain blocked and explicit.

## Allowed Action Mapping

The interpreter may propose only existing lawful promotion boundaries:

- `CREATE_CARD_PRINT`
- `CREATE_CARD_PRINTING`
- `ENRICH_CANON_IMAGE`
- `NO_OP`
- `null`

`NO_OP` is lawful only when current canon already fully covers the staged or reviewable submission.

`null` is required when no lawful promotion action currently exists.

## Persistence Model

`canon_warehouse_candidates` remains the compact founder-review summary surface.

The candidate row may store only the bounded summary fields already supported by schema:

- `interpreter_decision`
- `interpreter_reason_code`
- `interpreter_explanation`
- `interpreter_resolved_finish_key`
- `needs_promotion_review`
- `proposed_action_type`
- `current_review_hold_reason`

The full interpreter package lives in append-only warehouse event metadata.

Candidate row = compact summary truth.

Event metadata = append-only detailed interpreter history.

## Result

`WAREHOUSE_INTERPRETER_V1` is the lawful deterministic layer between warehouse candidate reality and founder promotion review.

It gives the founder one explicit review package before approval and staging, while preserving current warehouse boundaries and existing executor action rules.
