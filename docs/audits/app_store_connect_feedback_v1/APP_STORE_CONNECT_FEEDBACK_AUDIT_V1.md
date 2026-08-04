# App Store Connect Feedback Audit V1

Date: 2026-08-04

Code commit: `77760caf4c2f71c352ac19a65d234752362b2662`

Branch: `fix/testflight-public-relationship-readback`

## Purpose

This audit reconciles the 42 App Store Connect screenshot reports reviewed in
this release pass with repository changes, production database proof, Samsung
runtime proof, and the remaining deployment or physical-device gates.

The 42 screenshots are source reports, not 42 independent defects. Repeated
screens and multiple screenshots from the same flow are grouped by trust
boundary below. The App Store Connect source reports remain the immutable
original evidence.

## Release Truth

- TestFlight Build 280 remains the most recent external beta build observed in
  three testing groups.
- Build 281 was canceled.
- Xcode Cloud is deactivated to prevent additional build cost. This audit did
  not reactivate or trigger it.
- Commit `77760caf4` is newer than Build 280. Its exact-printing catalog repair
  is proven on Samsung but is not yet deployed to TestFlight.
- No Vercel deployment was triggered in this pass. The Apple universal-link
  response fix remains a controlled web deployment gate.
- App Store Connect exposed no crash reports during the reviewed interval.

## Report Reconciliation

| Report cluster | Finding | Current disposition |
| --- | --- | --- |
| Startup, white screen, or missing configuration | Release configuration is required and the app fails closed when absent. A configured Samsung build starts normally. | Code boundary proven; future TestFlight archives must use governed public mobile configuration. |
| Wall or card-stream load failures | Earlier runtime/backend repairs restored the signed-in shell. Current Samsung startup reaches Pulse without a startup error. | Repaired; retain physical regression coverage. |
| Binders absent or unable to load | Binder release defaults and runtime route repairs are present in the current branch history. | Code repaired; final iPhone regression remains required. |
| Follower counts and follower list mismatch | Public relationship reads used an incomplete boundary and follower copy was singularized incorrectly. | Production-proven: 1 follower, 4 following, and Poke Javi appears in the follower list. |
| Messages and contact targets | Contact/read policy alignment was repaired earlier in branch history. | Code repaired; one signed-in message route smoke remains useful before broad release. |
| Card identity or variant ambiguity | Search quick-add could omit `card_printing_id`; catalog cards did not consistently display their selectable finish. | Production and Samsung proven for Cosmic Eclipse #215. Ambiguous and unavailable printings now fail closed. |
| Images missing, slow, or using the wrong representation | Hosted-first and immutable image paths exist, with earlier runtime image recovery in branch history. | Improved but not globally closed; uploaded-copy-image and image-load performance remain monitored gates. |
| Share and deep-link behavior | Canonical share routes exist. Apple association content is now served by repository code as JSON. | Web deployment and physical iPhone universal-link proof remain. Price Lot share remains a physical smoke. |
| Scanner and camera behavior | Scanner fixture and hosted-artwork contracts pass in automated tests. | Physical scanner fixture remains a release smoke. |
| Crash reporting and missing dSYM | Build 279 symbols were missing. The iOS archive phase now uploads Crashlytics symbols and Build 280 archive evidence repaired the missing-symbol path. | Repaired in code/archive flow; verify on the next TestFlight archive. |

## Production Printing Truth Repair

Migration `20260804210000_public_card_printing_options_truth_boundary_v1.sql`
is applied in production.

The migration keeps canonical printing rows intact and adds a governed public
selection boundary. A conflicting sidecar can hide an unresolved child from
selection without deleting or rewriting canonical identity.

Production proof card:

- Parent card print ID: `02e11652-ab5a-466b-858b-8e7b8fb322b0`
- Parent GVID: `GV-PK-CEC-215`
- Card: Blastoise & Piplup-GX, Cosmic Eclipse #215
- Holo child ID: `ef48f5c4-c5db-47ec-8c86-0b2bfab02a35`
- Holo child GVID: `GV-PK-CEC-215-HOLO`
- Normal child ID: `467efb22-34ee-4122-a783-e45ff5798ee7`
- Normal child GVID: `GV-PK-CEC-215-STD`

The Normal child remains canonical but has an active conflict sidecar with
`public_visibility=hidden_pending_review` and expected finish `holo`.
Service-role, anonymous, and authenticated calls to
`get_public_card_printing_options_v1` each returned only the Holo child.

## Samsung Runtime Proof

Device:

- Serial: `R5CT3291F6E`
- Model: Samsung SM-S908U
- USB stay-awake mask: `15`
- Screen timeout: `2147483647`

Observed behavior from the configured build produced by commit `77760caf4`:

1. Search result subtitle shows `Cosmic Eclipse • #215 • Holo`.
2. The card action sheet shows a selected `Holo` printing.
3. A one-option quick add passes the Holo child ID to the vault write.
4. Multiple options require explicit choice.
5. A missing or failed printing lookup disables the add action instead of
   creating an unassigned copy.

The proof screenshots are preserved under `evidence/`.

- `evidence/samsung_search_exact_holo.jpg`
- `evidence/samsung_action_sheet_exact_holo.jpg`
- `evidence/samsung_exact_holo_copy_created.jpg`
- `evidence/samsung_wall_follower_repair.jpg`
- `evidence/samsung_follower_list_repair.jpg`

## Controlled Write And Cleanup Proof

Three diagnostic copies were created during the physical smoke. No existing
copy was altered.

| GVVI | Printing ID | Result |
| --- | --- | --- |
| `GVVI-065CAB28-001326` | `null` | Earlier diagnostic; archived at `2026-08-04T03:17:06.377929-06:00`. |
| `GVVI-065CAB28-001327` | `null` | Earlier diagnostic; archived at `2026-08-04T03:23:47.207784-06:00`. |
| `GVVI-065CAB28-001328` | `ef48f5c4-c5db-47ec-8c86-0b2bfab02a35` | Exact Holo proof; archived at `2026-08-04T03:38:26.508172-06:00`. |

The final Holo row read back with the correct parent card print ID, exact Holo
child ID, and `archived_at=null` before removal. After the in-app removal, the
same row retained the Holo child ID and had a non-null archive timestamp.

## Automated Verification

The final staged tree and commit hook both passed `npm run shipcheck`:

- release secret packaging guard: pass
- production runtime preflight: pass with only registered deferred debt
- Node contract suite: pass
- runtime health, quarantine, and deferred reports: pass
- web typecheck: pass
- web lint: pass
- strict web build: pass
- Flutter analyze: pass
- Flutter tests: 563/563 pass
- `git diff --check`: pass

The first full run exposed one relevant stale quick-add contract. That test was
updated to require direct add only when exactly one governed printing exists.
Two subsequent full shipchecks passed.

## Invariants

- A parent card is not an exact printing.
- Search, detail, vault writes, pricing, and ownership must preserve the same
  `card_printing_id` when one is selected.
- Multiple printings require explicit collector choice.
- Missing governed printing evidence fails closed.
- A conflict sidecar can control public selection without deleting canonical
  printing rows.
- Diagnostic copies must be archived after proof.
- App Store Connect screenshots are evidence, not release completion.
- Samsung debug proof does not imply TestFlight deployment.

## Remaining Gates

1. Push the branch and pass GitHub CI from the audit-producing commits.
2. Merge through the normal release path; do not deploy from an unreviewed
   working tree.
3. Perform one controlled web deployment for the Apple association response,
   then verify `application/json` and a physical iPhone universal link.
4. Build a new iOS archive on the Mac from the merged SHA with governed mobile
   configuration and Crashlytics dSYM upload enabled.
5. Publish one replacement TestFlight build without reactivating Xcode Cloud.
6. On the physical iPhone, smoke startup, Wall, Binders, Messages, search
   variant display, exact-printing add, Poke Javi follower navigation, Price Lot
   share, uploaded-copy image, scanner fixture, and universal links.
7. Reconcile any surviving App Store Connect report against that exact build.

No broad release claim is authorized until these gates are complete.
