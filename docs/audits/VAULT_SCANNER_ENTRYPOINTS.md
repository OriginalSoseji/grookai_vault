## Vault Scanner Entry Points (commit d94606a6a9c9cd47a7d2f7b2bb85fc302f0efcac)

Working tree: dirty (untracked `docs/audits/UI_AUDIT_REPORT_V1.md` only).

### Findings
- **No scanner launch found in Vault UI.**
  - Vault list items only navigate to `CardDetailScreen` on tap (`lib/main.dart:1468-1494`); no buttons or menu items mention Scan/Condition/Fingerprint.
  - No `Navigator` pushes to `ScanCaptureScreen`, `ConditionCameraScreen`, `QuadAdjustScreen`, or `ScanIdentifyScreen` exist outside the scanner files themselves.
  - CardDetailScreen contains no Scan/Condition/Fingerprint actions (only pricing/vault placeholders).

### Evidence
- Vault item tap handler → `CardDetailScreen`:
  - Path: `lib/main.dart:1468-1494`
  - Label: vault list tile tap
  - Pushes: `CardDetailScreen` via `MaterialPageRoute`
  - Params: `cardPrintId`, `name`, `setName`, `number`, `imageUrl`, `quantity`, `condition`
- All `Navigator.of(context).push` in app code:
  - `lib/main.dart:1155-1157` Catalog search item → `CardDetailScreen`
  - `lib/main.dart:1214-1216` Catalog trending item → `CardDetailScreen`
  - `lib/main.dart:1485-1489` Vault item → `CardDetailScreen`
  - Scanner internals only (camera/quad adjust) in `lib/screens/scanner/scan_capture_screen.dart:57-58, 611-613`
- Scanner classes present but **never referenced by Vault or CardDetailScreen**:
  - Definitions only: `ScanCaptureScreen` (`lib/screens/scanner/scan_capture_screen.dart`), `ConditionCameraScreen` (`lib/screens/scanner/condition_camera_screen.dart`), `QuadAdjustScreen` (`lib/screens/scanner/quad_adjust_screen.dart`), `ScanIdentifyScreen` (`lib/screens/scanner/scan_identify_screen.dart`).
  - `rg` patterns: no hits for `Scan(` in `lib/`; `rg -n "Condition"` and `"fingerprint"` show only model/label usage, not navigation.

### Conclusion
There are **zero UI entry points in Vault (or elsewhere) that launch the scanner** in this commit. All scanner screens are unreachable without manual routing.
