# NATIVE SLAB UPGRADE FLOW V1

## Purpose
Replace the temporary web handoff with a native in-app slab upgrade flow for eligible raw private copies.

## Existing Capability Audit
- existing backend slab path:
  - `apps/web/src/lib/slabs/createSlabInstance.ts`
  - creates or reuses `slab_certs`
  - inserts a legacy `vault_items` anchor
  - calls `admin_vault_instance_create_v1`
- existing web flow:
  - `apps/web/src/app/card/[gv_id]/page.tsx`
  - `apps/web/src/components/slabs/AddSlabCardAction.tsx`
  - slab submission is exposed only through a Next.js server action on the canonical card page
- existing verification path:
  - `apps/web/src/app/api/slabs/verify/psa/route.ts`
  - `apps/web/src/lib/slabs/psaVerificationAdapter.ts`
  - verification is server-only and depends on PSA server credentials
- existing mobile support:
  - mobile currently only has web handoff via `lib/services/navigation/grookai_web_route_service.dart`
  - no native slab-create service or mobile slab submission wrapper exists
- reusable actions/services:
  - existing exact-copy eligibility data from `VaultGvviData` and `VaultManageCardCopy`
  - existing refresh paths in `VaultGvviScreen` and `VaultManageCardScreen`
  - existing PSA verification HTTP route is reusable for read-only verification calls
- proven gaps:
  - `createSlabInstance.ts` is `"use server"` and not callable from Flutter directly
  - `createSlabInstance.ts` depends on `createServerAdminClient()` with `SUPABASE_SECRET_KEY`
  - `admin_vault_instance_create_v1` is granted to `service_role` only
  - there was no authenticated mobile RPC / edge function / HTTP API that performed slab creation end-to-end before this pass

## Reuse Contract
- path mobile can reuse today:
  - PSA verification via `apps/web/src/app/api/slabs/verify/psa/route.ts`
  - native slab submit via the thin bridge route `apps/web/src/app/api/slabs/upgrade/route.ts`
- required inputs for verification:
  - `cert_number`
- auth requirements:
  - PSA verify route itself does not require signed-in mobile state
  - slab creation requires trusted server credentials through the new authenticated bridge route
- exact-copy identifiers required:
  - canonical `card_print_id`
  - canonical `gvId`
  - signed-in owner context
- if reuse is impossible, exact reason why:
  - direct mobile submit to the original create path was impossible because the only real create path was a Next.js server action backed by service-role Supabase access
  - the safe workaround is a thin authenticated server bridge that reuses `createSlabInstance.ts` and then archives the raw exact copy

## Native Flow Contract
- entry surface:
  - intended: private GVVI and Manage Card copies tab
- screen used:
  - intended: `SlabUpgradeScreen`
- fields shown:
  - grader
  - cert number
  - cert confirmation
  - grade selection
- validation rules:
  - cert number required
  - cert confirmation must match
  - grade must match verified PSA grade
  - no submit while verification/submission is in flight
- submit path:
  - native Flutter form -> `lib/services/vault/slab_upgrade_service.dart`
  - submit to `apps/web/src/app/api/slabs/upgrade/route.ts`
  - route reuses `createSlabInstance.ts`
  - route archives the source raw exact copy via `vault_archive_exact_instance_v1`
- post-success return path:
  - private GVVI replaces the raw GVVI with the returned slab GVVI
  - Manage Card reloads grouped copy state so the new slab appears and the raw copy disappears
