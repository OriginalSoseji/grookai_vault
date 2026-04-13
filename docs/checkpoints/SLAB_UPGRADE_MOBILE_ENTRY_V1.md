# SLAB UPGRADE MOBILE ENTRY V1

## Purpose
Surface the existing slab-upgrade capability inside the mobile app for eligible raw cards without rebuilding grading or slab creation logic.

## Capability Audit
- existing web entry:
  - `apps/web/src/app/card/[gv_id]/page.tsx`
  - renders `AddSlabCardAction` beside the canonical card actions
- existing backend/service path:
  - `apps/web/src/components/slabs/AddSlabCardAction.tsx`
  - `apps/web/src/lib/slabs/createSlabInstance.ts`
  - verification API at `apps/web/src/app/api/slabs/verify/psa/route.ts`
  - slab create uses `slab_certs` plus `admin_vault_instance_create_v1`
- existing mobile support:
  - no native mobile slab-create or PSA verification flow found
  - mobile does have authenticated web handoff via `lib/services/navigation/grookai_web_route_service.dart`
- eligible card shape:
  - owned exact copy on a private/mobile owner surface
  - raw copy only
  - active copy only
  - canonical card context resolvable via `gvId`
- missing pieces if any:
  - no dedicated mobile RPC/service wrapper for slab verification + slab-backed instance creation
  - existing supported path is authenticated web handoff to the canonical card page

## Eligibility Rules
- eligible when:
  - the user is on an owned exact-copy surface
  - the copy is not already graded/slabbed
  - the copy is not archived
  - the canonical `gvId` is present so mobile can hand off into the existing web card route
- not eligible when:
  - the copy is already graded/slabbed
  - the copy is archived
  - canonical `gvId` is missing
  - the exact copy row has no `gvviId` / navigable exact-copy context in Manage Card
- fields/services used to decide:
  - `VaultGvviData.isGraded`
  - `VaultGvviData.isArchived`
  - `VaultGvviData.gvId`
  - `VaultManageCardCopy.isGraded`
  - `VaultManageCardCopy.gvviId`
  - `VaultManageCardData.gvId`
- why this is safe:
  - it mirrors existing repo truth
  - it avoids inventing mobile-only slab business rules
  - it only exposes a handoff when the existing web flow can actually receive the card context

## Placement Decision
- primary screen:
  - `lib/screens/vault/vault_gvvi_screen.dart`
- secondary screen if any:
  - `lib/screens/vault/vault_manage_card_screen.dart` in the Copies tab per eligible raw copy row
- why:
  - private GVVI is the strongest exact-copy surface
  - Manage Card already lists exact copies and is the right grouped place to expose the same bridge without making Overview heavier
- UI neighborhood used:
  - private GVVI primary actions cluster
  - Manage Card exact-copy row secondary action area
