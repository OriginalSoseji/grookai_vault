# IOS_SIMULATOR_BUILD_FAILURE_AUDIT_V1

## Objective
Diagnose the exact reason the real repo fails to launch on the iPhone simulator.

## Repo Context
- path: `/Users/cesarcabral/grookai_vault`
- git dirty state summary:
  - modified iOS wrapper files: `ios/Podfile`, `ios/Podfile.lock`, `ios/Runner.xcodeproj/project.pbxproj`, `ios/Runner/Info.plist`
  - modified generated file: `macos/Flutter/GeneratedPluginRegistrant.swift`
  - modified Flutter dependency files: `pubspec.yaml`, `pubspec.lock`
  - untracked scanner UI files and assets also present
  - full capture: `temp/build_failure_repo_context.txt`

## Build Command
- `flutter run -d "iPhone 17 Pro" -v`

## Primary Failure
- exact first meaningful error:
  - `lib/screens/account/import_collection_screen.dart:3:8: Error when reading 'package:file_picker/file_picker.dart': No such file or directory`
  - `lib/screens/account/import_collection_screen.dart:39:28: Error: The getter 'FilePicker' isn't defined for the type '_ImportCollectionScreenState'.`
  - `lib/screens/account/import_collection_screen.dart:40:15: Error: The getter 'FileType' isn't defined for the type '_ImportCollectionScreenState'.`
- file/tool reporting it:
  - Dart frontend / kernel snapshot during Flutter build
- layer:
  - Flutter

## Supporting Evidence
- log file:
  - `temp/flutter_ios_simulator_build_verbose.log`
- error index:
  - `temp/flutter_ios_simulator_build_error_index.txt`
- tight failure window:
  - `temp/flutter_ios_simulator_build_error_window.txt`
- tail file:
  - `temp/flutter_ios_simulator_build_tail.txt`
- related config files inspected:
  - `temp/build_failure_pubspec.txt`
  - `temp/build_failure_pubspec_lock_part1.txt`
  - `temp/build_failure_dependency_focus.txt`
  - `temp/build_failure_file_picker_refs.txt`
  - `temp/build_failure_import_collection_screen_part1.txt`
  - `temp/build_failure_account_routes.txt`
  - `temp/build_failure_Podfile.txt`
  - `temp/build_failure_Info_plist.txt`
  - `temp/build_failure_project_pbxproj_part1.txt`
  - `temp/build_failure_project_pbxproj_part2.txt`
  - `temp/build_failure_ios_generated_registrant.txt`
  - `temp/build_failure_macos_generated_registrant.txt`

## Classification
- ROOT CAUSE:
  - dependency/package drift in Flutter source:
    - `lib/screens/account/import_collection_screen.dart` imports `package:file_picker/file_picker.dart`
    - `pubspec.yaml` does not declare `file_picker`
    - `pubspec.lock` does not contain `file_picker`
  - this causes Dart kernel snapshot to fail before the iOS app can finish packaging
- SECONDARY NOISE:
  - `Could not build the application for the simulator`
  - `Failed to package ...`
  - Xcode phase script failure
  - these are downstream from the Dart compile failure
- affected files:
  1. `lib/screens/account/import_collection_screen.dart`
  2. `pubspec.yaml`
  3. `pubspec.lock`

## iOS Wrapper Assessment
- `ios/Runner/Info.plist` includes the expected camera and photo privacy strings
- `ios/Runner.xcodeproj/project.pbxproj` uses `com.cesar.grookaivault` for the app target
- `ios/Runner/GeneratedPluginRegistrant.m` does not include `file_picker`, which is consistent with `file_picker` being absent from `pubspec`
- conclusion:
  - the first blocking simulator failure is not caused by the iOS wrapper
  - the failure occurs earlier at Dart dependency resolution / kernel snapshot

## Minimum Fix Target
1. `pubspec.yaml`
2. `pubspec.lock`
3. `lib/screens/account/import_collection_screen.dart` only if the dependency is intentionally not supposed to exist

## Non-Targets
- `backend/**`
- scanner backend files
- scanner UI files
- `ios/Runner/Info.plist`
- `ios/Runner.xcodeproj/project.pbxproj`
- CocoaPods regeneration as a first move
- signing / simulator target settings

## Notes
- `AccountScreen` is imported by `lib/main.dart`, so this missing package breaks the app build even if the user never opens the import flow.
- No evidence from this run suggests the primary blocker is:
  - signing/config
  - simulator destination selection
  - CocoaPods native compile mismatch
  - generated iOS registrant drift
