# Incident: eBay Browse Budget V1 Failure

## Date
2026-03-19

## Severity
High (blocked pricing pipeline)

## Summary
The pricing worker failed due to a broken RPC contract and ambiguous SQL function body in the eBay Browse Budget system. This caused runtime failures, schema cache mismatches, and prevented pricing jobs from executing.

## Symptoms
- Repeated worker failures with:
  - "column reference 'provider' is ambiguous"
  - "function not found in schema cache"
- Pricing jobs stuck or retrying
- Budget snapshot RPC failing continuously

## Root Cause

### 1. Contract Drift
Migration `20260319120000` changed the function signature:
- Broke expected RPC contract used by JS
- Caused PostgREST schema cache mismatch

### 2. SQL Ambiguity
Functions used:

ON CONFLICT (provider, usage_date)

Inside RETURNS TABLE functions that also defined:
- provider
- usage_date

This caused runtime error:
42702 column reference "provider" is ambiguous

### 3. Migration Illusion
- `supabase db push` reported "up to date"
- But latest migration contained broken function body
- Result: system appeared correct but failed at runtime

## Impact
- Pricing worker unable to execute jobs
- Budget system non-functional
- Continuous retry loops
- eBay API usage not properly controlled

## Resolution

### Step 1: Contract Repair
Reintroduced correct RPC signatures:
- get_ebay_browse_daily_budget_snapshot_v1(text, integer)
- consume_ebay_browse_daily_budget_v1(text, integer, integer)

### Step 2: Ambiguity Fix
Replaced:

ON CONFLICT (provider, usage_date)

With:

ON CONFLICT ON CONSTRAINT ebay_browse_daily_budget_v1_pkey

### Step 3: Forward-Only Migration
Created:
- 20260319130000_fix_ebay_browse_budget_v1_conflict_ambiguity.sql

### Step 4: Verification
- RPC calls returned valid data
- No 42702 errors
- No schema cache errors
- Budget consumption confirmed working

### Step 5: VPS Sync
- Pulled latest repo
- Restarted PM2 worker
- Cleared stale environment overrides

## Final State
- Budget system operational
- RPC contract stable
- Worker running correctly
- Rate limiting handled via retry logic (exit code 42)

## Lessons Learned

- Migration success does not guarantee runtime correctness
- RETURNS TABLE introduces variable scope risks in SQL
- Function signatures must remain aligned with RPC callers
- Always validate via live RPC, not just migration status

## Follow-ups

- Add monitoring for RPC failures
- Consider adding test RPC calls in CI
- Expand Founder dashboard observability
- Track eBay rate limit behavior more explicitly
