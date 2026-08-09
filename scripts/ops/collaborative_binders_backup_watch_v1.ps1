#requires -Version 7.5

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ArtifactRoot,

  [ValidateRange(60, 300)]
  [int]$PollSeconds = 300,

  [ValidateRange(1, 48)]
  [int]$MaximumHours = 30,

  [switch]$ValidateSourceOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRef = 'ycdxbpibncqcchqiihfz'
$baselineBackupText = '2026-07-24T10:25:37.891Z'
$recoveryLagMinutes = 1440
$maximumFutureMinutes = 0
$maximumTransientErrors = 6
$repoRoot = [IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot '..\..')
).TrimEnd('\')
$secureOpsRoot = [IO.Path]::GetFullPath('C:\secure-ops').TrimEnd('\')
$resolvedArtifactRoot = [IO.Path]::GetFullPath($ArtifactRoot).TrimEnd('\')
$rolloutModulePath = Join-Path (
  $repoRoot
) 'scripts/ops/CollaborativeBindersProductionRolloutV1.psm1'
$expectedRolloutModuleSha256 =
  '00f43c30d5335beddcdb41f88a67f120792c89f15230def0a929acec7b84451f'
$supabaseBinary = [IO.Path]::GetFullPath(
  'C:\Users\ccabr\scoop\apps\supabase\2.90.0\supabase.exe'
)
$supabaseLauncher = [IO.Path]::GetFullPath(
  'C:\Users\ccabr\scoop\shims\supabase.exe'
)
$supabaseShim = [IO.Path]::GetFullPath(
  'C:\Users\ccabr\scoop\shims\supabase.shim'
)
$expectedCliVersion = '2.90.0'
$expectedBinarySha256 =
  '31c2a25bd590a36ad803a7c669cf76a62eac3cd5aa7112eeb2e1c5f308c8b39c'
$expectedLauncherSha256 =
  '140e3801d8adeda639a21b14e62b93a4c7d26b7a758421f43c82be59753be49b'
$expectedShimSha256 =
  '0c68f69a367b2b76e61f3e71fb98c9a867143628a361a2e715dd30f33c4b2c3f'
$startedAt = [datetimeoffset]::UtcNow
$deadline = $startedAt.AddHours($MaximumHours)
$pollCount = 0
$consecutiveTransientErrors = 0
$rolloutModule = $null
$sealStreams = [Collections.Generic.List[IO.FileStream]]::new()

function Assert-Condition {
  param(
    [Parameter(Mandatory = $true)]
    [bool]$Condition,

    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

function Get-Sha256File {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return (
    Get-FileHash -Algorithm SHA256 -LiteralPath $Path -ErrorAction Stop
  ).Hash.ToLowerInvariant()
}

function Get-Sha256Text {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
  try {
    return [Convert]::ToHexString(
      [Security.Cryptography.SHA256]::HashData($bytes)
    ).ToLowerInvariant()
  } finally {
    [Array]::Clear($bytes, 0, $bytes.Length)
  }
}

function Write-AtomicJson {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [object]$Value
  )

  $json = $Value | ConvertTo-Json -Depth 12
  $temporary = $Path + '.tmp-' + [guid]::NewGuid().ToString('N')
  [IO.File]::WriteAllText(
    $temporary,
    $json + [Environment]::NewLine,
    [Text.UTF8Encoding]::new($false)
  )
  [IO.File]::Move($temporary, $Path, $true)
}

function Write-AtomicText {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $temporary = $Path + '.tmp-' + [guid]::NewGuid().ToString('N')
  [IO.File]::WriteAllText(
    $temporary,
    $Value,
    [Text.UTF8Encoding]::new($false)
  )
  [IO.File]::Move($temporary, $Path, $true)
}

function ConvertFrom-StrictUtcTimestamp {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  Assert-Condition (
    $Value -cmatch (
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}' +
      '\.\d{1,7}Z$'
    )
  ) "$Label must be an exact fractional-second RFC3339 UTC timestamp."
  $parsed = [datetimeoffset]::MinValue
  $ok = [datetimeoffset]::TryParseExact(
    $Value,
    "yyyy-MM-dd'T'HH:mm:ss.FFFFFFFK",
    [Globalization.CultureInfo]::InvariantCulture,
    [Globalization.DateTimeStyles]::AdjustToUniversal,
    [ref]$parsed
  )
  Assert-Condition $ok "$Label could not be parsed."
  return $parsed.ToUniversalTime()
}

function ConvertFrom-BackupInventory {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RawJson,

    [Parameter(Mandatory = $true)]
    [datetimeoffset]$VerifiedAtUtc
  )

  $inventory = $RawJson | ConvertFrom-Json -DateKind String
  Assert-Condition ($null -ne $inventory) (
    'Supabase backup inventory returned no JSON object.'
  )
  Assert-Condition (
    $inventory.PSObject.Properties.Name -contains 'backups'
  ) 'Supabase backup inventory has no backups collection.'
  Assert-Condition (
    $inventory.PSObject.Properties.Name -contains 'pitr_enabled'
  ) 'Supabase backup inventory has no PITR state.'
  Assert-Condition (
    $inventory.PSObject.Properties.Name -contains 'walg_enabled'
  ) 'Supabase backup inventory has no WAL-G state.'
  Assert-Condition (
    $inventory.pitr_enabled -is [bool]
  ) 'Supabase backup inventory PITR state is not Boolean.'
  Assert-Condition (
    $inventory.walg_enabled -is [bool]
  ) 'Supabase backup inventory WAL-G state is not Boolean.'

  $rows = [Collections.Generic.List[object]]::new()
  foreach ($backup in @($inventory.backups)) {
    foreach ($required in @(
      'inserted_at',
      'is_physical_backup',
      'status'
    )) {
      Assert-Condition (
        $backup.PSObject.Properties.Name -ccontains $required
      ) "Supabase backup row is missing $required."
    }
    Assert-Condition (
      $backup.inserted_at -is [string]
    ) 'Supabase backup timestamp was not preserved as a JSON string.'
    Assert-Condition (
      $backup.is_physical_backup -is [bool]
    ) 'Supabase physical-backup marker is not Boolean.'
    Assert-Condition (
      $backup.status -is [string]
    ) 'Supabase backup status is not a string.'
    $timestampText = [string]$backup.inserted_at
    $timestamp = ConvertFrom-StrictUtcTimestamp `
      -Value $timestampText `
      -Label 'Supabase backup inserted_at'
    $rows.Add([pscustomobject]@{
      timestamp_text = $timestampText
      timestamp = $timestamp
      is_physical_backup = [bool]$backup.is_physical_backup
      status = [string]$backup.status
    })
  }

  $baseline = ConvertFrom-StrictUtcTimestamp `
    -Value $baselineBackupText `
    -Label 'Pinned baseline backup'
  $baselineMatches = @(
    $rows | Where-Object {
      $_.timestamp_text -ceq $baselineBackupText -and
      $_.is_physical_backup -eq $true -and
      $_.status -ceq 'COMPLETED'
    }
  )
  Assert-Condition (
    $baselineMatches.Count -eq 1
  ) 'The exact pinned completed physical baseline is absent or duplicated.'

  $completed = @(
    $rows |
      Where-Object {
        $_.is_physical_backup -eq $true -and
        $_.status -ceq 'COMPLETED'
      } |
      Sort-Object -Property timestamp -Descending
  )
  Assert-Condition (
    $completed.Count -gt 0
  ) 'No completed physical backup exists in the inventory.'
  $latest = $completed[0]
  $backupAgeSeconds = (
    $VerifiedAtUtc.ToUniversalTime() - $latest.timestamp
  ).TotalSeconds
  $futureOk = (
    $latest.timestamp -le
    $VerifiedAtUtc.ToUniversalTime().AddMinutes($maximumFutureMinutes)
  )
  $recoveryLagOk = (
    $futureOk -and
    $backupAgeSeconds -le ($recoveryLagMinutes * 60)
  )
  $newBackupFound = $latest.timestamp -gt $baseline
  $freshBackupFound = $newBackupFound -and $recoveryLagOk

  return [pscustomobject][ordered]@{
    latest_completed_physical_backup_utc = $latest.timestamp_text
    selected_backup_reference = (
      'supabase-platform-physical:' + $latest.timestamp_text
    )
    backup_age_seconds = [Math]::Round($backupAgeSeconds, 3)
    future_bound_ok = $futureOk
    recovery_lag_ok = $recoveryLagOk
    new_backup_found = $newBackupFound
    fresh_backup_found = $freshBackupFound
    pitr_enabled = [bool]$inventory.pitr_enabled
    walg_enabled = [bool]$inventory.walg_enabled
    completed_physical_backup_count = $completed.Count
  }
}

function Assert-FileIdentity {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedSha256,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $item = Get-Item -LiteralPath $Path -ErrorAction Stop
  Assert-Condition (-not $item.PSIsContainer) "$Label is not a file."
  Assert-Condition (
    -not $item.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)
  ) "$Label must not be a reparse point."
  Assert-Condition (
    (Get-Sha256File -Path $Path) -ceq $ExpectedSha256
  ) "$Label hash does not match the reviewed toolchain."
}

function Assert-Toolchain {
  Assert-FileIdentity `
    -Path $rolloutModulePath `
    -ExpectedSha256 $expectedRolloutModuleSha256 `
    -Label 'Production rollout containment module'
  Assert-FileIdentity `
    -Path $supabaseBinary `
    -ExpectedSha256 $expectedBinarySha256 `
    -Label 'Supabase versioned binary'
  Assert-FileIdentity `
    -Path $supabaseLauncher `
    -ExpectedSha256 $expectedLauncherSha256 `
    -Label 'Supabase launcher'
  Assert-FileIdentity `
    -Path $supabaseShim `
    -ExpectedSha256 $expectedShimSha256 `
    -Label 'Supabase shim descriptor'

  $descriptor = Get-Content -Raw -LiteralPath $supabaseShim
  $match = [regex]::Match(
    $descriptor,
    '(?m)^\s*path\s*=\s*"(?<path>[^"]+)"\s*$'
  )
  Assert-Condition $match.Success (
    'Supabase shim descriptor target is missing.'
  )
  $currentTarget = [IO.Path]::GetFullPath(
    $match.Groups['path'].Value
  )
  Assert-Condition (
    $currentTarget -ceq
    'C:\Users\ccabr\scoop\apps\supabase\current\supabase.exe'
  ) 'Supabase shim descriptor target changed.'
  $currentParent = Get-Item -LiteralPath (
    Split-Path -Parent $currentTarget
  ) -ErrorAction Stop
  Assert-Condition (
    $currentParent.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)
  ) 'Supabase current directory is no longer a reparse point.'
  $resolvedParent = $currentParent.ResolveLinkTarget($true)
  Assert-Condition (
    $null -ne $resolvedParent -and
    $resolvedParent.FullName -ceq (
      Split-Path -Parent $supabaseBinary
    )
  ) 'Supabase current junction no longer resolves to reviewed version 2.90.0.'

}

function Open-ToolchainSeal {
  foreach ($path in @(
    $rolloutModulePath,
    $supabaseBinary,
    $supabaseLauncher,
    $supabaseShim
  )) {
    $sealStreams.Add(
      [IO.File]::Open(
        $path,
        [IO.FileMode]::Open,
        [IO.FileAccess]::Read,
        [IO.FileShare]::Read
      )
    )
  }
}

function Protect-ArtifactDirectory {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $currentSid = $identity.User
  Assert-Condition ($null -ne $currentSid) 'Current Windows SID is unavailable.'

  $security = [Security.AccessControl.DirectorySecurity]::new()
  $security.SetAccessRuleProtection($true, $false)
  $security.SetOwner($currentSid)
  $inheritance = (
    [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
    [Security.AccessControl.InheritanceFlags]::ObjectInherit
  )
  $propagation = [Security.AccessControl.PropagationFlags]::None
  $allow = [Security.AccessControl.AccessControlType]::Allow
  foreach ($sidText in @(
    $currentSid.Value,
    'S-1-5-18',
    'S-1-5-32-544'
  )) {
    $sid = [Security.Principal.SecurityIdentifier]::new($sidText)
    $rule = [Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      [Security.AccessControl.FileSystemRights]::FullControl,
      $inheritance,
      $propagation,
      $allow
    )
    [void]$security.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $resolvedArtifactRoot -AclObject $security
  $actual = Get-Acl -LiteralPath $resolvedArtifactRoot
  Assert-Condition $actual.AreAccessRulesProtected (
    'Backup watcher ACL inheritance was not disabled.'
  )
  $ownerSid = (
    [Security.Principal.NTAccount]$actual.Owner
  ).Translate([Security.Principal.SecurityIdentifier]).Value
  Assert-Condition (
    $ownerSid -ceq $currentSid.Value
  ) 'Backup watcher artifact owner is not the current operator.'
  $actualRules = @($actual.Access)
  Assert-Condition (
    $actualRules.Count -eq 3
  ) 'Backup watcher ACL must contain exactly three access rules.'
  Assert-Condition (
    @(
      $actualRules |
        Where-Object {
          $_.AccessControlType -ne $allow -or
          $_.IsInherited -or
          $_.InheritanceFlags -ne $inheritance -or
          $_.PropagationFlags -ne $propagation -or
          (
            $_.FileSystemRights -band
            [Security.AccessControl.FileSystemRights]::FullControl
          ) -ne [Security.AccessControl.FileSystemRights]::FullControl
        }
    ).Count -eq 0
  ) 'Backup watcher ACL contains an inherited, denied, or restricted rule.'
  $actualAllowSids = @(
    $actualRules |
      ForEach-Object {
        $_.IdentityReference.Translate(
          [Security.Principal.SecurityIdentifier]
        ).Value
      } |
      Sort-Object -Unique
  )
  $expectedAllowSids = @(
    $currentSid.Value,
    'S-1-5-18',
    'S-1-5-32-544'
  ) | Sort-Object -Unique
  Assert-Condition (
    @(Compare-Object $expectedAllowSids $actualAllowSids).Count -eq 0
  ) 'Backup watcher ACL contains an unexpected allowed identity.'
}

function Invoke-ContainedInventory {
  Assert-Toolchain
  $arguments = @(
    'backups',
    'list',
    '--project-ref',
    $projectRef,
    '--output',
    'json',
    '--agent',
    'no'
  )
  return & $rolloutModule {
    param(
      [string]$ExecutablePath,
      [string[]]$CommandArguments,
      [string]$WorkingDirectory
    )

    Invoke-BinderProcessV1 `
      -FilePath $ExecutablePath `
      -Arguments $CommandArguments `
      -WorkingDirectory $WorkingDirectory `
      -TimeoutSeconds 60 `
      -SanitizeDatabaseEnvironment
  } $supabaseBinary $arguments $repoRoot
}

function Write-State {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Evaluation,

    [Parameter(Mandatory = $true)]
    [datetimeoffset]$CheckedAtUtc,

    [Parameter(Mandatory = $true)]
    [string]$InventorySha256,

    [string]$Status = 'watching',

    [string]$Detail
  )

  Write-AtomicJson -Path (
    Join-Path $resolvedArtifactRoot 'watcher-state.json'
  ) -Value ([ordered]@{
    schema_version = 2
    watcher_kind = 'supabase_physical_backup_read_only'
    project_ref = $projectRef
    status = $Status
    detail = $Detail
    started_at_utc = $startedAt.ToString('o')
    checked_at_utc = $CheckedAtUtc.ToUniversalTime().ToString('o')
    deadline_utc = $deadline.ToString('o')
    poll_count = $pollCount
    consecutive_transient_errors = $consecutiveTransientErrors
    baseline_backup_utc = $baselineBackupText
    latest_completed_physical_backup_utc =
      $Evaluation.latest_completed_physical_backup_utc
    selected_backup_reference = $Evaluation.selected_backup_reference
    backup_age_seconds = $Evaluation.backup_age_seconds
    future_bound_ok = $Evaluation.future_bound_ok
    recovery_lag_ok = $Evaluation.recovery_lag_ok
    new_backup_found = $Evaluation.new_backup_found
    fresh_backup_found = $Evaluation.fresh_backup_found
    pitr_enabled = $Evaluation.pitr_enabled
    walg_enabled = $Evaluation.walg_enabled
    completed_physical_backup_count =
      $Evaluation.completed_physical_backup_count
    inventory_sha256 = $InventorySha256
    cli_version = $expectedCliVersion
    cli_binary_sha256 = $expectedBinarySha256
    cli_launcher_sha256 = $expectedLauncherSha256
    cli_shim_descriptor_sha256 = $expectedShimSha256
    rollout_containment_module_sha256 =
      $expectedRolloutModuleSha256
    mutation_possible = $false
  })
}

function Assert-Fixtures {
  $baselineFixture = @'
{
  "backups": [
    {
      "inserted_at": "2026-07-24T10:25:37.891Z",
      "is_physical_backup": true,
      "status": "COMPLETED"
    }
  ],
  "pitr_enabled": false,
  "walg_enabled": true
}
'@
  $freshFixture = @'
{
  "backups": [
    {
      "inserted_at": "2026-07-25T10:30:00.123Z",
      "is_physical_backup": true,
      "status": "COMPLETED"
    },
    {
      "inserted_at": "2026-07-24T10:25:37.891Z",
      "is_physical_backup": true,
      "status": "COMPLETED"
    }
  ],
  "pitr_enabled": false,
  "walg_enabled": true
}
'@
  $staleFixture = $freshFixture
  $baselineEvaluation = ConvertFrom-BackupInventory `
    -RawJson $baselineFixture `
    -VerifiedAtUtc (
      ConvertFrom-StrictUtcTimestamp `
        -Value '2026-07-24T10:30:00.000Z' `
        -Label 'Fixture verification'
    )
  Assert-Condition (
    -not $baselineEvaluation.new_backup_found -and
    -not $baselineEvaluation.fresh_backup_found
  ) 'Baseline-only watcher fixture did not remain ineligible.'
  $freshEvaluation = ConvertFrom-BackupInventory `
    -RawJson $freshFixture `
    -VerifiedAtUtc (
      ConvertFrom-StrictUtcTimestamp `
        -Value '2026-07-25T10:40:00.000Z' `
        -Label 'Fixture verification'
    )
  Assert-Condition (
    $freshEvaluation.new_backup_found -and
    $freshEvaluation.fresh_backup_found -and
    $freshEvaluation.recovery_lag_ok
  ) 'Fresh watcher fixture did not become eligible.'
  $staleEvaluation = ConvertFrom-BackupInventory `
    -RawJson $staleFixture `
    -VerifiedAtUtc (
      ConvertFrom-StrictUtcTimestamp `
        -Value '2026-07-26T10:30:01.000Z' `
        -Label 'Fixture verification'
    )
  Assert-Condition (
    $staleEvaluation.new_backup_found -and
    -not $staleEvaluation.fresh_backup_found -and
    -not $staleEvaluation.recovery_lag_ok
  ) 'Stale watcher fixture was not rejected.'
}

function Write-StopIncident {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Reason,

    [string]$Kind = 'permanent_guard_failure'
  )

  if (Test-Path -LiteralPath $resolvedArtifactRoot -PathType Container) {
    Write-AtomicJson -Path (
      Join-Path $resolvedArtifactRoot 'STOP-incident.json'
    ) -Value ([ordered]@{
      schema_version = 2
      watcher_kind = 'supabase_physical_backup_read_only'
      project_ref = $projectRef
      started_at_utc = $startedAt.ToString('o')
      stopped_at_utc = [datetimeoffset]::UtcNow.ToString('o')
      deadline_utc = $deadline.ToString('o')
      poll_count = $pollCount
      consecutive_transient_errors = $consecutiveTransientErrors
      baseline_backup_utc = $baselineBackupText
      stop_kind = $Kind
      stop_reason = $Reason
      automatic_retry = $false
      mutation_possible = $false
    })
  }
}

try {
  $secureRootItem = Get-Item -LiteralPath $secureOpsRoot -ErrorAction Stop
  Assert-Condition $secureRootItem.PSIsContainer (
    'C:\secure-ops is not a directory.'
  )
  Assert-Condition (
    -not $secureRootItem.Attributes.HasFlag(
      [IO.FileAttributes]::ReparsePoint
    )
  ) 'C:\secure-ops must not be a reparse point.'
  Assert-Condition (
    (Split-Path -Parent $resolvedArtifactRoot) -ceq $secureOpsRoot
  ) 'Backup-watch evidence must use an exact direct child of C:\secure-ops.'
  Assert-Condition (
    (Split-Path -Leaf $resolvedArtifactRoot) -cmatch
    '^binder-backup-watch-\d{8}T\d{6}Z$'
  ) 'Backup-watch artifact root has an invalid name.'
  Assert-Condition (
    -not (Test-Path -LiteralPath $resolvedArtifactRoot)
  ) "Backup-watch artifact root already exists: $resolvedArtifactRoot"
  Assert-Fixtures
  Assert-Toolchain

  foreach ($entry in @(Get-ChildItem Env:)) {
    if (
      $entry.Name -match (
        '(?i)^(?:PG.*|DATABASE_URL|DIRECT_URL|DB_URL|' +
        'PRISMA_DATABASE_URL|POSTGRES(?:QL)?_URL.*|' +
        'SUPABASE_DB_.*|SUPABASE_API_(?:HOST|URL)|' +
        'SUPABASE_INTERNAL_.*|SUPABASE_PROJECT_(?:ID|REF)|' +
        'SUPABASE_CA_SKIP_VERIFY)$'
      )
    ) {
      Remove-Item -LiteralPath ('Env:' + $entry.Name)
    }
  }

  Open-ToolchainSeal
  Assert-Toolchain
  $rolloutModule = Import-Module `
    -Name $rolloutModulePath `
    -Force `
    -PassThru
  $sourceProof = & $rolloutModule {
    param([string]$WorkingDirectory)
    Test-BinderSourceV1 -RepoRoot $WorkingDirectory
  } $repoRoot
  $projectProof = & $rolloutModule {
    param([string]$WorkingDirectory)
    Assert-ProjectBindingV1 -RepoRoot $WorkingDirectory
  } $repoRoot
  Assert-Condition (
    $sourceProof.ProjectRef -ceq $projectRef -and
    $sourceProof.SupabaseCliVersion -ceq $expectedCliVersion -and
    $sourceProof.SupabaseCliBinarySha256 -ceq $expectedBinarySha256
  ) 'Production source proof did not match the watcher policy.'
  Assert-Condition (
    $projectProof.ProjectRef -ceq $projectRef -and
    $projectProof.ApiHost -ceq "$projectRef.supabase.co" -and
    $projectProof.DatabaseHost -ceq "db.$projectRef.supabase.co" -and
    $projectProof.Status -ceq 'ACTIVE_HEALTHY'
  ) 'Production project binding proof did not match the watcher policy.'

  if ($ValidateSourceOnly) {
    [pscustomobject]@{
      ok = $true
      validation_only = $true
      project_ref = $projectRef
      baseline_backup_utc = $baselineBackupText
      recovery_lag_minutes = $recoveryLagMinutes
      cli_version = $expectedCliVersion
      cli_binary_sha256 = $expectedBinarySha256
      rollout_containment_module_sha256 =
        $expectedRolloutModuleSha256
      project_status = $projectProof.Status
      fixtures_passed = 3
      mutation_possible = $false
      artifact_root_created = $false
    } | ConvertTo-Json -Compress
    exit 0
  }

  [void][IO.Directory]::CreateDirectory($resolvedArtifactRoot)
  Protect-ArtifactDirectory
  Assert-Condition (
    -not (
      Get-Item -LiteralPath $resolvedArtifactRoot
    ).Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)
  ) 'Created backup-watch artifact root must not be a reparse point.'
  $watcherSha256 = Get-Sha256File -Path $PSCommandPath
  $watcherSnapshotPath = Join-Path (
    $resolvedArtifactRoot
  ) 'watcher-source.ps1'
  [IO.File]::Copy($PSCommandPath, $watcherSnapshotPath, $false)
  Assert-Condition (
    (Get-Sha256File -Path $watcherSnapshotPath) -ceq $watcherSha256
  ) 'Backup watcher source changed during evidence sealing.'
  Write-AtomicJson -Path (
    Join-Path $resolvedArtifactRoot 'watcher-plan.json'
  ) -Value ([ordered]@{
    schema_version = 2
    watcher_kind = 'supabase_physical_backup_read_only'
    project_ref = $projectRef
    baseline_backup_utc = $baselineBackupText
    recovery_lag_minutes = $recoveryLagMinutes
    maximum_future_minutes = $maximumFutureMinutes
    poll_seconds = $PollSeconds
    maximum_hours = $MaximumHours
    started_at_utc = $startedAt.ToString('o')
    deadline_utc = $deadline.ToString('o')
    watcher_source_sha256 = $watcherSha256
    cli_version = $expectedCliVersion
    cli_binary_sha256 = $expectedBinarySha256
    cli_launcher_sha256 = $expectedLauncherSha256
    cli_shim_descriptor_sha256 = $expectedShimSha256
    rollout_containment_module_sha256 =
      $expectedRolloutModuleSha256
    project_binding = $projectProof
    source_package_fingerprint_sha256 =
      $sourceProof.PackageFingerprintSha256
    mutation_possible = $false
  })

  while ([datetimeoffset]::UtcNow -lt $deadline) {
    $pollCount += 1
    $inventoryResult = Invoke-ContainedInventory
    if (
      $inventoryResult.ExitCode -ne 0 -or
      $inventoryResult.TimedOut -or
      -not $inventoryResult.TerminationConfirmed -or
      -not $inventoryResult.OutputCaptureCompleted -or
      $inventoryResult.OutputTruncated
    ) {
      $consecutiveTransientErrors += 1
      Write-AtomicJson -Path (
        Join-Path $resolvedArtifactRoot 'transient-error.latest.json'
      ) -Value ([ordered]@{
        schema_version = 2
        watcher_kind = 'supabase_physical_backup_read_only'
        project_ref = $projectRef
        checked_at_utc = [datetimeoffset]::UtcNow.ToString('o')
        poll_count = $pollCount
        consecutive_transient_errors = $consecutiveTransientErrors
        exit_code = $inventoryResult.ExitCode
        timed_out = $inventoryResult.TimedOut
        termination_confirmed = $inventoryResult.TerminationConfirmed
        output_capture_completed =
          $inventoryResult.OutputCaptureCompleted
        output_truncated = $inventoryResult.OutputTruncated
        stderr_sha256 = Get-Sha256Text `
          -Value ([string]$inventoryResult.StdErr)
        mutation_possible = $false
      })
      if ($consecutiveTransientErrors -ge $maximumTransientErrors) {
        Write-StopIncident `
          -Reason (
            'Maximum consecutive bounded inventory failures reached.'
          ) `
          -Kind 'transient_error_limit_reached'
        exit 3
      }
      Start-Sleep -Seconds $PollSeconds
      continue
    }

    $consecutiveTransientErrors = 0
    $checkedAt = [datetimeoffset]::UtcNow
    $rawInventory = [string]$inventoryResult.StdOut
    $inventorySha256 = Get-Sha256Text -Value $rawInventory
    Write-AtomicText -Path (
      Join-Path $resolvedArtifactRoot 'inventory.latest.json'
    ) -Value $rawInventory
    $evaluation = ConvertFrom-BackupInventory `
      -RawJson $rawInventory `
      -VerifiedAtUtc $checkedAt
    Write-State `
      -Evaluation $evaluation `
      -CheckedAtUtc $checkedAt `
      -InventorySha256 $inventorySha256

    if ($evaluation.fresh_backup_found) {
      $selectedInventoryPath = Join-Path (
        $resolvedArtifactRoot
      ) 'inventory.selected.json'
      Write-AtomicText -Path $selectedInventoryPath -Value $rawInventory
      $selectedInventoryFileSha256 = Get-Sha256File `
        -Path $selectedInventoryPath
      $freshPath = Join-Path $resolvedArtifactRoot 'fresh-backup.json'
      Write-AtomicJson -Path $freshPath -Value ([ordered]@{
        schema_version = 2
        watcher_kind = 'supabase_physical_backup_read_only'
        project_ref = $projectRef
        started_at_utc = $startedAt.ToString('o')
        verified_at_utc = $checkedAt.ToUniversalTime().ToString('o')
        baseline_backup_utc = $baselineBackupText
        backup_kind = 'supabase_platform_backup'
        selected_backup_reference =
          $evaluation.selected_backup_reference
        selected_backup_utc =
          $evaluation.latest_completed_physical_backup_utc
        selected_backup_status = 'COMPLETED'
        selected_backup_is_physical = $true
        backup_age_seconds = $evaluation.backup_age_seconds
        future_bound_ok = $evaluation.future_bound_ok
        recovery_lag_ok = $evaluation.recovery_lag_ok
        new_backup_found = $evaluation.new_backup_found
        fresh_backup_found = $evaluation.fresh_backup_found
        inventory_file = 'inventory.selected.json'
        inventory_sha256 = $inventorySha256
        inventory_file_sha256 = $selectedInventoryFileSha256
        cli_version = $expectedCliVersion
        cli_binary_sha256 = $expectedBinarySha256
        rollout_containment_module_sha256 =
          $expectedRolloutModuleSha256
        restore_path_reviewed = $false
        operator_evidence_required = $true
        mutation_possible = $false
      })
      $freshSha256 = Get-Sha256File -Path $freshPath
      Write-State `
        -Evaluation $evaluation `
        -CheckedAtUtc $checkedAt `
        -InventorySha256 $inventorySha256 `
        -Status 'eligible_backup_detected' `
        -Detail (
          'Fresh platform backup detected; operator restore-path ' +
          'evidence is still required.'
        )
      Write-AtomicJson -Path (
        Join-Path $resolvedArtifactRoot 'READY.json'
      ) -Value ([ordered]@{
        schema_version = 2
        ready = $true
        project_ref = $projectRef
        evidence_file = 'fresh-backup.json'
        evidence_sha256 = $freshSha256
        inventory_file = 'inventory.selected.json'
        inventory_sha256 = $selectedInventoryFileSha256
        written_at_utc = [datetimeoffset]::UtcNow.ToString('o')
        restore_path_reviewed = $false
        operator_evidence_required = $true
        mutation_possible = $false
      })
      exit 0
    }

    Start-Sleep -Seconds $PollSeconds
  }

  Write-StopIncident `
    -Reason 'Maximum backup-watch duration elapsed.' `
    -Kind 'maximum_watch_duration_elapsed'
  exit 2
} catch {
  Write-StopIncident -Reason $_.Exception.Message
  throw
} finally {
  if ($null -ne $rolloutModule) {
    Remove-Module -ModuleInfo $rolloutModule -Force -ErrorAction SilentlyContinue
  }
  foreach ($stream in $sealStreams) {
    if ($null -ne $stream) {
      $stream.Dispose()
    }
  }
}
