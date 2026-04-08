# FILE_PICKER_DEPENDENCY_REPAIR_V1

## Objective
Repair missing Flutter dependency drift blocking simulator build.

## Files Changed
- `pubspec.yaml`
- `pubspec.lock`
- `lib/screens/account/import_collection_screen.dart` (not changed; no cleanup required)

## Root Cause
`import_collection_screen.dart` imported `package:file_picker/file_picker.dart` but the package was not declared in the dependency set.

## Verification
- `flutter pub get`: pass
- `flutter analyze --no-fatal-infos lib/screens/account/import_collection_screen.dart`: pass
- `flutter run -d "iPhone 17 Pro"`: pass
- next blocker if any: none in this verification run; app launched on the simulator

## Notes
- Added dependency: `file_picker: ^8.0.0`
- Resolver selected: `file_picker 8.3.7`
- No scanner or backend files were touched for this repair.
