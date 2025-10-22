@echo off
cd C:\grookai_vault
flutter clean
flutter pub get
flutter analyze
flutter run -d R5CY71V9ETR
echo Open Search -> Scan Card -> test cases per scanner_smoke.md
pause

