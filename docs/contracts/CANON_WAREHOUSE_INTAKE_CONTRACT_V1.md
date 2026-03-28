# CANON_WAREHOUSE_INTAKE_CONTRACT_V1

## Status

ACTIVE

## Purpose

This contract defines the intake boundary for canon warehouse submissions.

It governs what a valid submission must contain before it may enter the canon warehouse pipeline.

This contract exists to prevent low-context, low-quality, or authority-confusing submissions from entering the warehouse.

---

## Core Principle

A canon warehouse submission must contain:

* evidence
* human context
* optional reference hints

A submission is never canonical truth.

It is an evidence package entering the warehouse for later processing and review.

---

## Submission Rule

A valid canon warehouse submission must include enough information to support downstream classification and review.

At minimum, every submission must include:

* uploaded evidence
* uploader identity
* required notes

Optional reference fields may be attached, but they do not define identity.

---

## Required Submission Fields

The following are required:

* `submitted_by_user_id`
* at least one evidence pointer (image / scan / evidence path)
* `notes`

### Notes Rule

`notes` are mandatory.

Notes must capture the submitter's explanation of what is being submitted.

Examples:

* why they believe the card is missing
* what finish/version they believe it is
* why the image is important
* what anomaly or distinction they observed

A submission without notes is invalid intake.

---

## Optional Reference Fields

The following may be accepted as optional reference hints:

* `tcgplayer_id`
* future marketplace/source IDs
* optional claimed card identifiers

These fields are reference-only.

They may assist:

* lookup
* candidate discovery
* pricing alignment
* review context

They must never:

* define canonical identity
* bypass interpreter
* force promotion
* create direct canon writes

---

## TCGPlayer Reference Rule

`tcgplayer_id` is an optional non-authoritative reference hint.

It may be stored with the submission and used later for:

* lookup assistance
* JustTCG / pricing alignment
* reviewer context

It must not:

* define row vs child
* define canonical existence
* define image truth
* bypass approval

---

## Evidence Rule

Evidence submitted into the canon warehouse is evidence only.

Examples may include:

* front image
* back image
* scan evidence
* upload metadata
* supporting notes

Evidence must remain non-canonical until:

* processed
* classified
* reviewed
* explicitly approved for promotion

---

## Intake Validation Rule

A submission must fail intake if any of the following are missing:

* uploader identity
* evidence
* notes

A submission may still be accepted without:

* `tcgplayer_id`
* claimed identity
* external source IDs

These are optional enrichment fields only.

---

## Auto-Processing Boundary

After intake, the system may automatically:

* normalize inputs
* extract metadata
* classify the submission
* queue it for review

The system must not auto-promote it.

This contract is intake-only and remains subordinate to:

* `CANON_WAREHOUSE_CONTRACT_V1.md`
* `CANON_WAREHOUSE_APPROVAL_PIPELINE_CONTRACT_V1.md`

---

## Canon Safety Rule

Nothing accepted through intake becomes truth because it was:

* submitted
* richly described
* linked to `tcgplayer_id`
* given high confidence later

Truth remains gated by:

* interpreter
* approval
* promotion

---

## Attribution Rule

Every valid submission must preserve:

* who submitted it
* what notes they supplied
* what optional references they supplied

This metadata must survive downstream review and promotion for contributor credit and auditability.

---

## Relationship To Existing Contracts

This contract is subordinate to:

* `CANON_WAREHOUSE_CONTRACT_V1.md`
* `CANON_WAREHOUSE_APPROVAL_PIPELINE_CONTRACT_V1.md`

It works alongside:

* `REFERENCE_BACKED_IDENTITY_CONTRACT_V1.md`
* `VERSION_VS_FINISH_CONTRACT_V1.md`

It governs intake only.
It does not define interpretation, approval, or promotion.

---

## Invariants

1. Every canon warehouse submission requires notes.
2. Every canon warehouse submission requires evidence.
3. Every canon warehouse submission requires uploader identity.
4. `tcgplayer_id` is optional.
5. `tcgplayer_id` is reference-only.
6. Intake never creates canonical truth.
7. Intake never bypasses interpreter.
8. Intake never bypasses approval.
9. Submission metadata must remain auditable and attributable.

---

## Result

This contract defines a high-quality intake boundary for the canon warehouse.

It ensures the warehouse receives:

* evidence-rich submissions
* reviewer-useful context
* optional reference hints

without weakening canonical authority.
