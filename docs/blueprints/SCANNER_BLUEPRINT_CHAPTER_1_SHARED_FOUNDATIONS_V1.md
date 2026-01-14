# Chapter 1 — Shared Foundations (V1)

**Status:** LOCKED (inherits Blueprint V1 lock)  
**Backlink:** [Book Index](./SCANNER_BLUEPRINT_BOOK_INDEX_V1.md)

This chapter defines shared contracts used by both scanners. No scanner-specific logic is allowed here.

---

## 1.1 SCAN_CAPTURE_REVIEW_UI_CONTRACT_V1

### Purpose

Define a single Capture → Review pipeline used by both scanners.

### In Scope

* Slot capture (camera/gallery)
* Required gating (front/back)
* Review UI (thumbnails, retake)
* Mode branching only at commit boundary

### Out of Scope

* Storage uploads, snapshot inserts, analysis triggers, identification matching

### Inputs

* `ScannerMode`: `conditionAssist` | `identifyOnly`
* Slots: required `front`, `back`; optional corners

### Invariants

* Front + back required to proceed
* No persistence before commit boundary
* Review screen is the only divergence point

### Commit Boundary Actions

* Condition: “Save scan & analyze condition”
* Identify-only: “Identify card (no save)”

### Proof Plan

* Capture → cancel → no writes
* Identify action → no snapshots
* Condition action → Write Gate required

### Completion Gate

* Shared Capture+Review exists and is mode-agnostic

---

## 1.2 IMAGE_NORMALIZATION_CONTRACT_V1

### Purpose

Produce deterministic normalized bytes for downstream pipelines.

### Rules

* Input: JPG/PNG
* Output: JPG
* Orientation normalized
* Deterministic resize (fixed max-edge)
* No cropping in V1

### Identify-only Guarantee

* No disk/storage/DB writes

### Completion Gate

* Pure/deterministic normalization

---

## 1.3 SCAN_OUTCOME_SHAPE_CONTRACT_V1

### Purpose

Single internal outcome shape for UI.

### Invariants

* Identity confidence ≠ condition confidence
* No mixed semantics

### Completion Gate

* Results UI renders from one canonical shape

---

## 1.4 WRITE_GATE_CONTRACT_V1

### Purpose

Prevent accidental persistence.

### Rules

* Any write requires explicit Write Gate token
* Identify-only cannot create token

### Completion Gate

* No accidental writes possible
