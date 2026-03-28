# WAREHOUSE_NORMALIZATION_CONTRACT_V1

## Status

ACTIVE

## Type

Boundary Contract

## Scope

This contract governs warehouse normalization for all canon warehouse evidence sources.

It defines the shared normalization boundary that every warehouse candidate must pass through before classification.

It applies to:

- warehouse evidence attachment
- normalization workers
- source-derived metadata extraction
- normalization outputs consumed by classification

It does not define:

- founder approval
- staging
- canon promotion
- scanner UI behavior

## Purpose

Grookai needs one shared normalization contract so different evidence origins do not create parallel interpretation systems.

This contract ensures that all warehouse evidence sources converge into one source-agnostic package before any warehouse classification decision is made.

## Problem Statement

Warehouse evidence may currently or eventually come from multiple origins, including:

- web upload
- mobile web upload
- current online normalization flow
- identity snapshots
- identity scan events
- identity scan event results
- future guided app capture
- future Flutter scanner flows

If each path normalizes differently, classification logic will fragment, drift, and become source-specific.

That would create multiple interpretation systems inside one product, which would weaken auditability, make behavior inconsistent, and increase canon risk.

## Core Principle

All warehouse evidence sources must normalize into one common package before any warehouse classification decision is made.

Normalization is a system boundary, not an optional helper step.

## System Position

This contract sits between:

- warehouse intake / evidence attachment

and

- warehouse classification worker

Normalization does not decide canon truth.

Normalization does not replace classification.

Normalization prepares evidence for interpretation in a shared format.

## Normalization Boundary

Normalization is the process of converting raw source evidence into a shared interpretation-ready package.

That package must be:

- source-agnostic
- append-safe
- non-canonical
- auditable

Normalization may extract, summarize, reorder, and annotate evidence.

Normalization must not silently rewrite history or erase uncertainty.

## Allowed Evidence Sources

At minimum, warehouse normalization must support:

- uploaded front image
- uploaded back image
- `identity_snapshot`
- `condition_snapshot`
- `identity_scan_event`
- `identity_scan_event_results`
- future guided app capture artifacts

Additional future sources may be added if they normalize into the same shared package.

## Normalized Evidence Package

Normalization must produce one conceptual package per warehouse candidate.

That package may include:

- `candidate_id`
- `primary_front_image_ref`
- `secondary_back_image_ref`
- `normalized_image_refs`
- `source_summary`
- `source_strength`
- `visible_identity_hints`
- `printed_number_hint`
- `set_hint`
- `finish_hint`
- `image_quality_summary`
- `evidence_gaps`
- `normalization_confidence`
- `normalization_status`

This package is a contract artifact, not a schema requirement.

The package exists to provide one shared interpretation boundary regardless of source origin.

## Required Fields

Every normalized evidence package must include:

- `candidate_id`
- `normalization_status`
- `source_summary`
- `source_strength`
- `evidence_gaps`
- `normalization_confidence`

These fields are mandatory even when normalization is partial or blocked.

## Optional Fields

A normalized evidence package may also include:

- front image reference
- back image reference
- normalized image references
- visible identity hints
- printed identity hints
- set hint
- finish hint
- image quality details
- source-specific extracted details that can be expressed without changing the shared package model

Optional fields may enrich interpretation readiness.

They must not create source-specific meaning outside the shared package.

## Source Strength Model

Normalization must assign a source strength classification using the following ladder:

- `WEAK`
- `MODERATE`
- `STRONG`

`STRONG` evidence may include guided capture or better normalized evidence that is more reliable than a raw upload.

`WEAK` evidence may still proceed if it contains enough information for downstream review or blocked interpretation.

Source strength influences readiness and confidence.

Source strength does not define canon truth.

Source strength does not create promotion authority.

## Normalization Outcomes

Normalization must produce one of the following statuses:

- `NORMALIZED_READY`
- `NORMALIZED_PARTIAL`
- `NORMALIZATION_BLOCKED`

`NORMALIZED_READY` means the candidate has a usable interpretation package with no blocking normalization gap.

`NORMALIZED_PARTIAL` means the candidate has a usable but incomplete interpretation package and unresolved uncertainty has been recorded.

`NORMALIZATION_BLOCKED` means normalization could not produce a usable interpretation package and the blocking reason must remain visible and auditable.

## Classification Readiness Rule

A warehouse candidate is ready for classification only when a normalized package exists.

`NORMALIZED_READY` may proceed to classification.

`NORMALIZED_PARTIAL` may also proceed when the package is sufficient for interpretation, blocked classification, or later human review.

`NORMALIZATION_BLOCKED` must not silently fail or disappear.

Blocked normalization must remain explicit.

Uncertainty must be recorded, not erased.

### Normalization Precondition

A warehouse candidate must not enter classification without passing through normalization.

Direct transition from `RAW` to `CLASSIFIED` is forbidden.

All classification decisions must operate on a normalized evidence package.

## Worker Rules

The classification worker must:

- consume the normalized package
- treat the normalized package as the only interpretation boundary
- remain agnostic to whether the source came from web, mobile web, scanner events, or future Flutter/native capture
- avoid reimplementing source-specific normalization logic
- avoid treating hints as canon truth

The classification worker must not branch into separate source-owned interpretation systems.

## Forbidden Behaviors

The following are forbidden:

- source-specific classification branches as separate systems
- direct canon inference from a raw upload path
- normalization logic duplicated across scanner or UI paths
- treating stronger source evidence as automatic promotion authority
- using normalization output as canon truth
- allowing one client path to become the implicit owner of warehouse interpretation rules

## Future Compatibility

This contract must support future Flutter and native capture systems without changing warehouse interpretation rules.

Flutter or guided capture may become a stronger evidence producer.

It must not become a different warehouse system.

New clients, capture flows, or scanners may change evidence quality and source strength.

They must not change the shared normalization boundary.

## Result

Warehouse normalization is now a first-class system boundary.

All evidence origins must converge before classification.

This keeps Grookai cohesive as one system instead of scattered pipelines.
