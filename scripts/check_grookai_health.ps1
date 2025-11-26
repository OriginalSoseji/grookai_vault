# Grookai Healthcheck (remote Supabase)
# Checks canonical DB invariants before work begins.

param(
    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Require-Env {
    param([string]$Name)
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Missing required environment variable: $Name"
    }
    return $value
}

function Get-ProjectRef {
    param([string]$SupabaseUrl)
    try {
        $uri = [Uri]$SupabaseUrl
        $hostParts = $uri.Host.Split(".")
        if ($hostParts.Length -lt 3) {
            throw "Unexpected Supabase URL host format: $($uri.Host)"
        }
        return $hostParts[0]
    } catch {
        throw "Failed to parse SUPABASE_URL: $SupabaseUrl. $_"
    }
}

function Get-TableCount {
    param(
        [string]$SupabaseUrl,
        [string]$ApiKey,
        [string]$Table
    )

    $endpoint = "$($SupabaseUrl.TrimEnd('/'))/rest/v1/$Table?select=id&limit=1"
    $headers = @{
        apikey        = $ApiKey
        Authorization = "Bearer $ApiKey"
        Prefer        = "count=exact"
    }

    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method Get -Headers $headers
    } catch {
        throw "Failed to fetch count for table '$Table': $_"
    }

    $contentRange = $response.Headers["Content-Range"]
    if (-not $contentRange) {
        throw "Content-Range header missing for table '$Table'. Cannot determine count."
    }

    if ($contentRange -match "/(?<count>\\d+)$") {
        return [int]$matches["count"]
    }

    throw "Unable to parse count from Content-Range for table '$Table': $contentRange"
}

function Build-Result {
    param(
        [string]$ProjectRef,
        [hashtable]$Counts
    )

    $invariants = @{
        card_prints        = 40000
        sets               = 150
        card_print_traits  = 5000
    }

    $checks = @{}
    foreach ($key in $Counts.Keys) {
        if ($invariants.ContainsKey($key)) {
            $checks[$key] = $Counts[$key] -ge $invariants[$key]
        } else {
            $checks[$key] = $true
        }
    }

    $allPass = ($checks.Values | Where-Object { $_ -eq $false }).Count -eq 0

    return @{
        project_ref = $ProjectRef
        counts      = $Counts
        checks      = $checks
        all_pass    = $allPass
    }
}

function Print-Human {
    param([hashtable]$Result)

    Write-Host "[Grookai Healthcheck]"
    Write-Host "project_ref: $($Result.project_ref)"
    Write-Host ""

    $invariantsText = @{
        card_prints       = ">= 40000"
        sets              = ">= 150"
        card_print_traits = ">= 5000"
        price_observations = "ok (may be 0 if pricing not run)"
        card_print_price_curves = "ok (may be 0 if pricing not run)"
    }

    foreach ($key in @("card_prints","sets","card_print_traits","price_observations","card_print_price_curves")) {
        if (-not $Result.counts.ContainsKey($key)) { continue }
        $count = $Result.counts[$key]
        $target = $invariantsText[$key]
        $status = if ($Result.checks.ContainsKey($key) -and $Result.checks[$key]) { "OK" } elseif ($Result.checks.ContainsKey($key)) { "FAIL" } else { "INFO" }
        Write-Host ("{0,-20} {1,8}   ({2} {3})" -f ($key + ":"), $count, $status, $target)
    }

    if (-not $Result.all_pass) {
        Write-Warning "Canonical DB invariants FAILED. You may be pointed at the wrong project or an uninitialized environment."
    } else {
        Write-Host ""
        Write-Host "All canonical invariants satisfied."
    }
}

try {
    $supabaseUrl = Require-Env -Name "SUPABASE_URL"
    $apiKey = Require-Env -Name "SUPABASE_SECRET_KEY"
    $projectRef = Get-ProjectRef -SupabaseUrl $supabaseUrl

    $counts = @{
        card_prints             = Get-TableCount -SupabaseUrl $supabaseUrl -ApiKey $apiKey -Table "card_prints"
        sets                    = Get-TableCount -SupabaseUrl $supabaseUrl -ApiKey $apiKey -Table "sets"
        card_print_traits       = Get-TableCount -SupabaseUrl $supabaseUrl -ApiKey $apiKey -Table "card_print_traits"
        price_observations      = Get-TableCount -SupabaseUrl $supabaseUrl -ApiKey $apiKey -Table "price_observations"
        card_print_price_curves = Get-TableCount -SupabaseUrl $supabaseUrl -ApiKey $apiKey -Table "card_print_price_curves"
    }

    $result = Build-Result -ProjectRef $projectRef -Counts $counts

    if ($Json) {
        $result | ConvertTo-Json -Depth 5
    } else {
        Print-Human -Result $result
    }
} catch {
    Write-Error $_
    exit 1
}
