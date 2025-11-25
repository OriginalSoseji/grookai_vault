$ErrorActionPreference = 'Stop'

$requiredKeys = @(
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'BRIDGE_IMPORT_TOKEN'
)

$missing = @()

foreach ($key in $requiredKeys) {
    $value = [Environment]::GetEnvironmentVariable($key, 'Process')
    if ([string]::IsNullOrEmpty($value)) {
        Write-Host "$key = [MISSING]"
        $missing += $key
    } else {
        $masked =
            if ($value.Length -ge 4) {
                ('*' * ($value.Length - 4)) + $value.Substring($value.Length - 4)
            } else {
                ('*' * $value.Length)
            }
        Write-Host "$key = $masked"
    }
}

if ($missing.Count -gt 0) {
    Write-Host ''
    Write-Host 'Some secrets are missing. Please sync:'
    Write-Host '  - .env.local'
    Write-Host '  - Supabase → Settings → Secrets'
    Write-Host '  - GitHub Actions secrets'
} else {
    Write-Host ''
    Write-Host 'All required secrets are present in this shell.'
}
