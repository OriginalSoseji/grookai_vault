# Native Anniversary Release

Date: 2026-09-16. Founder directed continuation from the completed anniversary
sealed publication to native cover delivery and TestFlight.

## Source And Scope

- Base main: `348d8ec30528be56f5c12e2a8fd4fe98a7b83bf0`.
- Original native fix: `bd561329c8a9789beee54d00dfd651432e17d0ec`.
- Imported only `public_sets_service.dart` and its three cover-priority tests.
- Verified canonical covers precede legacy hosted logos. Noncanonical sources
  retain hosted-logo-first behavior, including rejection of lookalike paths.
- Original Samsung build 321, source branch, APK and test evidence stay intact.
- No canonical, pricing, Storage, Vault, visibility or background-worker writes.
- No new tester accounts/groups/public links or public App Store submission.

## Release Procedure

1. Run the managed source gates on this current-main integration and freeze it.
2. Verify the Apple build inventory; reserve a new build number without reusing
   an existing upload. Record the prior build's actual tester-group membership.
3. Inspect and preserve Mac source state and available space. Create a separate
   worktree at the tested producer. Reuse the existing release environment;
   compare generated defines without exposing secrets. Pokemon sealed, MTG
   sealed and shared ownership must remain enabled.
4. Run Mac-native tests, archive, verify bundle/version/signature and exact
   Runner/App dSYM UUIDs. Verify same-source simulator startup independently.
5. Upload once, reconcile Apple processing to VALID, and preserve the existing
   audience. Record any external-beta review state accurately; internal
   availability is not proof all testers received or installed the update.
6. Preserve source/archive/IPA/readback hashes and the completion checkpoint.

## Access And Evidence

Mac account `cesarcabral`, existing SSH key `grookai_mac_remote_ed25519`.
September 16 discovery found LAN `192.168.86.22` using `tailscale ping`;
`HostKeyAlias=100.118.59.67` validated the existing host identity. The direct
Tailscale SSH route failed; desktop helper reported missing native pipe even
after reset. The working LAN route supersedes the earlier delivery blocker.
macOS is 26.5.2, with approximately 63 GiB free at preflight.

The primary checkout is detached at `e0fbe0378f82fa7676ea6c232868342d513f06b8`
with unrelated untracked streaming material. Do not move, delete or reset it.

Latest receipts belong outside the public repo:
`C:/grookai_vault_operator_artifacts/pokemon_30th_20260916/native-release-322/`.
The parent `COMPLETION_CHECKLIST.md` remains the cross-task resume point.
This checked-in document is preparation, not a claim of upload or delivery.
