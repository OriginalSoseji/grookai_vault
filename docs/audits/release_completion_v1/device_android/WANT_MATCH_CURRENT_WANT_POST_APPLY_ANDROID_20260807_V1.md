# Want Match Current-Want Post-Apply Android Proof V1

## Candidate

- Android package: `com.grookai.vault.lockedacceptance`
- Version code: `284`
- Version name: `1.0.0-locked-acceptance`
- Device: Samsung SM-S908U, Android 16
- Database migration: `20260807043000`
- Source main SHA: `5dfe6288dd449368f2c918cfb411602ef92d53ae`

## Procedure

1. Opened the existing card detail restored by build 284.
2. Returned to Pulse and observed the pre-migration in-memory list still rendered.
3. Force-stopped the application without clearing account or application data.
4. Cold-launched the same installed build and allowed the production Pulse read to complete.
5. Exercised the older-Pulse control after the refreshed empty state.

## Result

`PASS`

The cold production read displayed `Caught up` and neither stale Want Match card appeared. The retained historical Piplup and Blastoise & Piplup-GX events were not returned by the governed Pulse boundary. The older-Pulse control also did not reintroduce either item.

The screen immediately after navigating back is retained as cache-behavior evidence. It is not a post-migration read result; the cold-launch screenshot is the authoritative device readback.

## Artifacts

- `want_match_post_apply_launch.png`
- `want_match_post_apply_after_back.png`
- `want_match_post_apply_cold_launch.png`
- `want_match_post_apply_older_pulse.png`

## Boundary

This proves stale-event suppression on the final-candidate Android read path. It does not complete Journey C, which still requires a new exact Want through generated match, owner context, and card-centered message with database readback.
