# Run diagnostics locally (Windows PowerShell)

Run from repo root: `C:\grookai_vault`

```powershell
mkdir -Force scripts\diagnostics\output | Out-Null
git log --since="$(Get-Date -Date '2025-11-02T00:00:00-07:00').ToUniversalTime().ToString('o')" --pretty=format:"%h %ad %an %s" --date=iso > scripts\diagnostics\output\git_commits_today.txt
git diff --name-status --since="$(Get-Date -Date '2025-11-02T00:00:00-07:00').ToUniversalTime().ToString('o')" > scripts\diagnostics\output\git_changes_today.txt

flutter --version > scripts\diagnostics\output\flutter_version.txt 2>&1
flutter analyze > scripts\diagnostics\output\flutter_analyze.txt 2>&1
dart pub outdated > scripts\diagnostics\output\dart_outdated.txt 2>&1
dart fix --dry-run > scripts\diagnostics\output\dart_fix_dry_run.txt 2>&1

flutter build apk --debug > scripts\diagnostics\output\android_build_debug.txt 2>&1

supabase db lint > scripts\diagnostics\output\supabase_db_lint.txt 2>&1
supabase db diff > scripts\diagnostics\output\supabase_db_diff.txt 2>&1

pwsh -File scripts\tools\scan_schema_compat.ps1 -Verbose *> scripts\diagnostics\output\scan_schema_compat_verbose.txt
pwsh -File scripts\diagnostics\compute_missing_cards.ps1 -Verbose *> scripts\diagnostics\output\compute_missing_cards_verbose.txt
```

