# Grookai Vault — Baseline V1 (Authoritative Contract)

**Status:** ACTIVE  
**Effective Date:** 2025-12-13  
**Scope:** Database schema, migrations, replayability, and drift prevention  
**Applies To:** Local, Staging, Production  

---

## 1. Purpose

Baseline V1 defines the **single authoritative starting point** for the Grookai Vault database.

All legacy migrations are abandoned.  
All future migrations are forward-only.

The baseline **must replay cleanly from an empty database**.

---

## 2. Gold Master

- **Gold Master Environment:** Production
- **Baseline Source:** Production schema snapshot
- **Validation Gate:**
```bash
supabase db reset --local


Replay failure = baseline broken.

3. Migration Ordering Contract (MANDATORY)

Extensions

Init (types, tables, sequences only)

Functions (PRE — tables only)

Views

View Comments

Materialized Views

Constraints

Indexes

Triggers

Policies

RLS Enable / Force

Functions (POST — views allowed)

Late Views

Late View Comments

Seed (deterministic only)

Violation is a hard stop.

4. Encoding Rules (NON-NEGOTIABLE)

UTF-8

NO BOM

ASCII headers only

Forbidden:

Emojis

Smart quotes

Em dashes

Approved header:

-- Grookai Vault Baseline - Description

5. Function Placement Rules

PRE functions

Tables only

No views

POST functions

May reference views or materialized views

6. View Dependency Rule

Views depending on other views must be placed in late view migrations.
Comments must run after the view exists.

7. Completion Gate

A change is valid only if:

supabase db reset --local


Completes with zero errors.

8. Institutional Memory

Baseline V1 exists to eliminate:

Migration drift

Implicit ordering

Encoding failures

Hidden dependencies

This work is not to be repeated.

