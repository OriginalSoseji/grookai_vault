# Apply production flags to Supabase Edge functions

Usage:

```
pwsh .\tools\deploy\apply_flags.ps1 -ProjectRef ycdxbpibncqcchqiihfz `
     -ConfigPath .\configs\production_flags.json `
     -Functions scan_resolve,aggregate_scan_metrics
```

Notes:
- The script prints keys only, not values.
- Requires Supabase CLI logged in and with access to the project.
- Adjust functions list as needed.

