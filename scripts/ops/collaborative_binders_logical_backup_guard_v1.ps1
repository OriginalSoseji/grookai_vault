#requires -Version 7.4

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [int]$BackupProcessId,

  [Parameter(Mandatory = $true)]
  [string]$BackupArtifactRoot,

  [Parameter(Mandatory = $true)]
  [datetime]$BackupStartedAtUtc,

  [Parameter(Mandatory = $true)]
  [string]$ArtifactRoot,

  [string]$ProjectRef = 'ycdxbpibncqcchqiihfz',

  [long]$GuardStopThresholdBytes = 96636764160,

  [string]$DockerExecutable =
    'C:\Program Files\Docker\Docker\resources\bin\docker.exe',

  [string]$ExpectedDockerSha256 =
    '7f2264b4c6389c7e60fa4b86f54bdac093e25547401aefb50fd91ce147e21a63',

  [string]$ExpectedPostgresImageId =
    'sha256:dc436b5b4ebeb0f3bdf6d8dda2b390cc094e14d24cd434d5fe02840459e67670'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Assert-GuardConditionV1 {
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

function Get-GuardSha256V1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return (
    Get-FileHash -LiteralPath $Path -Algorithm SHA256
  ).Hash.ToLowerInvariant()
}

function Write-GuardAtomicJsonV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [object]$Value
  )

  $directory = Split-Path -Parent $Path
  $temporaryPath = Join-Path $directory (
    '.' + [System.IO.Path]::GetFileName($Path) + '.' +
    [guid]::NewGuid().ToString('N') + '.tmp'
  )
  try {
    [System.IO.File]::WriteAllText(
      $temporaryPath,
      (($Value | ConvertTo-Json -Depth 20) + "`n"),
      [System.Text.UTF8Encoding]::new($false)
    )
    Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
  } finally {
    if (Test-Path -LiteralPath $temporaryPath) {
      Remove-Item -LiteralPath $temporaryPath -Force
    }
  }
}

function Assert-GuardNoReparseV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $cursor = [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
  while ($cursor -and -not (Test-Path -LiteralPath $cursor)) {
    $parent = Split-Path -Parent $cursor
    if (
      [string]::IsNullOrWhiteSpace($parent) -or
      $parent -ceq $cursor
    ) {
      break
    }
    $cursor = $parent
  }
  while ($cursor -and (Test-Path -LiteralPath $cursor)) {
    $item = Get-Item -LiteralPath $cursor -Force
    Assert-GuardConditionV1 `
      -Condition (
        -not $item.Attributes.HasFlag(
          [System.IO.FileAttributes]::ReparsePoint
        )
      ) `
      -Message "Guard path contains a reparse point: $cursor"
    $parent = Split-Path -Parent $cursor
    if (
      [string]::IsNullOrWhiteSpace($parent) -or
      $parent -ceq $cursor
    ) {
      break
    }
    $cursor = $parent
  }
}

function Protect-GuardRootV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  $currentSid = $identity.User
  Assert-GuardConditionV1 `
    -Condition ($null -ne $currentSid) `
    -Message 'Current Windows SID is unavailable.'
  $security =
    [System.Security.AccessControl.DirectorySecurity]::new()
  $security.SetAccessRuleProtection($true, $false)
  $security.SetOwner($currentSid)
  $inheritance = (
    [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
    [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
  )
  $propagation =
    [System.Security.AccessControl.PropagationFlags]::None
  $allow = [System.Security.AccessControl.AccessControlType]::Allow
  foreach ($sidText in @(
    $currentSid.Value,
    'S-1-5-18',
    'S-1-5-32-544'
  )) {
    $sid =
      [System.Security.Principal.SecurityIdentifier]::new($sidText)
    $rule =
      [System.Security.AccessControl.FileSystemAccessRule]::new(
        $sid,
        [System.Security.AccessControl.FileSystemRights]::FullControl,
        $inheritance,
        $propagation,
        $allow
      )
    [void]$security.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $Path -AclObject $security
  $acl = Get-Acl -LiteralPath $Path
  Assert-GuardConditionV1 `
    -Condition (
      $acl.AreAccessRulesProtected -and
      @($acl.Access).Count -eq 3
    ) `
    -Message 'Guard root ACL verification failed.'
}

function Get-GuardBackupStatusV1 {
  $path = Join-Path $script:resolvedBackupRoot 'status.json'
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    return [pscustomobject]@{
      status = 'missing'
      step = 'unknown'
      reason = ''
    }
  }
  try {
    return Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
  } catch {
    return [pscustomobject]@{
      status = 'unreadable'
      step = 'unknown'
      reason = ''
    }
  }
}

function Get-GuardDumpContainersV1 {
  $containerIds = @(
    & $script:DockerExecutable `
      ps `
      --filter (
        'ancestor=public.ecr.aws/supabase/postgres:17.4.1.074'
      ) `
      --format '{{.ID}}' 2>$null
  )
  Assert-GuardConditionV1 `
    -Condition ($LASTEXITCODE -eq 0) `
    -Message 'Docker container inventory failed.'
  $containerMatches =
    [System.Collections.Generic.List[object]]::new()
  foreach ($containerId in $containerIds) {
    if ($containerId -notmatch '^[0-9a-f]{12,64}$') {
      continue
    }
    $safeMetadata = & $script:DockerExecutable inspect --format (
      '{{.Id}}|{{.Name}}|{{.Config.Image}}|{{.Image}}|{{.Created}}|' +
      '{{.State.Running}}'
    ) $containerId 2>$null
    if ($LASTEXITCODE -ne 0) {
      continue
    }
    $parts = [string]$safeMetadata -split '\|', 6
    if ($parts.Count -ne 6) {
      continue
    }
    $commandSensitive =
      & $script:DockerExecutable inspect `
        --format '{{json .Config.Cmd}}' `
        $containerId 2>$null
    if ($LASTEXITCODE -ne 0) {
      continue
    }
    $environmentSensitive =
      & $script:DockerExecutable inspect `
        --format '{{json .Config.Env}}' `
        $containerId 2>$null
    if ($LASTEXITCODE -ne 0) {
      continue
    }
    $created = [datetime]::Parse(
      $parts[4],
      [System.Globalization.CultureInfo]::InvariantCulture,
      [System.Globalization.DateTimeStyles]::RoundtripKind
    ).ToUniversalTime()
    $name = $parts[1].TrimStart('/')
    $isExactDump = (
      $parts[2] -ceq
        'public.ecr.aws/supabase/postgres:17.4.1.074' -and
      $parts[3] -ceq $script:ExpectedPostgresImageId -and
      $parts[5] -ceq 'true' -and
      -not $name.StartsWith(
        'supabase_',
        [System.StringComparison]::OrdinalIgnoreCase
      ) -and
      $created -ge $script:backupStartedUtc.AddMinutes(-1) -and
      $commandSensitive -cmatch '\bpg_dump(?:all)?\b' -and
      $environmentSensitive -cmatch [regex]::Escape(
        $script:ProjectRef
      )
    )
    if ($isExactDump) {
      $containerMatches.Add(
        [pscustomobject][ordered]@{
          id = $parts[0]
          short_id = $parts[0].Substring(0, 12)
          name = $name
          image = $parts[2]
          image_id = $parts[3]
          created_at_utc = $created.ToString('o')
        }
      )
    }
  }
  return @($containerMatches)
}

function Stop-GuardDumpContainersV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object[]]$Containers
  )

  $stopped = [System.Collections.Generic.List[object]]::new()
  foreach ($container in $Containers) {
    $current = @(Get-GuardDumpContainersV1) |
      Where-Object { $_.id -ceq $container.id }
    if ($current.Count -ne 1) {
      continue
    }
    & $script:DockerExecutable `
      stop `
      --time 20 `
      $container.id *> $null
    $stopExit = $LASTEXITCODE
    $stillRunning = @(
      & $script:DockerExecutable `
        ps `
        --filter "id=$($container.id)" `
        --format '{{.ID}}' 2>$null
    ).Count -gt 0
    $killExit = $null
    if ($stillRunning) {
      & $script:DockerExecutable kill $container.id *> $null
      $killExit = $LASTEXITCODE
      $stillRunning = @(
        & $script:DockerExecutable `
          ps `
          --filter "id=$($container.id)" `
          --format '{{.ID}}' 2>$null
      ).Count -gt 0
    }
    Assert-GuardConditionV1 `
      -Condition (-not $stillRunning) `
      -Message (
        "Exact one-shot dump container did not stop: " +
        $container.short_id
      )
    $stopped.Add(
      [pscustomobject][ordered]@{
        id = $container.id
        short_id = $container.short_id
        name = $container.name
        stop_exit_code = $stopExit
        kill_exit_code = $killExit
        stopped_at_utc = [datetime]::UtcNow.ToString('o')
      }
    )
  }
  return @($stopped)
}

$resolvedBackupRoot =
  [System.IO.Path]::GetFullPath($BackupArtifactRoot).TrimEnd('\', '/')
$resolvedGuardRoot =
  [System.IO.Path]::GetFullPath($ArtifactRoot).TrimEnd('\', '/')
$secureOpsRoot =
  [System.IO.Path]::GetFullPath('C:\secure-ops').TrimEnd('\', '/')
$backupStartedUtc = $BackupStartedAtUtc.ToUniversalTime()
$statusPath = Join-Path $resolvedGuardRoot 'guard-status.json'
$sourceSha256 = Get-GuardSha256V1 -Path $PSCommandPath
$sourceSeal = $null
$dockerSeal = $null
$lastSafeContainers = @()
$consecutiveInventoryErrors = 0

try {
  Assert-GuardConditionV1 `
    -Condition ($ProjectRef -ceq 'ycdxbpibncqcchqiihfz') `
    -Message 'Guard project ref is not exact.'
  Assert-GuardConditionV1 `
    -Condition ($BackupProcessId -gt 0) `
    -Message 'Guard backup process id is invalid.'
  Assert-GuardConditionV1 `
    -Condition (
      Test-Path -LiteralPath $resolvedBackupRoot -PathType Container
    ) `
    -Message 'Guard backup artifact root does not exist.'
  Assert-GuardNoReparseV1 -Path $resolvedBackupRoot
  $expectedGuardParent = Split-Path -Parent $resolvedGuardRoot
  $guardName = Split-Path -Leaf $resolvedGuardRoot
  Assert-GuardConditionV1 `
    -Condition (
      $expectedGuardParent -ceq $secureOpsRoot -and
      $guardName -cmatch
        '^binder-logical-backup-guard-\d{8}T\d{6}Z$'
    ) `
    -Message 'Guard root is not an exact secure-ops child.'
  Assert-GuardConditionV1 `
    -Condition (-not (Test-Path -LiteralPath $resolvedGuardRoot)) `
    -Message 'Guard root must not already exist.'
  Assert-GuardNoReparseV1 -Path $resolvedGuardRoot
  [void][System.IO.Directory]::CreateDirectory($resolvedGuardRoot)
  Assert-GuardNoReparseV1 -Path $resolvedGuardRoot
  Assert-GuardConditionV1 `
    -Condition (
      @(Get-ChildItem -LiteralPath $resolvedGuardRoot -Force).Count -eq 0
    ) `
    -Message 'New guard root was not empty.'
  Protect-GuardRootV1 -Path $resolvedGuardRoot

  Assert-GuardNoReparseV1 -Path $PSCommandPath
  $sourceSeal = [System.IO.File]::Open(
    $PSCommandPath,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::Read
  )
  Assert-GuardConditionV1 `
    -Condition (
      (Get-GuardSha256V1 -Path $PSCommandPath) -ceq
        $sourceSha256
    ) `
    -Message 'Guard source changed while sealing.'
  Assert-GuardConditionV1 `
    -Condition (
      Test-Path -LiteralPath $DockerExecutable -PathType Leaf
    ) `
    -Message 'Pinned Docker executable is missing.'
  Assert-GuardNoReparseV1 -Path $DockerExecutable
  Assert-GuardConditionV1 `
    -Condition (
      (Get-GuardSha256V1 -Path $DockerExecutable) -ceq
        $ExpectedDockerSha256
    ) `
    -Message 'Pinned Docker executable hash changed.'
  $dockerSeal = [System.IO.File]::Open(
    $DockerExecutable,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::Read
  )
  Assert-GuardConditionV1 `
    -Condition (
      (Get-GuardSha256V1 -Path $DockerExecutable) -ceq
        $ExpectedDockerSha256
    ) `
    -Message 'Pinned Docker executable changed while sealing.'
  Assert-GuardConditionV1 `
    -Condition ($GuardStopThresholdBytes -ge 96636764160) `
    -Message 'Guard stop threshold may not be below 90 GiB.'

  while ($true) {
    $now = [datetime]::UtcNow
    $freeBytes = [long](Get-PSDrive -Name C).Free
    $backupProcess =
      Get-Process -Id $BackupProcessId -ErrorAction SilentlyContinue
    $backupStatus = Get-GuardBackupStatusV1
    $inventoryError = ''
    try {
      $containers = @(Get-GuardDumpContainersV1)
      $lastSafeContainers = $containers
      $consecutiveInventoryErrors = 0
    } catch {
      $containers = @($lastSafeContainers)
      $consecutiveInventoryErrors += 1
      $inventoryError = $_.Exception.Message
    }

    $trigger = ''
    if ($freeBytes -le $GuardStopThresholdBytes) {
      $trigger = 'free_space_threshold'
    } elseif ($null -eq $backupProcess) {
      if ($backupStatus.status -ceq 'complete_candidate') {
        if ($containers.Count -gt 0) {
          $trigger = 'orphan_after_completion'
        } else {
          Write-GuardAtomicJsonV1 `
            -Path $statusPath `
            -Value ([pscustomobject][ordered]@{
              schema_version = 1
              status = 'complete'
              checked_at_utc = $now.ToString('o')
              backup_status = $backupStatus.status
              backup_step = $backupStatus.step
              free_bytes = $freeBytes
              threshold_bytes = $GuardStopThresholdBytes
              exact_dump_container_count = 0
              source_sha256 = $sourceSha256
              docker_sha256 = $ExpectedDockerSha256
              postgres_image_id = $ExpectedPostgresImageId
            })
          exit 0
        }
      } else {
        $trigger = 'backup_process_not_running'
      }
    }

    if (-not [string]::IsNullOrWhiteSpace($trigger)) {
      $stopped = @(Stop-GuardDumpContainersV1 -Containers $containers)
      Write-GuardAtomicJsonV1 `
        -Path (
          Join-Path $resolvedGuardRoot 'GUARD-INCIDENT.json'
        ) `
        -Value ([pscustomobject][ordered]@{
          schema_version = 1
          status = 'guard_stop'
          trigger = $trigger
          triggered_at_utc = $now.ToString('o')
          backup_status = $backupStatus.status
          backup_step = $backupStatus.step
          free_bytes = $freeBytes
          threshold_bytes = $GuardStopThresholdBytes
          discovered_exact_dump_containers = $containers
          stopped_exact_dump_containers = $stopped
          inventory_error = $inventoryError
          source_sha256 = $sourceSha256
          docker_sha256 = $ExpectedDockerSha256
          postgres_image_id = $ExpectedPostgresImageId
        })
      Write-GuardAtomicJsonV1 `
        -Path $statusPath `
        -Value ([pscustomobject][ordered]@{
          schema_version = 1
          status = 'guard_stop'
          trigger = $trigger
          checked_at_utc = $now.ToString('o')
          stopped_container_count = $stopped.Count
          free_bytes = $freeBytes
        })
      exit 2
    }

    Write-GuardAtomicJsonV1 `
      -Path $statusPath `
      -Value ([pscustomobject][ordered]@{
        schema_version = 1
        status = 'watching'
        checked_at_utc = $now.ToString('o')
        backup_status = $backupStatus.status
        backup_step = $backupStatus.step
        backup_process_alive = $null -ne $backupProcess
        free_bytes = $freeBytes
        threshold_bytes = $GuardStopThresholdBytes
        exact_dump_container_count = $containers.Count
        exact_dump_containers = $containers
        consecutive_inventory_errors = $consecutiveInventoryErrors
        inventory_error = $inventoryError
        source_sha256 = $sourceSha256
        docker_sha256 = $ExpectedDockerSha256
        postgres_image_id = $ExpectedPostgresImageId
      })
    Start-Sleep -Seconds 15
  }
} catch {
  if (Test-Path -LiteralPath $resolvedGuardRoot -PathType Container) {
    try {
      Write-GuardAtomicJsonV1 `
        -Path $statusPath `
        -Value ([pscustomobject][ordered]@{
          schema_version = 1
          status = 'failed'
          checked_at_utc = [datetime]::UtcNow.ToString('o')
          reason = $_.Exception.Message
          source_sha256 = $sourceSha256
        })
    } catch {
    }
  }
  Write-Error $_.Exception.Message
  exit 1
} finally {
  if ($null -ne $dockerSeal) {
    $dockerSeal.Dispose()
  }
  if ($null -ne $sourceSeal) {
    $sourceSeal.Dispose()
  }
}
