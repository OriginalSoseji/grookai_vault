#requires -Version 7.4

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot,

  [Parameter(Mandatory = $true)]
  [string]$ArtifactRoot,

  [string]$ProjectRef = 'ycdxbpibncqcchqiihfz',

  [string]$SupabaseExecutable =
    'C:\Users\ccabr\scoop\apps\supabase\2.90.0\supabase.exe',

  [string]$ExpectedSupabaseSha256 =
    '31c2a25bd590a36ad803a7c669cf76a62eac3cd5aa7112eeb2e1c5f308c8b39c',

  [string]$SevenZipExecutable =
    'C:\Users\ccabr\scoop\apps\7zip\25.01\7z.exe',

  [string]$ExpectedSevenZipSha256 =
    '4cd7d776c686427226a151789d2d61f0b2ed2c392148cc4e69c0238362fafecf',

  [long]$MinimumFreeBytes = 85899345920
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Assert-BackupConditionV1 {
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

function Get-BackupSha256V1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return (
    Get-FileHash -LiteralPath $Path -Algorithm SHA256
  ).Hash.ToLowerInvariant()
}

function ConvertTo-BackupSafeTextV1 {
  param(
    [AllowEmptyString()]
    [string]$Text
  )

  if ($null -eq $Text) {
    return ''
  }

  return (
    $Text `
      -replace '(?i)(postgres(?:ql)?://[^:\s]+:)[^@\s]+@',
        '$1<REDACTED>@' `
      -replace '(?i)(PGPASSWORD=)[^\r\n]+',
        '$1<REDACTED>' `
      -replace '(?i)(password=)[^\s]+',
        '$1<REDACTED>' `
      -replace '(?i)(sbp_[A-Za-z0-9_-]+)',
        '<REDACTED_TOKEN>'
  )
}

function Write-BackupAtomicTextV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Value
  )

  $directory = Split-Path -Parent $Path
  Assert-BackupConditionV1 `
    -Condition (Test-Path -LiteralPath $directory -PathType Container) `
    -Message "Output directory does not exist: $directory"
  $temporaryPath = Join-Path $directory (
    '.' + [System.IO.Path]::GetFileName($Path) + '.' +
    [guid]::NewGuid().ToString('N') + '.tmp'
  )
  $encoding = [System.Text.UTF8Encoding]::new($false)
  try {
    [System.IO.File]::WriteAllText($temporaryPath, $Value, $encoding)
    Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
  } finally {
    if (Test-Path -LiteralPath $temporaryPath) {
      Remove-Item -LiteralPath $temporaryPath -Force
    }
  }
}

function Write-BackupAtomicJsonV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [object]$Value
  )

  Write-BackupAtomicTextV1 `
    -Path $Path `
    -Value (($Value | ConvertTo-Json -Depth 20) + "`n")
}

function Protect-BackupArtifactAclV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  $currentSid = $identity.User
  Assert-BackupConditionV1 `
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
}

function Assert-BackupArtifactAclV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  $currentSid = $identity.User
  Assert-BackupConditionV1 `
    -Condition ($null -ne $currentSid) `
    -Message 'Current Windows SID is unavailable.'
  $acl = Get-Acl -LiteralPath $Path
  Assert-BackupConditionV1 `
    -Condition $acl.AreAccessRulesProtected `
    -Message 'Backup artifact ACL inheritance is not disabled.'
  $ownerSid = (
    [System.Security.Principal.NTAccount]$acl.Owner
  ).Translate(
    [System.Security.Principal.SecurityIdentifier]
  ).Value
  Assert-BackupConditionV1 `
    -Condition ($ownerSid -ceq $currentSid.Value) `
    -Message 'Backup artifact owner is not the current operator.'

  $inheritance = (
    [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
    [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
  )
  $propagation =
    [System.Security.AccessControl.PropagationFlags]::None
  $allow = [System.Security.AccessControl.AccessControlType]::Allow
  $rules = @($acl.Access)
  Assert-BackupConditionV1 `
    -Condition ($rules.Count -eq 3) `
    -Message 'Backup artifact ACL does not contain exactly three rules.'
  Assert-BackupConditionV1 `
    -Condition (
      @(
        $rules |
          Where-Object {
            $_.AccessControlType -ne $allow -or
            $_.IsInherited -or
            $_.InheritanceFlags -ne $inheritance -or
            $_.PropagationFlags -ne $propagation -or
            (
              $_.FileSystemRights -band
              [System.Security.AccessControl.FileSystemRights]::FullControl
            ) -ne
              [System.Security.AccessControl.FileSystemRights]::FullControl
          }
      ).Count -eq 0
    ) `
    -Message 'Backup artifact ACL contains an unsafe rule.'
  $actualSids = @(
    $rules |
      ForEach-Object {
        $_.IdentityReference.Translate(
          [System.Security.Principal.SecurityIdentifier]
        ).Value
      } |
      Sort-Object -Unique
  )
  $expectedSids = @(
    $currentSid.Value,
    'S-1-5-18',
    'S-1-5-32-544'
  ) | Sort-Object -Unique
  Assert-BackupConditionV1 `
    -Condition (
      @(Compare-Object $expectedSids $actualSids).Count -eq 0
    ) `
    -Message 'Backup artifact ACL contains an unexpected identity.'
}

function Assert-BackupPathHasNoReparsePointV1 {
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
    Assert-BackupConditionV1 `
      -Condition (
        -not $item.Attributes.HasFlag(
          [System.IO.FileAttributes]::ReparsePoint
        )
      ) `
      -Message "Backup path contains a reparse point: $cursor"
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

function Get-BackupFileEdgeTextV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [ValidateSet('head', 'tail')]
    [string]$Edge,

    [int]$MaximumBytes = 8388608
  )

  $stream = [System.IO.File]::Open(
    $Path,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::Read
  )
  try {
    $count = [int][Math]::Min(
      [long]$MaximumBytes,
      [long]$stream.Length
    )
    if ($Edge -ceq 'tail') {
      [void]$stream.Seek(-$count, [System.IO.SeekOrigin]::End)
    }
    $buffer = [byte[]]::new($count)
    $offset = 0
    while ($offset -lt $count) {
      $read = $stream.Read($buffer, $offset, $count - $offset)
      if ($read -eq 0) {
        break
      }
      $offset += $read
    }
    return [System.Text.Encoding]::UTF8.GetString(
      $buffer,
      0,
      $offset
    )
  } finally {
    $stream.Dispose()
  }
}

$resolvedRepoRoot =
  [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/')
$resolvedArtifactRoot =
  [System.IO.Path]::GetFullPath($ArtifactRoot).TrimEnd('\', '/')
$secureOpsRoot =
  [System.IO.Path]::GetFullPath('C:\secure-ops').TrimEnd('\', '/')
$statusPath = Join-Path $resolvedArtifactRoot 'status.json'
$logPath = Join-Path $resolvedArtifactRoot 'backup.log'
$scriptSha256 = Get-BackupSha256V1 -Path $PSCommandPath
$operatorIdentity =
  [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$startedAtUtc = [datetime]::UtcNow
$currentStep = 'bootstrap'
$componentResults = [System.Collections.Generic.List[object]]::new()
$sourceSeal = $null
$executableSeal = $null
$sevenZipSeal = $null
$bindingSeals = [System.Collections.Generic.List[object]]::new()
$bindingHashes = [ordered]@{}
$sourceRepoHead = ''

function Write-BackupStatusV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Status,

    [AllowEmptyString()]
    [string]$Reason = ''
  )

  $freeBytes = (Get-PSDrive -Name C).Free
  $statusValue = [pscustomobject][ordered]@{
    schema_version = 1
    backup_kind = 'supabase_logical_dump_candidate'
    project_ref = $ProjectRef
    status = $Status
    step = $script:currentStep
    started_at_utc = $script:startedAtUtc.ToString('o')
    updated_at_utc = [datetime]::UtcNow.ToString('o')
    process_id = $PID
    artifact_root = $script:resolvedArtifactRoot
    source_sha256 = $script:scriptSha256
    reason = $Reason
    c_drive_free_bytes = [long]$freeBytes
    completed_components = @($script:componentResults)
  }
  Write-BackupAtomicJsonV1 -Path $script:statusPath -Value $statusValue
}

function Write-BackupLogV1 {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Text
  )

  $safeText = ConvertTo-BackupSafeTextV1 -Text $Text
  $line = (
    [datetime]::UtcNow.ToString('o') + ' ' + $safeText + "`n"
  )
  [System.IO.File]::AppendAllText(
    $script:logPath,
    $line,
    [System.Text.UTF8Encoding]::new($false)
  )
}

function Invoke-BackupDumpStepV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$OutputFileName,

    [Parameter(Mandatory = $true)]
    [AllowEmptyCollection()]
    [string[]]$ModeArguments
  )

  $script:currentStep = $Name
  Write-BackupStatusV1 -Status 'running'
  $archiveFileName = "$OutputFileName.7z"
  $outputPath =
    Join-Path $script:resolvedArtifactRoot $archiveFileName
  Assert-BackupConditionV1 `
    -Condition (-not (Test-Path -LiteralPath $outputPath)) `
    -Message "Backup output already exists: $outputPath"
  $freeBefore = [long](Get-PSDrive -Name C).Free
  Assert-BackupConditionV1 `
    -Condition ($freeBefore -ge $script:MinimumFreeBytes) `
    -Message (
      "Free-space floor was reached before $Name. " +
      "Required: $($script:MinimumFreeBytes); available: $freeBefore."
    )
  $stepStartedAtUtc = [datetime]::UtcNow
  Write-BackupLogV1 -Text "Starting $Name."
  $arguments = @(
    'db',
    'dump',
    '--linked'
  ) + $ModeArguments + @(
    '--agent',
    'no',
    '--workdir',
    $script:resolvedRepoRoot,
    '--yes'
  )
  $supabaseProcess = $null
  $archiveProcess = $null
  $supabaseErrorTask = $null
  $archiveOutputTask = $null
  $archiveErrorTask = $null
  $sourceStream = $null
  $archiveInput = $null
  $incrementalHash =
    [System.Security.Cryptography.IncrementalHash]::CreateHash(
      [System.Security.Cryptography.HashAlgorithmName]::SHA256
    )
  $edgeByteLimit = 8388608
  $headStream = [System.IO.MemoryStream]::new($edgeByteLimit)
  $tailBuffer = [byte[]]::new($edgeByteLimit)
  $tailCount = 0
  $tailWriteOffset = 0
  $rawBytes = [long]0
  $lastSpaceCheckBytes = [long]0
  $supabaseError = ''
  $archiveOutput = ''
  $archiveError = ''
  try {
    $archiveInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $archiveInfo.FileName = $script:SevenZipExecutable
    $archiveInfo.UseShellExecute = $false
    $archiveInfo.RedirectStandardInput = $true
    $archiveInfo.RedirectStandardOutput = $true
    $archiveInfo.RedirectStandardError = $true
    $archiveInfo.CreateNoWindow = $true
    foreach ($argument in @(
      'a',
      '-t7z',
      '-mx=1',
      '-mmt=on',
      '-bd',
      '-bb0',
      '-y',
      $outputPath,
      "-si$OutputFileName"
    )) {
      [void]$archiveInfo.ArgumentList.Add($argument)
    }
    $archiveProcess = [System.Diagnostics.Process]::new()
    $archiveProcess.StartInfo = $archiveInfo
    Assert-BackupConditionV1 `
      -Condition $archiveProcess.Start() `
      -Message "Could not start the archive process for $Name."
    $archiveOutputTask =
      $archiveProcess.StandardOutput.ReadToEndAsync()
    $archiveErrorTask =
      $archiveProcess.StandardError.ReadToEndAsync()
    $archiveInput = $archiveProcess.StandardInput.BaseStream

    $supabaseInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $supabaseInfo.FileName = $script:SupabaseExecutable
    $supabaseInfo.UseShellExecute = $false
    $supabaseInfo.RedirectStandardOutput = $true
    $supabaseInfo.RedirectStandardError = $true
    $supabaseInfo.CreateNoWindow = $true
    foreach ($argument in $arguments) {
      [void]$supabaseInfo.ArgumentList.Add($argument)
    }
    $supabaseProcess = [System.Diagnostics.Process]::new()
    $supabaseProcess.StartInfo = $supabaseInfo
    Assert-BackupConditionV1 `
      -Condition $supabaseProcess.Start() `
      -Message "Could not start Supabase CLI for $Name."
    $supabaseErrorTask =
      $supabaseProcess.StandardError.ReadToEndAsync()
    $sourceStream = $supabaseProcess.StandardOutput.BaseStream

    $buffer = [byte[]]::new(1048576)
    while (($read = $sourceStream.Read(
      $buffer,
      0,
      $buffer.Length
    )) -gt 0) {
      $incrementalHash.AppendData($buffer, 0, $read)
      $archiveInput.Write($buffer, 0, $read)
      if ($headStream.Length -lt $edgeByteLimit) {
        $headRemaining =
          $edgeByteLimit - [int]$headStream.Length
        $headWrite = [Math]::Min($headRemaining, $read)
        $headStream.Write($buffer, 0, $headWrite)
      }
      if ($read -ge $edgeByteLimit) {
        [System.Array]::Copy(
          $buffer,
          $read - $edgeByteLimit,
          $tailBuffer,
          0,
          $edgeByteLimit
        )
        $tailCount = $edgeByteLimit
        $tailWriteOffset = 0
      } else {
        $firstTailWrite = [Math]::Min(
          $read,
          $edgeByteLimit - $tailWriteOffset
        )
        [System.Array]::Copy(
          $buffer,
          0,
          $tailBuffer,
          $tailWriteOffset,
          $firstTailWrite
        )
        $remainingTailWrite = $read - $firstTailWrite
        if ($remainingTailWrite -gt 0) {
          [System.Array]::Copy(
            $buffer,
            $firstTailWrite,
            $tailBuffer,
            0,
            $remainingTailWrite
          )
        }
        $tailWriteOffset =
          ($tailWriteOffset + $read) % $edgeByteLimit
        $tailCount = [Math]::Min(
          $edgeByteLimit,
          $tailCount + $read
        )
      }
      $rawBytes += [long]$read
      if (
        ($rawBytes - $lastSpaceCheckBytes) -ge 67108864
      ) {
        $freeNow = [long](Get-PSDrive -Name C).Free
        Assert-BackupConditionV1 `
          -Condition ($freeNow -ge $script:MinimumFreeBytes) `
          -Message (
            "Free-space floor was reached during $Name. " +
            "Required: $($script:MinimumFreeBytes); " +
            "available: $freeNow."
          )
        $lastSpaceCheckBytes = $rawBytes
      }
    }
    $archiveInput.Flush()
    $archiveInput.Close()
    $archiveInput = $null
    $sourceStream.Close()
    $sourceStream = $null
    $supabaseProcess.WaitForExit()
    $archiveProcess.WaitForExit()
    $supabaseError =
      $supabaseErrorTask.GetAwaiter().GetResult()
    $archiveOutput =
      $archiveOutputTask.GetAwaiter().GetResult()
    $archiveError =
      $archiveErrorTask.GetAwaiter().GetResult()
    Write-BackupAtomicTextV1 `
      -Path (
        Join-Path $script:resolvedArtifactRoot "$Name.output.txt"
      ) `
      -Value (
        ConvertTo-BackupSafeTextV1 -Text (
          "SUPABASE STDERR`n$supabaseError`n" +
          "7-ZIP STDOUT`n$archiveOutput`n" +
          "7-ZIP STDERR`n$archiveError`n"
        )
      )
    Assert-BackupConditionV1 `
      -Condition ($supabaseProcess.ExitCode -eq 0) `
      -Message (
        "$Name Supabase dump failed with exit code " +
        "$($supabaseProcess.ExitCode)."
      )
    Assert-BackupConditionV1 `
      -Condition ($archiveProcess.ExitCode -eq 0) `
      -Message (
        "$Name archive failed with exit code " +
        "$($archiveProcess.ExitCode)."
      )
  } catch {
    foreach ($process in @($supabaseProcess, $archiveProcess)) {
      if ($null -ne $process) {
        try {
          if (-not $process.HasExited) {
            $process.Kill($true)
            $process.WaitForExit()
          }
        } catch {
        }
      }
    }
    try {
      if ($null -ne $supabaseErrorTask) {
        $supabaseError =
          $supabaseErrorTask.GetAwaiter().GetResult()
      }
      if ($null -ne $archiveOutputTask) {
        $archiveOutput =
          $archiveOutputTask.GetAwaiter().GetResult()
      }
      if ($null -ne $archiveErrorTask) {
        $archiveError =
          $archiveErrorTask.GetAwaiter().GetResult()
      }
      Write-BackupAtomicTextV1 `
        -Path (
          Join-Path $script:resolvedArtifactRoot "$Name.output.txt"
        ) `
        -Value (
          ConvertTo-BackupSafeTextV1 -Text (
            "SUPABASE STDERR`n$supabaseError`n" +
            "7-ZIP STDOUT`n$archiveOutput`n" +
            "7-ZIP STDERR`n$archiveError`n"
          )
        )
    } catch {
    }
    throw
  } finally {
    if ($null -ne $sourceStream) {
      $sourceStream.Dispose()
    }
    if ($null -ne $archiveInput) {
      $archiveInput.Dispose()
    }
    if ($null -ne $supabaseProcess) {
      $supabaseProcess.Dispose()
    }
    if ($null -ne $archiveProcess) {
      $archiveProcess.Dispose()
    }
  }

  Assert-BackupConditionV1 `
    -Condition (Test-Path -LiteralPath $outputPath -PathType Leaf) `
    -Message "$Name did not create its archive."
  $item = Get-Item -LiteralPath $outputPath
  Assert-BackupConditionV1 `
    -Condition ($item.Length -gt 0 -and $rawBytes -gt 0) `
    -Message "$Name created an empty output."
  $testOutput = @(
    & $script:SevenZipExecutable `
      t -bd -bb0 $outputPath 2>&1
  )
  $testExitCode = $LASTEXITCODE
  Write-BackupAtomicTextV1 `
    -Path (
      Join-Path $script:resolvedArtifactRoot "$Name.archive-test.txt"
    ) `
    -Value (
      (
        ConvertTo-BackupSafeTextV1 -Text (
          $testOutput -join "`n"
        )
      ) + "`n"
    )
  Assert-BackupConditionV1 `
    -Condition ($testExitCode -eq 0) `
    -Message "$Name archive integrity test failed."
  $rawSha256 = [Convert]::ToHexString(
    $incrementalHash.GetHashAndReset()
  ).ToLowerInvariant()
  $headText = [System.Text.Encoding]::UTF8.GetString(
    $headStream.ToArray()
  )
  $tailBytes = [byte[]]::new($tailCount)
  if ($tailCount -lt $edgeByteLimit) {
    [System.Array]::Copy(
      $tailBuffer,
      0,
      $tailBytes,
      0,
      $tailCount
    )
  } else {
    $tailFirstCount = $edgeByteLimit - $tailWriteOffset
    [System.Array]::Copy(
      $tailBuffer,
      $tailWriteOffset,
      $tailBytes,
      0,
      $tailFirstCount
    )
    if ($tailWriteOffset -gt 0) {
      [System.Array]::Copy(
        $tailBuffer,
        0,
        $tailBytes,
        $tailFirstCount,
        $tailWriteOffset
      )
    }
  }
  $tailText = [System.Text.Encoding]::UTF8.GetString($tailBytes)
  $result = [pscustomobject][ordered]@{
    name = $Name
    file = $archiveFileName
    archive_entry = $OutputFileName
    started_at_utc = $stepStartedAtUtc.ToString('o')
    completed_at_utc = [datetime]::UtcNow.ToString('o')
    raw_bytes = $rawBytes
    raw_sha256 = $rawSha256
    archive_bytes = [long]$item.Length
    archive_sha256 = Get-BackupSha256V1 -Path $outputPath
    archive_integrity_test_exit_code = $testExitCode
    compression_ratio = [Math]::Round(
      ([double]$item.Length / [double]$rawBytes),
      6
    )
    structure = [pscustomobject][ordered]@{
      head_has_role_statement =
        $headText -cmatch '(?m)^(CREATE|ALTER|GRANT) '
      head_has_create_statement =
        $headText -cmatch
          '(?m)^CREATE (SCHEMA|TABLE|TYPE|FUNCTION|EXTENSION) '
      head_has_replica_mode =
        $headText -cmatch
          '(?m)^SET session_replication_role = replica;$'
      edge_has_copy_or_insert = (
        $headText -cmatch '(?m)^(COPY|INSERT INTO) ' -or
        $tailText -cmatch '(?m)^(COPY|INSERT INTO) '
      )
      tail_has_reset =
        $tailText -cmatch '(?m)^RESET ALL;$'
    }
    supabase_exit_code = 0
    archive_exit_code = 0
  }
  $incrementalHash.Dispose()
  $headStream.Dispose()
  $script:componentResults.Add($result)
  Write-BackupLogV1 `
    -Text (
      "Completed ${Name}: $rawBytes raw bytes to " +
      "$($item.Length) archive bytes; raw SHA-256 " +
      "$rawSha256."
    )
  Write-BackupStatusV1 -Status 'running'
  return $result
}

try {
  Assert-BackupPathHasNoReparsePointV1 -Path $PSCommandPath
  $sourceSeal = [System.IO.File]::Open(
    $PSCommandPath,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::Read
  )
  Assert-BackupConditionV1 `
    -Condition (
      (Get-BackupSha256V1 -Path $PSCommandPath) -ceq
        $scriptSha256
    ) `
    -Message 'Backup source changed while it was sealed.'
  Assert-BackupConditionV1 `
    -Condition (
      $ProjectRef -ceq 'ycdxbpibncqcchqiihfz'
    ) `
    -Message 'Production project ref is not exact.'
  Assert-BackupConditionV1 `
    -Condition (
      Test-Path -LiteralPath $resolvedRepoRoot -PathType Container
    ) `
    -Message 'Repository root does not exist.'
  Assert-BackupPathHasNoReparsePointV1 -Path $resolvedRepoRoot
  $bindingPaths = [ordered]@{
    config_toml =
      Join-Path $resolvedRepoRoot 'supabase\config.toml'
    project_ref =
      Join-Path $resolvedRepoRoot 'supabase\.temp\project-ref'
    pooler_url =
      Join-Path $resolvedRepoRoot 'supabase\.temp\pooler-url'
    postgres_version =
      Join-Path $resolvedRepoRoot 'supabase\.temp\postgres-version'
    linked_project =
      Join-Path $resolvedRepoRoot 'supabase\.temp\linked-project.json'
  }
  foreach ($bindingName in $bindingPaths.Keys) {
    $bindingPath = [string]$bindingPaths[$bindingName]
    Assert-BackupConditionV1 `
      -Condition (
        Test-Path -LiteralPath $bindingPath -PathType Leaf
      ) `
      -Message "Required binding file is missing: $bindingName."
    Assert-BackupPathHasNoReparsePointV1 -Path $bindingPath
    $bindingHash = Get-BackupSha256V1 -Path $bindingPath
    $bindingHashes[$bindingName] = $bindingHash
    $bindingSeal = [System.IO.File]::Open(
      $bindingPath,
      [System.IO.FileMode]::Open,
      [System.IO.FileAccess]::Read,
      [System.IO.FileShare]::Read
    )
    $bindingSeals.Add($bindingSeal)
    Assert-BackupConditionV1 `
      -Condition (
        (Get-BackupSha256V1 -Path $bindingPath) -ceq
          $bindingHash
      ) `
      -Message "Binding file changed while sealing: $bindingName."
  }
  $configText =
    Get-Content -Raw -LiteralPath $bindingPaths.config_toml
  Assert-BackupConditionV1 `
    -Condition (
      $configText -cmatch (
        '(?m)^project_id = "' +
        [regex]::Escape($ProjectRef) +
        '"$'
      )
    ) `
    -Message 'Supabase configuration project ref is not exact.'
  Assert-BackupConditionV1 `
    -Condition (
      (
        Get-Content -Raw -LiteralPath $bindingPaths.project_ref
      ).Trim() -ceq
        $ProjectRef
    ) `
    -Message 'Linked Supabase project ref is not exact.'
  Assert-BackupConditionV1 `
    -Condition (
      (
        Get-Content -Raw -LiteralPath $bindingPaths.pooler_url
      ) -cmatch ([regex]::Escape($ProjectRef))
    ) `
    -Message 'Linked pooler target does not contain the exact project ref.'
  Assert-BackupConditionV1 `
    -Condition (
      (
        Get-Content -Raw -LiteralPath $bindingPaths.postgres_version
      ).Trim() -cmatch '^17\.4(?:\.|$)'
    ) `
    -Message 'Linked Postgres version is not the reviewed 17.4 line.'
  $sourceRepoHead = (
    & git -C $resolvedRepoRoot rev-parse HEAD 2>$null
  ).Trim()
  Assert-BackupConditionV1 `
    -Condition (
      $LASTEXITCODE -eq 0 -and
      $sourceRepoHead -cmatch '^[0-9a-f]{40}$'
    ) `
    -Message 'Repository HEAD could not be sealed.'
  Assert-BackupConditionV1 `
    -Condition (
      Test-Path -LiteralPath $SupabaseExecutable -PathType Leaf
    ) `
    -Message 'Pinned Supabase CLI is missing.'
  Assert-BackupPathHasNoReparsePointV1 -Path $SupabaseExecutable
  Assert-BackupConditionV1 `
    -Condition (
      (Get-BackupSha256V1 -Path $SupabaseExecutable) -ceq
        $ExpectedSupabaseSha256
    ) `
    -Message 'Pinned Supabase CLI hash changed.'
  $executableSeal = [System.IO.File]::Open(
    $SupabaseExecutable,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::Read
  )
  Assert-BackupConditionV1 `
    -Condition (
      (Get-BackupSha256V1 -Path $SupabaseExecutable) -ceq
        $ExpectedSupabaseSha256
    ) `
    -Message 'Pinned Supabase CLI changed while it was sealed.'
  Assert-BackupConditionV1 `
    -Condition (
      Test-Path -LiteralPath $SevenZipExecutable -PathType Leaf
    ) `
    -Message 'Pinned 7-Zip executable is missing.'
  Assert-BackupPathHasNoReparsePointV1 -Path $SevenZipExecutable
  Assert-BackupConditionV1 `
    -Condition (
      (Get-BackupSha256V1 -Path $SevenZipExecutable) -ceq
        $ExpectedSevenZipSha256
    ) `
    -Message 'Pinned 7-Zip hash changed.'
  $sevenZipSeal = [System.IO.File]::Open(
    $SevenZipExecutable,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::Read
  )
  Assert-BackupConditionV1 `
    -Condition (
      (Get-BackupSha256V1 -Path $SevenZipExecutable) -ceq
        $ExpectedSevenZipSha256
    ) `
    -Message 'Pinned 7-Zip changed while it was sealed.'
  Assert-BackupConditionV1 `
    -Condition ($MinimumFreeBytes -ge 85899345920) `
    -Message 'Minimum free-space floor may not be below 80 GiB.'
  $initialFreeBytes = [long](Get-PSDrive -Name C).Free
  Assert-BackupConditionV1 `
    -Condition ($initialFreeBytes -ge 257698037760) `
    -Message (
      'At least 240 GiB must be free before starting the compressed dump.'
    )

  $expectedParent = Split-Path -Parent $resolvedArtifactRoot
  $artifactName = Split-Path -Leaf $resolvedArtifactRoot
  Assert-BackupConditionV1 `
    -Condition (
      $expectedParent -ceq $secureOpsRoot -and
      $artifactName -cmatch
        '^binder-logical-backup-\d{8}T\d{6}Z$'
    ) `
    -Message (
      'ArtifactRoot must be a timestamped direct child of C:\secure-ops.'
    )
  Assert-BackupConditionV1 `
    -Condition (-not (Test-Path -LiteralPath $resolvedArtifactRoot)) `
    -Message 'ArtifactRoot must not already exist.'
  Assert-BackupArtifactAclV1 -Path $secureOpsRoot
  Assert-BackupPathHasNoReparsePointV1 -Path $resolvedArtifactRoot
  [void][System.IO.Directory]::CreateDirectory($resolvedArtifactRoot)
  Assert-BackupPathHasNoReparsePointV1 -Path $resolvedArtifactRoot
  Assert-BackupConditionV1 `
    -Condition (
      @(Get-ChildItem -LiteralPath $resolvedArtifactRoot -Force).Count -eq
        0
    ) `
    -Message 'New backup artifact root was not empty.'
  Protect-BackupArtifactAclV1 -Path $resolvedArtifactRoot
  Assert-BackupArtifactAclV1 -Path $resolvedArtifactRoot

  Write-BackupAtomicTextV1 `
    -Path $logPath `
    -Value ''
  Write-BackupLogV1 `
    -Text (
      "Backup bootstrap passed for $ProjectRef. " +
      'Application data, schemas, feature flags, and migrations will remain ' +
      'unchanged. Supabase CLI creates short-lived login roles through the ' +
      'Management API for linked access; those roles are allowed to expire.'
    )
  Write-BackupStatusV1 -Status 'running'

  $rolesBefore = Invoke-BackupDumpStepV1 `
    -Name 'roles-before' `
    -OutputFileName 'roles.sql' `
    -ModeArguments @('--role-only')
  $schemaBefore = Invoke-BackupDumpStepV1 `
    -Name 'schema-before' `
    -OutputFileName 'schema.sql' `
    -ModeArguments @()
  $historySchemaBefore = Invoke-BackupDumpStepV1 `
    -Name 'history-schema-before' `
    -OutputFileName 'history-schema.sql' `
    -ModeArguments @(
      '--schema',
      'supabase_migrations'
    )
  $historyDataBefore = Invoke-BackupDumpStepV1 `
    -Name 'history-data-before' `
    -OutputFileName 'history-data.sql' `
    -ModeArguments @(
      '--data-only',
      '--use-copy',
      '--schema',
      'supabase_migrations'
    )
  $managedSchemaBefore = Invoke-BackupDumpStepV1 `
    -Name 'managed-schema-before' `
    -OutputFileName 'auth-storage-functions-schema.sql' `
    -ModeArguments @(
      '--schema',
      'auth,storage,supabase_functions'
    )
  $dataResult = Invoke-BackupDumpStepV1 `
    -Name 'data' `
    -OutputFileName 'data.sql' `
    -ModeArguments @(
      '--data-only',
      '--use-copy',
      '--exclude',
      'storage.buckets_vectors',
      '--exclude',
      'storage.vector_indexes'
    )
  $managedSchemaAfter = Invoke-BackupDumpStepV1 `
    -Name 'managed-schema-after' `
    -OutputFileName 'auth-storage-functions-schema-after.sql' `
    -ModeArguments @(
      '--schema',
      'auth,storage,supabase_functions'
    )
  $historyDataAfter = Invoke-BackupDumpStepV1 `
    -Name 'history-data-after' `
    -OutputFileName 'history-data-after.sql' `
    -ModeArguments @(
      '--data-only',
      '--use-copy',
      '--schema',
      'supabase_migrations'
    )
  $historySchemaAfter = Invoke-BackupDumpStepV1 `
    -Name 'history-schema-after' `
    -OutputFileName 'history-schema-after.sql' `
    -ModeArguments @(
      '--schema',
      'supabase_migrations'
    )
  $schemaAfter = Invoke-BackupDumpStepV1 `
    -Name 'schema-after' `
    -OutputFileName 'schema-after.sql' `
    -ModeArguments @()
  $rolesAfter = Invoke-BackupDumpStepV1 `
    -Name 'roles-after' `
    -OutputFileName 'roles-after.sql' `
    -ModeArguments @('--role-only')

  $currentStep = 'verification'
  Write-BackupStatusV1 -Status 'verifying'
  Assert-BackupConditionV1 `
    -Condition (
      $rolesBefore.raw_sha256 -ceq $rolesAfter.raw_sha256
    ) `
    -Message 'Role definitions changed while the logical backup ran.'
  Assert-BackupConditionV1 `
    -Condition (
      $schemaBefore.raw_sha256 -ceq $schemaAfter.raw_sha256
    ) `
    -Message 'Database schema changed while the logical backup ran.'
  Assert-BackupConditionV1 `
    -Condition (
      $historySchemaBefore.raw_sha256 -ceq
        $historySchemaAfter.raw_sha256
    ) `
    -Message 'Migration-history schema changed while the backup ran.'
  Assert-BackupConditionV1 `
    -Condition (
      $historyDataBefore.raw_sha256 -ceq
        $historyDataAfter.raw_sha256
    ) `
    -Message 'Migration-history data changed while the backup ran.'
  Assert-BackupConditionV1 `
    -Condition (
      $managedSchemaBefore.raw_sha256 -ceq
        $managedSchemaAfter.raw_sha256
    ) `
    -Message (
      'Auth, Storage, or Supabase Functions schema changed during backup.'
    )

  Assert-BackupConditionV1 `
    -Condition (
      $rolesBefore.structure.head_has_role_statement -or
      $rolesBefore.structure.tail_has_reset
    ) `
    -Message 'Role dump structure is not recognizable.'
  Assert-BackupConditionV1 `
    -Condition $schemaBefore.structure.head_has_create_statement `
    -Message 'Schema dump structure is not recognizable.'
  Assert-BackupConditionV1 `
    -Condition (
      $dataResult.structure.head_has_replica_mode -and
      $dataResult.structure.edge_has_copy_or_insert -and
      $dataResult.structure.tail_has_reset
    ) `
    -Message 'Data dump structure or completion marker is invalid.'
  Assert-BackupConditionV1 `
    -Condition (
      $historySchemaBefore.structure.head_has_create_statement
    ) `
    -Message 'Migration-history schema dump is not recognizable.'
  Assert-BackupConditionV1 `
    -Condition (
      $historyDataBefore.structure.head_has_replica_mode -and
      $historyDataBefore.structure.edge_has_copy_or_insert -and
      $historyDataBefore.structure.tail_has_reset
    ) `
    -Message 'Migration-history data dump is incomplete.'
  Assert-BackupConditionV1 `
    -Condition (
      $managedSchemaBefore.structure.head_has_create_statement
    ) `
    -Message 'Managed-schema recovery capture is not recognizable.'

  foreach ($bindingName in $bindingPaths.Keys) {
    Assert-BackupConditionV1 `
      -Condition (
        (Get-BackupSha256V1 -Path $bindingPaths[$bindingName]) -ceq
          $bindingHashes[$bindingName]
      ) `
      -Message "Sealed binding changed during backup: $bindingName."
  }
  Assert-BackupConditionV1 `
    -Condition (
      (Get-BackupSha256V1 -Path $SupabaseExecutable) -ceq
        $ExpectedSupabaseSha256
    ) `
    -Message 'Supabase CLI changed during backup.'
  Assert-BackupConditionV1 `
    -Condition (
      (Get-BackupSha256V1 -Path $SevenZipExecutable) -ceq
        $ExpectedSevenZipSha256
    ) `
    -Message '7-Zip changed during backup.'

  $restoreRunbook = @'
# Grookai Vault logical-backup qualification path

Project backup source: __PROJECT_REF__

This artifact is a complete Supabase-compatible logical database dump
candidate. It contains roles, application schema, data, migration-history
schema/data, and a before/after-stable reference capture of the managed Auth,
Storage, and Supabase Functions schemas. The main data dump excludes
`storage.buckets_vectors` and `storage.vector_indexes`, as required by the
current Supabase migration guide.

This candidate is not rollout restore evidence yet. Never restore it over the
live Grookai Vault project. It must first pass an isolated, same-version restore
rehearsal and operator review.

The host does not have `psql`; the pinned Supabase Postgres 17.4 Docker image
contains it. A safe rehearsal is:

1. Create a new, network-isolated Supabase recovery project using Postgres 17.4.
2. Enable the same non-default extensions and Database Webhooks.
3. Create a protected local `restore` directory and extract:

   7z x roles.sql.7z -orestore
   7z x schema.sql.7z -orestore
   7z x history-schema.sql.7z -orestore
   7z x history-data.sql.7z -orestore
   7z x data.sql.7z -orestore

4. Set `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`, and `PGPASSWORD` only in the
   current protected operator process. Do not put the password in a command
   line, file, log, or source tree.
5. Run the restore through the local version-matched image:

   docker run --rm -i `
     -e PGPASSWORD `
     -v "${PWD}\restore:/backup:ro" `
     public.ecr.aws/supabase/postgres:17.4.1.074 `
     psql --single-transaction --variable ON_ERROR_STOP=1 `
       --host "$env:PGHOST" --port "$env:PGPORT" `
       --username "$env:PGUSER" --dbname "$env:PGDATABASE" `
       --file /backup/roles.sql `
       --file /backup/schema.sql `
       --file /backup/history-schema.sql `
       --command "SET session_replication_role = replica" `
       --file /backup/data.sql `
       --file /backup/history-data.sql

6. Treat `auth-storage-functions-schema.sql.7z` as a reference capture. Compare
   it with the clean managed schemas and explicitly reapply only Grookai's
   custom policies, triggers, functions, and grants.
7. Re-enable required Realtime publications and reset passwords for custom
   LOGIN roles.
8. Validate Auth data, migration history, RLS, policies, functions, triggers,
   table/row inventories, critical aggregates, and application reads.
9. Only after all checks pass may a separate reviewed
   `verified_logical_backup` evidence file be created.

Supabase Storage object bytes, Edge Function source/deployments, project
secrets, Auth provider settings, domains, and the Vault encryption root are not
part of a logical database dump. `storage` metadata is present in `data.sql`,
but object bytes require their separate hosted-object copy.
'@
  $restoreRunbook =
    $restoreRunbook.Replace('__PROJECT_REF__', $ProjectRef)
  Write-BackupAtomicTextV1 `
    -Path (Join-Path $resolvedArtifactRoot 'RESTORE.md') `
    -Value ($restoreRunbook + "`n")

  $completedAtUtc = [datetime]::UtcNow
  $manifest = [pscustomobject][ordered]@{
    schema_version = 1
    project_ref = $ProjectRef
    backup_kind = 'supabase_logical_dump_candidate'
    rollout_gate_eligible = $false
    qualification_status =
      'pending_isolated_restore_rehearsal_and_operator_review'
    source_sha256 = $scriptSha256
    source_repo_head_at_start = $sourceRepoHead
    sealed_binding_sha256 = $bindingHashes
    supabase_cli = [pscustomobject][ordered]@{
      version = '2.90.0'
      executable_sha256 = $ExpectedSupabaseSha256
    }
    archive_tool = [pscustomobject][ordered]@{
      name = '7-Zip'
      version = '25.01'
      executable_sha256 = $ExpectedSevenZipSha256
      format = '7z'
      compression_level = 1
    }
    started_at_utc = $startedAtUtc.ToString('o')
    candidate_data_snapshot_started_at_utc =
      $dataResult.started_at_utc
    completed_at_utc = $completedAtUtc.ToString('o')
    schema_stable_during_backup = $true
    roles_stable_during_backup = $true
    migration_history_stable_during_backup = $true
    managed_schema_stable_during_backup = $true
    root_acl_reviewed = $true
    stream_compression_enabled = $true
    minimum_free_space_floor_bytes = $MinimumFreeBytes
    restore_rehearsal_completed = $false
    restore_path_reviewed = $false
    database_storage_metadata_included = $true
    storage_object_bytes_included = $false
    migration_history_included = $true
    managed_schema_reference_included = $true
    managed_schema_reference_requires_reconciliation = $true
    edge_function_source_and_deployments_included = $false
    project_secrets_and_auth_configuration_included = $false
    custom_domains_included = $false
    vault_encryption_root_included = $false
    application_data_schema_flags_or_migrations_mutated = $false
    ephemeral_cli_login_roles_created = $true
    ephemeral_cli_login_roles_cleanup = 'allow_ttl_expiration'
    excluded_data_tables = @(
      'storage.buckets_vectors',
      'storage.vector_indexes'
    )
    restore_runbook = 'RESTORE.md'
    operator = $operatorIdentity
    components = @($componentResults)
  }
  $manifestPath =
    Join-Path $resolvedArtifactRoot 'backup-candidate-complete.json'
  Write-BackupAtomicJsonV1 -Path $manifestPath -Value $manifest
  Write-BackupLogV1 `
    -Text (
      'Logical dump candidate completed and remains ineligible for rollout ' +
      'until an isolated restore rehearsal passes.'
    )

  $checksums = [System.Collections.Generic.List[string]]::new()
  foreach (
    $file in @(
      Get-ChildItem -LiteralPath $resolvedArtifactRoot -File |
        Where-Object {
          $_.Name -notin @('status.json', 'checksums.sha256')
        } |
        Sort-Object Name
    )
  ) {
    $checksums.Add(
      "$(Get-BackupSha256V1 -Path $file.FullName) *$($file.Name)"
    )
  }
  Write-BackupAtomicTextV1 `
    -Path (Join-Path $resolvedArtifactRoot 'checksums.sha256') `
    -Value (($checksums -join "`n") + "`n")
  Assert-BackupArtifactAclV1 -Path $resolvedArtifactRoot
  $currentStep = 'complete'
  Write-BackupStatusV1 `
    -Status 'complete_candidate' `
    -Reason 'Pending isolated restore rehearsal and operator review.'
  exit 0
} catch {
  $safeReason = ConvertTo-BackupSafeTextV1 -Text $_.Exception.Message
  if (Test-Path -LiteralPath $resolvedArtifactRoot -PathType Container) {
    try {
      Write-BackupLogV1 -Text "FAILED: $safeReason"
    } catch {
    }
    try {
      Write-BackupStatusV1 -Status 'failed' -Reason $safeReason
    } catch {
    }
  }
  Write-Error $safeReason
  exit 1
} finally {
  foreach ($bindingSeal in $bindingSeals) {
    if ($null -ne $bindingSeal) {
      $bindingSeal.Dispose()
    }
  }
  if ($null -ne $sevenZipSeal) {
    $sevenZipSeal.Dispose()
  }
  if ($null -ne $executableSeal) {
    $executableSeal.Dispose()
  }
  if ($null -ne $sourceSeal) {
    $sourceSeal.Dispose()
  }
}
