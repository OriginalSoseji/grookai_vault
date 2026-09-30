# Native P21 printing — September 29

## Reusable layout correction

After confirming the first Eevee label printed correctly, the user requested full
name/set/number, logo, no visible GVVI or price, and maximum readable text size.
Layout v2 now implements this: adaptive full-name text up to 38 dots, full set,
collector number, official emblem, unchanged QR link. No ellipsis or price.
Six focused tests pass; static analysis is clean and the actual Eevee QR preview
decodes to its original link. The final signed Release332 rebuild was installed
in place at 22:36:59 UTC. Probe20 verifies the user's actual Pikachu preview with
full SM Black Star Promos set name and #SM162, reusable-label helper text and P21
discovery. The user was selecting their own card; no duplicate label was sent.
This final layout has not received separate physical-output confirmation yet.
The intermediate fractional QR scaling was rejected by decode checks
and never installed; final QR geometry preserves the verified integer modules.

Windows capacity was recovered through lossless NTFS compression of only the
incomplete dependency folder after policy rejected deletion. The folder remains.
A full-disk failed edit temporarily truncated p21_label.dart; the complete Mac
copy was restored before final changes/tests. Source is intact, and Windows/Mac
SHA256 matches 718c12eb14976679adc2eb276bf8e87996c1adfb5a626920473cfd6b2b33661a.
Final installation proof: label-v2-real-app-receipt.json; UI proof: probe20.log.

User requested direct printing from the installed Grookai iPhone app, using a
Nelko P21 with 14 × 40 mm labels. The Bluetooth diagnostic proved two-way CONFIG
communication via FF00/FF02/FF01; user confirmed the SELFTEST command printed.
The roll status independently reported 14 × 40 mm gapped paper with ready state.

Implementation is isolated on `feature/p21-native-printing-20260929`, based on
main `24f06b725`, advanced to the concurrent qualified native source `7ae5be62c`
to preserve its ownership/Lot changes. Read `docs/contracts/P21_NATIVE_LABEL_PRINTING_V1.md`.
Private diagnostic/device/build receipts live under
`C:/grookai_vault_operator_artifacts/p21_probe_20260929`; the Mac uses the matching
directory under `~/grookai_operator_artifacts`. No product release is claimed.

COMPLETE ON THE USER'S IPHONE: Release332 is installed over the existing app
without uninstall. The actual vendor-card flow discovered P21, confirmed the
14 × 40 mm roll and sent the Eevee label. Probe18 records the connected status,
correct preview and sent message. The user confirmed: "Yes, it printed correctly"
when asked about readable text and a usable QR code. No duplicate was sent.

Six focused tests pass. Full serial suite: 798 passed, one opt-in test skipped.
Preview QR decode, Swift typecheck and signed Release build pass. Source remains
on this isolated branch; no TestFlight upload, merge or public release occurred.
Keep this printer change in subsequent native builds.

Mac capacity is a current build prerequisite. A source-only sparse worktree is
at `~/grookai_p21_printing_20260929`. The attempted full worktree ran out of space
and Git removed its partial checkout; no prior worktree was removed. A bounded
request to remove old regenerable Xcode caches was approved by the user. Fresh
inspection found the two named old intermediates already removed by the concurrent
native release; about 10 GB was free. Its active build uses ModuleCache.noindex,
so this task has not deleted any caches. Preserve existing release sources.

The user explicitly requested testing directly in the real app. The proposed
standalone demo entrypoint was removed before build. Use the normal Release app
and vendor-card flow, preserve installed app data, and avoid conflicting with the
concurrent build331 archive. A prior full suite reached 743 passed but stalled
in an unrelated vendor workspace test; it was stopped. The subsequent complete
serial run passed: 798 tests, one existing opt-in sandbox test skipped. Receipt:
`flutter-full-serial.log` in the private artifact directory.

After the concurrent archive finished, the approved ModuleCache.noindex was
removed with exact-path and idle-process checks. Free space increased from
9.05 GB to 14.75 GB; the private cleanup receipt records the action. No source,
app data or archive was deleted.

The actual app builds successfully as Release332 using lib/main.dart, with
release defines exactly matching build331. The default App Store provisioning
profile cannot be directly installed (0xe800801f); the rejected install receipt
is retained. The same Release source was successfully signed for the paired device
with the existing team and installed as build332, preserving the bundle identifier
and avoiding any uninstall. Normal app launch retains the signed-in account.
Physical app output is user-confirmed above. No TestFlight upload occurred.

Broader repository shipcheck preparation could not finish: Windows ran out of
space during apps/web dependency installation. The user explicitly approved
removing only this task's incomplete apps/web/node_modules folder, but automatic
approval review still rejected native PowerShell cleanup as "blocked by policy".
The folder remains; no commit/shipcheck PASS is claimed. Mac capacity also became
exhausted during later artifact export; existing probe18.xcresult/log are retained.

The existing Mac route and login are documented in the operator playbook. The
logged-in desktop Terminal session can sign Xcode test binaries where direct
SSH signing returns errSecInternalComponent. Do not change keychain security,
replace certificates, or repeat founder setup.
