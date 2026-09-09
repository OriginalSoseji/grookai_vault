param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")),
    [string]$EnvFile = ".env.local",
    [switch]$EnableMtgSealed,
    [switch]$EnablePokemonSealed,
    [switch]$EnableSealedOwnership,
    [ValidateSet("debug", "profile", "release")]
    [string]$BuildMode = "debug",
    [ValidateRange(1, 2100000000)]
    [int]$BuildNumber,
    [ValidateSet("", "android-arm", "android-arm64", "android-x64")]
    [string]$TargetPlatform = ""
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
    MTG_SEALED_CLIENT_V1_ENABLED = if ($EnableMtgSealed) { "true" } else { "false" }
    POKEMON_SEALED_CLIENT_V1_ENABLED = if ($EnablePokemonSealed) { "true" } else { "false" }
    SEALED_OWNERSHIP_V1_ENABLED = if ($EnableSealedOwnership) { "true" } else { "false" }
}

$defineFile = Join-Path ([System.IO.Path]::GetTempPath()) (
    "grookai-mobile-public-defines-{0}.json" -f [guid]::NewGuid().ToString("N")
)

try {
    $publicDefines | ConvertTo-Json | Set-Content -LiteralPath $defineFile -Encoding utf8
    Push-Location $resolvedRepoRoot
    try {
        $buildArguments = @("build", "apk", "--$BuildMode", "--dart-define-from-file=$defineFile")
        if ($PSBoundParameters.ContainsKey('BuildNumber')) {
            $buildArguments += "--build-number=$BuildNumber"
        }
        if (-not [string]::IsNullOrWhiteSpace($TargetPlatform)) {
            $buildArguments += @("--target-platform", $TargetPlatform)
        }
        & flutter @buildArguments
        if ($LASTEXITCODE -ne 0) {
            throw "Flutter Android $BuildMode build failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }
} finally {
    Remove-Item -LiteralPath $defineFile -Force -ErrorAction SilentlyContinue
}

Write-Host "Android $BuildMode APK built with public mobile configuration only."
