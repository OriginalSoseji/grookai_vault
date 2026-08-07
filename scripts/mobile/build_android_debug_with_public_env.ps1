param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")),
    [string]$EnvFile = ".env.local"
)

$ErrorActionPreference = "Stop"

function Read-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $prefix = "$Name="
    $line = Get-Content -LiteralPath $Path | Where-Object {
        $_.TrimStart().StartsWith($prefix, [System.StringComparison]::Ordinal)
    } | Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace($line)) {
        throw "Missing required public mobile setting: $Name"
    }

    $value = $line.Substring($line.IndexOf("=") + 1).Trim().Trim('"').Trim("'")
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Required public mobile setting is empty: $Name"
    }
    return $value
}

$resolvedRepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$resolvedEnvFile = if ([System.IO.Path]::IsPathRooted($EnvFile)) {
    $EnvFile
} else {
    Join-Path $resolvedRepoRoot $EnvFile
}

if (-not (Test-Path -LiteralPath $resolvedEnvFile)) {
    throw "Mobile environment file not found: $resolvedEnvFile"
}

$publicDefines = [ordered]@{
    SUPABASE_URL = Read-DotEnvValue -Path $resolvedEnvFile -Name "SUPABASE_URL"
    SUPABASE_PUBLISHABLE_KEY = Read-DotEnvValue -Path $resolvedEnvFile -Name "SUPABASE_PUBLISHABLE_KEY"
    COLLECTOR_MEMORIES_ENABLED = "true"
}

$defineFile = Join-Path ([System.IO.Path]::GetTempPath()) (
    "grookai-mobile-public-defines-{0}.json" -f [guid]::NewGuid().ToString("N")
)

try {
    $publicDefines | ConvertTo-Json | Set-Content -LiteralPath $defineFile -Encoding utf8
    Push-Location $resolvedRepoRoot
    try {
        & flutter build apk --debug "--dart-define-from-file=$defineFile"
        if ($LASTEXITCODE -ne 0) {
            throw "Flutter Android debug build failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }
} finally {
    Remove-Item -LiteralPath $defineFile -Force -ErrorAction SilentlyContinue
}

Write-Host "Android debug APK built with public mobile configuration only."
