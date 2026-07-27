#requires -Version 7.4

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:ActivationRepoRoot = Split-Path -Parent (
  Split-Path -Parent $PSScriptRoot
)
$script:ActivationManifestPath = Join-Path (
  $script:ActivationRepoRoot
) 'scripts/ops/collaborative_binders_activation_manifest_v1.json'
$script:RolloutModulePath = Join-Path (
  $script:ActivationRepoRoot
) 'scripts/ops/CollaborativeBindersProductionRolloutV1.psm1'
$script:ExpectedRolloutModuleSha256 =
  '4a3c61cec4e490f17f180c7f994041675c37fd8d39bbd95cc8e5711eabedd471'
$rolloutModuleItem = Get-Item -LiteralPath $script:RolloutModulePath
if ($rolloutModuleItem.Attributes.HasFlag(
  [IO.FileAttributes]::ReparsePoint
)) {
  throw 'Production rollout module must not be a reparse point.'
}
$rolloutModuleHash = (
  Get-FileHash `
    -LiteralPath $script:RolloutModulePath `
    -Algorithm SHA256
).Hash.ToLowerInvariant()
if ($rolloutModuleHash -cne $script:ExpectedRolloutModuleSha256) {
  throw 'Production rollout module hash does not match the activation bootstrap.'
}
$script:RolloutModuleSeal = [IO.File]::Open(
  $script:RolloutModulePath,
  [IO.FileMode]::Open,
  [IO.FileAccess]::Read,
  [IO.FileShare]::Read
)
try {
  $rolloutModuleHash = (
    Get-FileHash `
      -LiteralPath $script:RolloutModulePath `
      -Algorithm SHA256
  ).Hash.ToLowerInvariant()
  if ($rolloutModuleHash -cne $script:ExpectedRolloutModuleSha256) {
    throw 'Production rollout module changed while opening its bootstrap seal.'
  }
  $script:RolloutModule = Import-Module (
    $script:RolloutModulePath
  ) -Force -PassThru
} catch {
  $script:RolloutModuleSeal.Dispose()
  throw
}

function Assert-BinderActivationConditionV1 {
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

function Get-BinderActivationSha256V1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return (
    Get-FileHash -LiteralPath $Path -Algorithm SHA256
  ).Hash.ToLowerInvariant()
}

function ConvertTo-BinderActivationUtcV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Value,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  try {
    if ($Value -is [datetimeoffset]) {
      return ([datetimeoffset]$Value).ToUniversalTime()
    }
    if ($Value -is [datetime]) {
      $date = [datetime]$Value
      if ($date.Kind -eq [DateTimeKind]::Unspecified) {
        $date = [datetime]::SpecifyKind($date, [DateTimeKind]::Utc)
      }
      return [datetimeoffset]$date.ToUniversalTime()
    }
    return [datetimeoffset]::Parse(
      [string]$Value,
      [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]::AssumeUniversal
    ).ToUniversalTime()
  } catch {
    throw "$Label is not a valid UTC timestamp."
  }
}

function Write-BinderActivationJsonV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [object]$Value
  )

  & $script:RolloutModule {
    param($TargetPath, $TargetValue)
    Write-BinderJsonV1 -Path $TargetPath -Value $TargetValue
  } $Path $Value
}

function Write-BinderActivationTextV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [AllowEmptyString()]
    [string]$Value = ''
  )

  & $script:RolloutModule {
    param($TargetPath, $TargetValue)
    Write-BinderTextV1 -Path $TargetPath -Value $TargetValue
  } $Path $Value
}

function Write-BinderActivationChecksumsV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root
  )

  & $script:RolloutModule {
    param($TargetRoot)
    Write-BinderChecksumsV1 -Root $TargetRoot
  } $Root
}

function Assert-BinderActivationArtifactAclV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $currentSid = $identity.User
  Assert-BinderActivationConditionV1 (
    $null -ne $currentSid
  ) 'Current Windows SID is unavailable.'
  $acl = Get-Acl -LiteralPath $Path
  Assert-BinderActivationConditionV1 (
    $acl.AreAccessRulesProtected
  ) 'Binder activation evidence ACL inheritance must be disabled.'
  Assert-BinderActivationConditionV1 (
    $acl.AreAccessRulesCanonical
  ) 'Binder activation evidence ACL must be canonical.'
  $ownerSid = (
    [Security.Principal.NTAccount]$acl.Owner
  ).Translate([Security.Principal.SecurityIdentifier]).Value
  Assert-BinderActivationConditionV1 (
    $ownerSid -ceq $currentSid.Value
  ) 'Binder activation evidence owner is not the current operator.'

  $inheritance = (
    [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
    [Security.AccessControl.InheritanceFlags]::ObjectInherit
  )
  $propagation = [Security.AccessControl.PropagationFlags]::None
  $allow = [Security.AccessControl.AccessControlType]::Allow
  $rules = @($acl.Access)
  Assert-BinderActivationConditionV1 (
    $rules.Count -eq 3
  ) 'Binder activation evidence ACL must contain exactly three rules.'
  Assert-BinderActivationConditionV1 (
    @(
      $rules |
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
  ) 'Binder activation evidence ACL contains an unsafe rule.'
  $actualSids = @(
    $rules |
      ForEach-Object {
        $_.IdentityReference.Translate(
          [Security.Principal.SecurityIdentifier]
        ).Value
      } |
      Sort-Object -Unique
  )
  $expectedSids = @(
    $currentSid.Value,
    'S-1-5-18',
    'S-1-5-32-544'
  ) | Sort-Object -Unique
  Assert-BinderActivationConditionV1 (
    @(Compare-Object $expectedSids $actualSids).Count -eq 0
  ) 'Binder activation evidence ACL contains an unexpected identity.'

  return $true
}

function Protect-BinderActivationArtifactRootV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $currentSid = $identity.User
  Assert-BinderActivationConditionV1 (
    $null -ne $currentSid
  ) 'Current Windows SID is unavailable.'
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
  Set-Acl -LiteralPath $Path -AclObject $security
  [void](Assert-BinderActivationArtifactAclV1 -Path $Path)
}

function New-BinderActivationArtifactRootV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $secureOpsRoot = [IO.Path]::GetFullPath(
    'C:\secure-ops'
  ).TrimEnd('\', '/')
  $candidate = [IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $secureOpsRoot -PathType Container
  ) 'C:\secure-ops is not a directory.'
  $secureOpsItem = Get-Item -LiteralPath $secureOpsRoot
  Assert-BinderActivationConditionV1 (
    -not $secureOpsItem.Attributes.HasFlag(
      [IO.FileAttributes]::ReparsePoint
    )
  ) 'C:\secure-ops must not be a reparse point.'
  Assert-BinderActivationConditionV1 (
    (Split-Path -Parent $candidate) -ceq $secureOpsRoot
  ) 'Binder activation evidence must be a direct child of C:\secure-ops.'
  $created = & $script:RolloutModule {
    param($TargetPath, $TargetRepoRoot)
    New-BinderArtifactRootV1 `
      -Path $TargetPath `
      -RepoRoot $TargetRepoRoot
  } $candidate $RepoRoot
  Protect-BinderActivationArtifactRootV1 -Path $created
  return $created
}

function Assert-BinderActivationArtifactRootV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $secureOpsRoot = [IO.Path]::GetFullPath(
    'C:\secure-ops'
  ).TrimEnd('\', '/')
  $candidate = [IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $secureOpsRoot -PathType Container
  ) 'C:\secure-ops is not a directory.'
  $secureOpsItem = Get-Item -LiteralPath $secureOpsRoot
  Assert-BinderActivationConditionV1 (
    -not $secureOpsItem.Attributes.HasFlag(
      [IO.FileAttributes]::ReparsePoint
    )
  ) 'C:\secure-ops must not be a reparse point.'
  Assert-BinderActivationConditionV1 (
    (Split-Path -Parent $candidate) -ceq $secureOpsRoot
  ) 'Binder activation evidence must be a direct child of C:\secure-ops.'
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $candidate -PathType Container
  ) 'Binder activation evidence root is missing.'
  $candidateItem = Get-Item -LiteralPath $candidate
  Assert-BinderActivationConditionV1 (
    -not $candidateItem.Attributes.HasFlag(
      [IO.FileAttributes]::ReparsePoint
    )
  ) 'Binder activation evidence root must not be a reparse point.'
  $resolved = & $script:RolloutModule {
    param($TargetPath, $TargetRepoRoot)
    Assert-BinderArtifactRootV1 `
      -Path $TargetPath `
      -RepoRoot $TargetRepoRoot `
      -MustExist $true
  } $candidate $RepoRoot
  [void](Assert-BinderActivationArtifactAclV1 -Path $resolved)
  return $resolved
}

function Assert-BinderInstallationEvidenceRootV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $secureOpsRoot = [IO.Path]::GetFullPath(
    'C:\secure-ops'
  ).TrimEnd('\', '/')
  $candidate = [IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
  $preflightRoot = Split-Path -Parent $candidate
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $secureOpsRoot -PathType Container
  ) 'C:\secure-ops is not a directory.'
  $secureOpsItem = Get-Item -LiteralPath $secureOpsRoot
  Assert-BinderActivationConditionV1 (
    -not $secureOpsItem.Attributes.HasFlag(
      [IO.FileAttributes]::ReparsePoint
    )
  ) 'C:\secure-ops must not be a reparse point.'
  Assert-BinderActivationConditionV1 (
    (Split-Path -Parent $preflightRoot) -ceq $secureOpsRoot
  ) (
    'Binder installation evidence must be an exact child of a ' +
    'production preflight root directly under C:\secure-ops.'
  )
  Assert-BinderActivationConditionV1 (
    (Split-Path -Leaf $candidate) -cmatch
      '^apply-\d{8}T\d{6}Z$'
  ) 'Binder installation evidence directory name is invalid.'

  foreach ($root in @($preflightRoot, $candidate)) {
    Assert-BinderActivationConditionV1 (
      Test-Path -LiteralPath $root -PathType Container
    ) 'Binder installation evidence chain is missing.'
    $rootItem = Get-Item -LiteralPath $root
    Assert-BinderActivationConditionV1 (
      -not $rootItem.Attributes.HasFlag(
        [IO.FileAttributes]::ReparsePoint
      )
    ) 'Binder installation evidence chain must not use reparse points.'
  }

  $resolvedPreflightRoot = & $script:RolloutModule {
    param($TargetPath, $TargetRepoRoot)
    Assert-BinderArtifactRootV1 `
      -Path $TargetPath `
      -RepoRoot $TargetRepoRoot `
      -MustExist $true
  } $preflightRoot $RepoRoot
  $resolvedApplyRoot = & $script:RolloutModule {
    param($TargetPath, $TargetRepoRoot)
    Assert-BinderArtifactRootV1 `
      -Path $TargetPath `
      -RepoRoot $TargetRepoRoot `
      -MustExist $true
  } $candidate $RepoRoot
  Assert-BinderActivationConditionV1 (
    (Split-Path -Parent $resolvedApplyRoot) -ceq
      $resolvedPreflightRoot
  ) 'Binder installation evidence chain changed during validation.'
  [void](Assert-BinderActivationArtifactAclV1 -Path $resolvedPreflightRoot)
  [void](Assert-BinderActivationArtifactAclV1 -Path $resolvedApplyRoot)
  return $resolvedApplyRoot
}

function Test-BinderInstallationPreflightEvidenceV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PreflightRoot,

    [Parameter(Mandatory = $true)]
    [string]$ApplyRoot
  )

  $resolvedPreflightRoot = [IO.Path]::GetFullPath(
    $PreflightRoot
  ).TrimEnd('\', '/')
  $resolvedApplyRoot = [IO.Path]::GetFullPath(
    $ApplyRoot
  ).TrimEnd('\', '/')
  Assert-BinderActivationConditionV1 (
    (Split-Path -Parent $resolvedApplyRoot) -ceq
      $resolvedPreflightRoot
  ) 'Installation apply evidence is not inside its preflight root.'

  $directories = @(
    Get-ChildItem `
      -LiteralPath $resolvedPreflightRoot `
      -Directory `
      -Force
  )
  Assert-BinderActivationConditionV1 (
    $directories.Count -eq 1 -and
    $directories[0].FullName -ceq $resolvedApplyRoot -and
    -not $directories[0].Attributes.HasFlag(
      [IO.FileAttributes]::ReparsePoint
    )
  ) (
    'Installation preflight evidence must contain only its one exact ' +
    'non-reparse apply directory.'
  )

  $checksumPath = Join-Path (
    $resolvedPreflightRoot
  ) 'checksums.sha256'
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $checksumPath -PathType Leaf
  ) 'Installation preflight checksum bundle is missing.'
  $checksumItem = Get-Item -LiteralPath $checksumPath -Force
  Assert-BinderActivationConditionV1 (
    -not $checksumItem.Attributes.HasFlag(
      [IO.FileAttributes]::ReparsePoint
    )
  ) 'Installation preflight checksum bundle must not be a reparse point.'

  $expected = [ordered]@{}
  foreach ($line in Get-Content -LiteralPath $checksumPath) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    $match = [regex]::Match(
      $line,
      '^(?<hash>[0-9a-f]{64})  (?<path>[^\r\n]+)$'
    )
    Assert-BinderActivationConditionV1 (
      $match.Success
    ) 'Installation preflight checksum bundle contains an invalid line.'
    $relative = $match.Groups['path'].Value
    Assert-BinderActivationConditionV1 (
      -not [IO.Path]::IsPathFullyQualified($relative) -and
      -not $relative.Contains('..') -and
      -not $relative.Contains(':') -and
      -not $relative.Contains('/') -and
      -not $relative.Contains('\')
    ) (
      'Installation preflight checksum bundle contains an unsafe ' +
      'top-level path.'
    )
    Assert-BinderActivationConditionV1 (
      -not $expected.Contains($relative)
    ) (
      'Installation preflight checksum bundle contains a duplicate ' +
      "path: $relative"
    )
    $expected[$relative] = $match.Groups['hash'].Value
  }

  $actual = @(
    Get-ChildItem `
      -LiteralPath $resolvedPreflightRoot `
      -File `
      -Force |
      Where-Object { $_.FullName -cne $checksumPath } |
      Sort-Object FullName
  )
  Assert-BinderActivationConditionV1 (
    $actual.Count -eq $expected.Count
  ) 'Installation preflight file set changed after its checksum seal.'
  foreach ($file in $actual) {
    Assert-BinderActivationConditionV1 (
      -not $file.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)
    ) (
      'Installation preflight file must not be a reparse point: ' +
      $file.FullName
    )
    $relative = $file.Name
    Assert-BinderActivationConditionV1 (
      $expected.Contains($relative)
    ) "Installation preflight checksum is missing: $relative"
    Assert-BinderActivationConditionV1 (
      (Get-BinderActivationSha256V1 -Path $file.FullName) -ceq
        $expected[$relative]
    ) "Installation preflight checksum mismatch: $relative"
  }

  $required = @(
    'preflight-manifest.json',
    'preflight-manifest.sha256',
    'backup-evidence.digest.json'
  )
  foreach ($relative in $required) {
    Assert-BinderActivationConditionV1 (
      $expected.Contains($relative)
    ) "Installation preflight checksum is missing: $relative"
  }

  return [pscustomobject][ordered]@{
    Root = $resolvedPreflightRoot
    ApplyRoot = $resolvedApplyRoot
    ChecksumPath = $checksumPath
    ChecksumSha256 = Get-BinderActivationSha256V1 -Path $checksumPath
    ManifestPath = Join-Path (
      $resolvedPreflightRoot
    ) 'preflight-manifest.json'
    ManifestSidecarPath = Join-Path (
      $resolvedPreflightRoot
    ) 'preflight-manifest.sha256'
    BackupDigestPath = Join-Path (
      $resolvedPreflightRoot
    ) 'backup-evidence.digest.json'
    FileCount = $actual.Count
  }
}

function Test-BinderActivationChecksumsV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root
  )

  $resolvedRoot = [IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
  $checksumPath = Join-Path $resolvedRoot 'checksums.sha256'
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $checksumPath -PathType Leaf
  ) 'Evidence checksum bundle is missing.'
  $checksumItem = Get-Item -LiteralPath $checksumPath
  Assert-BinderActivationConditionV1 (
    -not $checksumItem.Attributes.HasFlag(
      [IO.FileAttributes]::ReparsePoint
    )
  ) 'Evidence checksum bundle must not be a reparse point.'

  $expected = [ordered]@{}
  foreach ($line in Get-Content -LiteralPath $checksumPath) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    $match = [regex]::Match(
      $line,
      '^(?<hash>[0-9a-f]{64})  (?<path>[^\r\n]+)$'
    )
    Assert-BinderActivationConditionV1 (
      $match.Success
    ) 'Evidence checksum bundle contains an invalid line.'
    $relative = $match.Groups['path'].Value
    Assert-BinderActivationConditionV1 (
      -not [IO.Path]::IsPathFullyQualified($relative) -and
      -not $relative.Contains('..') -and
      -not $relative.Contains(':')
    ) 'Evidence checksum bundle contains an unsafe relative path.'
    Assert-BinderActivationConditionV1 (
      -not $expected.Contains($relative)
    ) "Evidence checksum bundle contains a duplicate path: $relative"
    $expected[$relative] = $match.Groups['hash'].Value
  }

  $actual = @(
    Get-ChildItem -LiteralPath $resolvedRoot -File -Recurse |
      Where-Object { $_.FullName -cne $checksumPath } |
      Sort-Object FullName
  )
  Assert-BinderActivationConditionV1 (
    $actual.Count -eq $expected.Count
  ) 'Evidence file set does not match its checksum bundle.'
  foreach ($file in $actual) {
    Assert-BinderActivationConditionV1 (
      -not $file.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)
    ) "Evidence file must not be a reparse point: $($file.FullName)"
    $relative = [IO.Path]::GetRelativePath(
      $resolvedRoot,
      $file.FullName
    ).Replace('\', '/')
    Assert-BinderActivationConditionV1 (
      $expected.Contains($relative)
    ) "Evidence checksum is missing: $relative"
    Assert-BinderActivationConditionV1 (
      (Get-BinderActivationSha256V1 -Path $file.FullName) -ceq
        $expected[$relative]
    ) "Evidence checksum mismatch: $relative"
  }

  return [pscustomobject][ordered]@{
    Root = $resolvedRoot
    ChecksumPath = $checksumPath
    ChecksumSha256 = Get-BinderActivationSha256V1 -Path $checksumPath
    FileCount = $actual.Count
  }
}

function Assert-BinderActivationDisabledFlagMapV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Collections.IDictionary]$FlagMap,

    [Parameter(Mandatory = $true)]
    [string]$Label,

    [Parameter(Mandatory = $true)]
    [ValidateSet('web', 'samsung')]
    [string]$Surface,

    [System.Collections.IDictionary]$CanonicalDbFlagMapping,

    [switch]$PassThru
  )

  $clientFlagContract = [ordered]@{
    schema_internal = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_SCHEMA_V1'
    }
    personal = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_PERSONAL_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_PERSONAL_V1'
    }
    shared = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_SHARED_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_SHARED_V1'
    }
    view_links = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_VIEW_LINKS_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_VIEW_LINKS_V1'
    }
    public = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_PUBLIC_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_PUBLIC_V1'
    }
    community = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_COMMUNITY_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_COMMUNITY_V1'
    }
    templates = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_TEMPLATES_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_TEMPLATES_V1'
    }
    notifications = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_NOTIFICATIONS_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_NOTIFICATIONS_V1'
    }
    pulse_milestones = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_PULSE_SHARING_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_PULSE_SHARING_V1'
    }
    set_binders = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_SET_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_SET_TARGET_V1'
    }
    custom = [ordered]@{
      web_flag_key = 'GROOKAI_BINDERS_CUSTOM_V1_ENABLED'
      samsung_compile_flag_key = 'BINDERS_CUSTOM_TARGET_V1'
    }
  }
  $surfaceField = if ($Surface -ceq 'web') {
    'web_flag_key'
  } else {
    'samsung_compile_flag_key'
  }
  $expectedKeys = @(
    foreach ($binding in $clientFlagContract.Values) {
      [string]$binding[$surfaceField]
    }
  ) | Sort-Object
  $actualKeys = @($FlagMap.Keys | ForEach-Object { [string]$_ }) |
    Sort-Object
  Assert-BinderActivationConditionV1 (
    (@($actualKeys) -join "`n") -ceq (@($expectedKeys) -join "`n")
  ) "$Label does not contain the exact Binder client flag set."
  foreach ($key in $expectedKeys) {
    Assert-BinderActivationConditionV1 (
      $FlagMap[$key] -is [bool] -and
      $FlagMap[$key] -eq $false
    ) "$Label has an enabled or non-boolean Binder flag: $key"
  }

  if ($null -ne $CanonicalDbFlagMapping) {
    $expectedCanonicalKeys = @($clientFlagContract.Keys) | Sort-Object
    $actualCanonicalKeys = @(
      $CanonicalDbFlagMapping.Keys |
        ForEach-Object { [string]$_ }
    ) | Sort-Object
    Assert-BinderActivationConditionV1 (
      (@($actualCanonicalKeys) -join "`n") -ceq
        (@($expectedCanonicalKeys) -join "`n")
    ) "$Label canonical DB mapping has an unexpected flag set."
    foreach ($canonicalKey in $expectedCanonicalKeys) {
      $actualBinding = $CanonicalDbFlagMapping[$canonicalKey]
      $expectedBinding = $clientFlagContract[$canonicalKey]
      Assert-BinderActivationConditionV1 (
        $actualBinding -is [System.Collections.IDictionary] -and
        @($actualBinding.Keys).Count -eq 2 -and
        [string]$actualBinding.web_flag_key -ceq
          [string]$expectedBinding.web_flag_key -and
        [string]$actualBinding.samsung_compile_flag_key -ceq
          [string]$expectedBinding.samsung_compile_flag_key
      ) "$Label changed the canonical DB mapping for $canonicalKey."
    }
  }

  if ($PassThru.IsPresent) {
    return $clientFlagContract
  }
}

function Test-BinderActivationClientsDarkEvidenceV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedHeadSha,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedWebDeploymentId,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedMobileVersionName,

    [Parameter(Mandatory = $true)]
    [int]$ExpectedMobileVersionCode,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedMobileApkSha256,

    [datetimeoffset]$NowUtc = [datetimeoffset]::UtcNow
  )

  Assert-BinderActivationConditionV1 (
    -not [string]::IsNullOrWhiteSpace($ExpectedWebDeploymentId) -and
    $ExpectedWebDeploymentId -cne 'unavailable' -and
    -not [string]::IsNullOrWhiteSpace($ExpectedMobileVersionName) -and
    $ExpectedMobileVersionCode -gt 0 -and
    $ExpectedMobileApkSha256 -cmatch '^[0-9a-f]{64}$'
  ) 'Clients-dark expected client identity is incomplete.'
  $policy = Get-BinderActivationPolicyV1 -RepoRoot $RepoRoot
  $root = Assert-BinderActivationArtifactRootV1 `
    -Path $Path `
    -RepoRoot $RepoRoot
  [void](Assert-BinderActivationArtifactAclV1 -Path $root)
  $checksumPath = Join-Path $root 'checksums.sha256'
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $checksumPath -PathType Leaf
  ) 'Clients-dark checksum bundle is missing.'
  $sealPaths = @(
    Get-ChildItem -LiteralPath $root -File -Recurse |
      Select-Object -ExpandProperty FullName
  )
  $sealStreams = @()
  try {
    $sealStreams = Open-BinderActivationSealV1 -Paths $sealPaths
    $checksums = Test-BinderActivationChecksumsV1 -Root $root
    $evidencePath = Join-Path $root 'clients-dark-evidence.json'
    Assert-BinderActivationConditionV1 (
      Test-Path -LiteralPath $evidencePath -PathType Leaf
    ) 'Clients-dark evidence manifest is missing.'
    $evidence = Get-Content -LiteralPath $evidencePath -Raw |
      ConvertFrom-Json -AsHashtable
    $core = [ordered]@{}
    foreach ($entry in $evidence.GetEnumerator()) {
      if ($entry.Key -cne 'evidence_fingerprint_sha256') {
        $core[$entry.Key] = $entry.Value
      }
    }
    $fingerprint = Get-CanonicalSha256V1 -Value $core
    Assert-BinderActivationConditionV1 (
      [string]$evidence.evidence_fingerprint_sha256 -ceq $fingerprint
    ) 'Clients-dark evidence fingerprint is invalid.'
    Assert-BinderActivationConditionV1 (
      [int]$evidence.schema_version -eq 1 -and
      [string]$evidence.package_id -ceq
        'COLLABORATIVE-BINDERS-CLIENTS-DARK-V1' -and
      [string]$evidence.status -ceq 'pass' -and
      [string]$evidence.project_ref -ceq 'ycdxbpibncqcchqiihfz' -and
      [string]$evidence.head_sha -ceq $ExpectedHeadSha -and
      $evidence.clients_dark -eq $true -and
      $evidence.reviewed_by_operator -eq $true
    ) 'Clients-dark evidence identity or review contract is invalid.'
    $created = ConvertTo-BinderActivationUtcV1 `
      -Value $evidence.created_at_utc `
      -Label 'Clients-dark evidence creation time'
    $expires = ConvertTo-BinderActivationUtcV1 `
      -Value $evidence.expires_at_utc `
      -Label 'Clients-dark evidence expiration time'
    Assert-BinderActivationConditionV1 (
      $created -le $NowUtc -and
      $created -ge $NowUtc.AddHours(-$policy.Manifest.clients_dark_evidence_ttl_hours) -and
      $expires -ge $NowUtc -and
      $expires -le $created.AddHours($policy.Manifest.clients_dark_evidence_ttl_hours)
    ) 'Clients-dark evidence is expired, future-dated, or overlong.'

    Assert-BinderActivationConditionV1 (
      [string]$evidence.web.production_origin -ceq
        'https://grookaivault.com' -and
      [string]$evidence.web.deployment_commit_sha -ceq
        $ExpectedHeadSha -and
      [string]$evidence.web.deployment_id -ceq
        $ExpectedWebDeploymentId
    ) 'Clients-dark web deployment identity is invalid.'
    Assert-BinderActivationConditionV1 (
      [string]$evidence.mobile.application_id -ceq
        'com.grookai.vault' -and
      [string]$evidence.mobile.build_head_sha -ceq
        $ExpectedHeadSha -and
      [string]$evidence.mobile.version_name -ceq
        $ExpectedMobileVersionName -and
      [int]$evidence.mobile.version_code -eq $ExpectedMobileVersionCode -and
      [string]$evidence.mobile.apk_sha256 -ceq
        $ExpectedMobileApkSha256
    ) 'Clients-dark Samsung build identity is invalid.'
    Assert-BinderActivationDisabledFlagMapV1 `
      -FlagMap $evidence.web_flags `
      -Label 'Clients-dark web evidence' `
      -Surface 'web' `
      -CanonicalDbFlagMapping $evidence.canonical_db_flag_mapping
    Assert-BinderActivationDisabledFlagMapV1 `
      -FlagMap $evidence.mobile.flags `
      -Label 'Clients-dark Samsung evidence' `
      -Surface 'samsung' `
      -CanonicalDbFlagMapping $evidence.canonical_db_flag_mapping

    foreach ($surface in @($evidence.web, $evidence.mobile)) {
      $proofFile = [string]$surface.proof_file
      Assert-BinderActivationConditionV1 (
        $proofFile -cmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$' -and
        [string]$surface.proof_sha256 -cmatch '^[0-9a-f]{64}$'
      ) 'Clients-dark proof reference is unsafe or unhashed.'
      $proofPath = Join-Path $root $proofFile
      Assert-BinderActivationConditionV1 (
        Test-Path -LiteralPath $proofPath -PathType Leaf
      ) 'Clients-dark proof file is missing.'
      Assert-BinderActivationConditionV1 (
        (Get-BinderActivationSha256V1 -Path $proofPath) -ceq
          [string]$surface.proof_sha256
      ) 'Clients-dark proof file hash changed.'
      $observed = ConvertTo-BinderActivationUtcV1 `
        -Value $surface.observed_at_utc `
        -Label 'Clients-dark observation time'
      Assert-BinderActivationConditionV1 (
        $observed -le $NowUtc -and
        $observed -ge $created.AddHours(
          -$policy.Manifest.clients_dark_evidence_ttl_hours
        )
      ) 'Clients-dark observation is future-dated or stale.'
    }

    return [pscustomobject][ordered]@{
      Root = $root
      ChecksumPath = $checksums.ChecksumPath
      ChecksumSha256 = $checksums.ChecksumSha256
      EvidencePath = $evidencePath
      EvidenceSha256 = Get-BinderActivationSha256V1 -Path $evidencePath
      EvidenceFingerprintSha256 = $fingerprint
      ReportSha256 = Get-CanonicalSha256V1 -Value $evidence
      CreatedAtUtc = $created.ToString('o')
      ExpiresAtUtc = $expires.ToString('o')
      WebDeploymentId = [string]$evidence.web.deployment_id
      WebDeploymentCommitSha =
        [string]$evidence.web.deployment_commit_sha
      MobileApplicationId = [string]$evidence.mobile.application_id
      MobileVersionName = [string]$evidence.mobile.version_name
      MobileVersionCode = [int]$evidence.mobile.version_code
      MobileApkSha256 = [string]$evidence.mobile.apk_sha256
    }
  } finally {
    Close-BinderActivationSealV1 -Streams $sealStreams
  }
}

function New-BinderActivationClientsDarkEvidenceV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$ExpectedHeadSha,

    [Parameter(Mandatory = $true)]
    [string]$WebDeploymentId,

    [Parameter(Mandatory = $true)]
    [string]$WebProofPath,

    [Parameter(Mandatory = $true)]
    [datetimeoffset]$WebObservedAtUtc,

    [Parameter(Mandatory = $true)]
    [string]$MobileApkPath,

    [Parameter(Mandatory = $true)]
    [string]$MobileVersionName,

    [Parameter(Mandatory = $true)]
    [int]$MobileVersionCode,

    [Parameter(Mandatory = $true)]
    [string]$MobileProofPath,

    [Parameter(Mandatory = $true)]
    [datetimeoffset]$MobileObservedAtUtc,

    [Parameter(Mandatory = $true)]
    [string]$ArtifactRoot,

    [Parameter(Mandatory = $true)]
    [bool]$ConfirmEvidence,

    [string]$RepoRoot = $script:ActivationRepoRoot
  )

  Assert-BinderActivationConditionV1 (
    $ExpectedHeadSha -cmatch '^[0-9a-f]{40}$'
  ) 'Clients-dark expected HEAD is invalid.'
  [void](Assert-BinderActivationSourceV1 -RepoRoot $RepoRoot)
  [void](Assert-BinderActivationRepositoryV1 `
    -RepoRoot $RepoRoot `
    -ExpectedHeadSha $ExpectedHeadSha)
  foreach ($path in @($WebProofPath, $MobileProofPath, $MobileApkPath)) {
    Assert-BinderActivationConditionV1 (
      Test-Path -LiteralPath $path -PathType Leaf
    ) 'A clients-dark source proof or APK is missing.'
    $item = Get-Item -LiteralPath $path
    Assert-BinderActivationConditionV1 (
      -not $item.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)
    ) 'A clients-dark source proof or APK is a reparse point.'
  }
  Assert-BinderActivationConditionV1 (
    -not [string]::IsNullOrWhiteSpace($WebDeploymentId) -and
    $WebDeploymentId -cne 'unavailable' -and
    -not [string]::IsNullOrWhiteSpace($MobileVersionName) -and
    $MobileVersionCode -gt 0
  ) 'Clients-dark deployment or mobile build identity is incomplete.'
  $apkSha256 = Get-BinderActivationSha256V1 -Path $MobileApkPath
  $webProof = Get-Content -LiteralPath $WebProofPath -Raw |
    ConvertFrom-Json -AsHashtable
  $mobileProof = Get-Content -LiteralPath $MobileProofPath -Raw |
    ConvertFrom-Json -AsHashtable
  Assert-BinderActivationConditionV1 (
    [string]$webProof.production_origin -ceq
      'https://grookaivault.com' -and
    [string]$webProof.deployment_id -ceq $WebDeploymentId -and
    [string]$webProof.deployment_commit_sha -ceq $ExpectedHeadSha -and
      $webProof.clients_dark -eq $true
  ) 'Web observation does not prove the expected dark deployment.'
  $canonicalDbFlagMapping = Assert-BinderActivationDisabledFlagMapV1 `
    -FlagMap $webProof.flags `
    -Label 'Web observation' `
    -Surface 'web' `
    -PassThru
  Assert-BinderActivationConditionV1 (
    [string]$mobileProof.application_id -ceq
      'com.grookai.vault' -and
    [string]$mobileProof.build_head_sha -ceq $ExpectedHeadSha -and
    [string]$mobileProof.version_name -ceq $MobileVersionName -and
    [int]$mobileProof.version_code -eq $MobileVersionCode -and
    [string]$mobileProof.apk_sha256 -ceq $apkSha256 -and
    $mobileProof.clients_dark -eq $true
  ) 'Samsung observation does not prove the expected dark build.'
  Assert-BinderActivationDisabledFlagMapV1 `
    -FlagMap $mobileProof.flags `
    -Label 'Samsung observation' `
    -Surface 'samsung' `
    -CanonicalDbFlagMapping $canonicalDbFlagMapping
  $webProofObserved = ConvertTo-BinderActivationUtcV1 `
    -Value $webProof.observed_at_utc `
    -Label 'Web proof observation time'
  $mobileProofObserved = ConvertTo-BinderActivationUtcV1 `
    -Value $mobileProof.observed_at_utc `
    -Label 'Samsung proof observation time'
  Assert-BinderActivationConditionV1 (
    $webProofObserved.ToString('o') -ceq
      $WebObservedAtUtc.ToUniversalTime().ToString('o') -and
    $mobileProofObserved.ToString('o') -ceq
      $MobileObservedAtUtc.ToUniversalTime().ToString('o')
  ) 'Clients-dark proof observation timestamps do not match the request.'
  $expectedAck = (
    'CLIENTS-DARK-VERIFIED::ycdxbpibncqcchqiihfz::' +
    $ExpectedHeadSha + '::' +
    $WebDeploymentId + '::' +
    $apkSha256
  )
  Assert-BinderActivationConditionV1 (
    $ConfirmEvidence -and
    $env:GROOKAI_BINDER_CLIENTS_DARK_ACK -ceq $expectedAck
  ) 'Exact reviewed clients-dark acknowledgement is missing.'

  $root = New-BinderActivationArtifactRootV1 `
    -Path $ArtifactRoot `
    -RepoRoot $RepoRoot
  try {
    $webProofTarget = Join-Path $root 'web-production-observation.json'
    $mobileProofTarget = Join-Path $root 'samsung-install-observation.json'
    [IO.File]::Copy(
      [IO.Path]::GetFullPath($WebProofPath),
      $webProofTarget,
      $false
    )
    [IO.File]::Copy(
      [IO.Path]::GetFullPath($MobileProofPath),
      $mobileProofTarget,
      $false
    )
    $now = [datetimeoffset]::UtcNow
    $core = [ordered]@{
      schema_version = 1
      package_id = 'COLLABORATIVE-BINDERS-CLIENTS-DARK-V1'
      status = 'pass'
      project_ref = 'ycdxbpibncqcchqiihfz'
      head_sha = $ExpectedHeadSha
      created_at_utc = $now.ToString('o')
      expires_at_utc = $now.AddHours(2).ToString('o')
      clients_dark = $true
      reviewed_by_operator = $true
      canonical_db_flag_mapping = $canonicalDbFlagMapping
      web_flags = $webProof.flags
      web = [ordered]@{
        production_origin = 'https://grookaivault.com'
        deployment_id = $WebDeploymentId
        deployment_commit_sha = $ExpectedHeadSha
        observed_at_utc = $WebObservedAtUtc.ToUniversalTime().ToString('o')
        proof_file = 'web-production-observation.json'
        proof_sha256 = Get-BinderActivationSha256V1 `
          -Path $webProofTarget
      }
      mobile = [ordered]@{
        application_id = 'com.grookai.vault'
        build_head_sha = $ExpectedHeadSha
        version_name = $MobileVersionName
        version_code = $MobileVersionCode
        apk_sha256 = $apkSha256
        observed_at_utc =
          $MobileObservedAtUtc.ToUniversalTime().ToString('o')
        proof_file = 'samsung-install-observation.json'
        proof_sha256 = Get-BinderActivationSha256V1 `
          -Path $mobileProofTarget
        flags = $mobileProof.flags
      }
    }
    $evidence = [ordered]@{}
    foreach ($entry in $core.GetEnumerator()) {
      $evidence[$entry.Key] = $entry.Value
    }
    $evidence.evidence_fingerprint_sha256 =
      Get-CanonicalSha256V1 -Value $core
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $root 'clients-dark-evidence.json') `
      -Value $evidence
    Write-BinderActivationChecksumsV1 -Root $root
    return Test-BinderActivationClientsDarkEvidenceV1 `
      -Path $root `
      -ExpectedHeadSha $ExpectedHeadSha `
      -ExpectedWebDeploymentId $WebDeploymentId `
      -ExpectedMobileVersionName $MobileVersionName `
      -ExpectedMobileVersionCode $MobileVersionCode `
      -ExpectedMobileApkSha256 $apkSha256 `
      -RepoRoot $RepoRoot
  } catch {
    throw
  }
}

function Get-BinderActivationPolicyV1 {
  [CmdletBinding()]
  param(
    [string]$RepoRoot = $script:ActivationRepoRoot
  )

  $manifestPath = Join-Path (
    [IO.Path]::GetFullPath($RepoRoot)
  ) 'scripts/ops/collaborative_binders_activation_manifest_v1.json'
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $manifestPath -PathType Leaf
  ) 'Binder activation manifest is missing.'
  $manifestItem = Get-Item -LiteralPath $manifestPath
  Assert-BinderActivationConditionV1 (
    -not $manifestItem.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)
  ) 'Binder activation manifest must not be a reparse point.'
  $manifest = Get-Content -LiteralPath $manifestPath -Raw |
    ConvertFrom-Json -AsHashtable
  Assert-BinderActivationConditionV1 (
    $manifest.schema_version -eq 1
  ) 'Binder activation manifest schema is invalid.'
  Assert-BinderActivationConditionV1 (
    $manifest.package_id -ceq 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
  ) 'Binder activation package id is invalid.'
  Assert-BinderActivationConditionV1 (
    [string]$manifest.production_project_ref -ceq
      'ycdxbpibncqcchqiihfz'
  ) 'Binder activation production project is invalid.'

  $core = [ordered]@{}
  foreach ($entry in $manifest.GetEnumerator()) {
    if ($entry.Key -cne 'package_fingerprint_sha256') {
      $core[$entry.Key] = $entry.Value
    }
  }
  $fingerprint = Get-CanonicalSha256V1 -Value $core
  Assert-BinderActivationConditionV1 (
    $fingerprint -ceq [string]$manifest.package_fingerprint_sha256
  ) 'Binder activation package fingerprint mismatch.'
  Assert-BinderActivationConditionV1 (
    @($manifest.phases).Count -eq 8
  ) 'Binder activation manifest must contain exactly eight phases.'
  $expectedActivationSources = @(
    'scripts/ops/CollaborativeBindersActivationV1.psm1',
    'scripts/ops/collaborative_binders_activation_apply_v1.ps1',
    'scripts/ops/collaborative_binders_activation_kill_switch_v1.ps1',
    'scripts/ops/collaborative_binders_activation_preflight_v1.ps1',
    'scripts/ops/collaborative_binders_activation_recovery_v1.ps1',
    'scripts/ops/collaborative_binders_activation_source_validate_v1.ps1',
    'scripts/ops/collaborative_binders_backup_watch_v1.ps1',
    'scripts/ops/collaborative_binders_clients_dark_evidence_v1.ps1'
  ) | Sort-Object
  $actualActivationSources = @(
    $manifest.activation_sources |
      ForEach-Object { [string]$_.file } |
      Sort-Object
  )
  Assert-BinderActivationConditionV1 (
    (@($actualActivationSources) -join "`n") -ceq
      (@($expectedActivationSources) -join "`n")
  ) 'Binder activation source inventory is incomplete or unexpected.'
  $expectedWebClientFlags = @(
    'GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED',
    'GROOKAI_BINDERS_PERSONAL_V1_ENABLED',
    'GROOKAI_BINDERS_SHARED_V1_ENABLED',
    'GROOKAI_BINDERS_VIEW_LINKS_V1_ENABLED',
    'GROOKAI_BINDERS_PUBLIC_V1_ENABLED',
    'GROOKAI_BINDERS_COMMUNITY_V1_ENABLED',
    'GROOKAI_BINDERS_TEMPLATES_V1_ENABLED',
    'GROOKAI_BINDERS_NOTIFICATIONS_V1_ENABLED',
    'GROOKAI_BINDERS_PULSE_SHARING_V1_ENABLED',
    'GROOKAI_BINDERS_SET_V1_ENABLED',
    'GROOKAI_BINDERS_CUSTOM_V1_ENABLED'
  )
  $expectedSamsungCompileFlags = @(
    'BINDERS_SCHEMA_V1',
    'BINDERS_PERSONAL_V1',
    'BINDERS_SHARED_V1',
    'BINDERS_VIEW_LINKS_V1',
    'BINDERS_PUBLIC_V1',
    'BINDERS_COMMUNITY_V1',
    'BINDERS_TEMPLATES_V1',
    'BINDERS_NOTIFICATIONS_V1',
    'BINDERS_PULSE_SHARING_V1',
    'BINDERS_SET_TARGET_V1',
    'BINDERS_CUSTOM_TARGET_V1'
  )
  Assert-BinderActivationConditionV1 (
    [string]$manifest.rollout_model -ceq
      'clients_dark_empty_domain' -and
    [int]$manifest.clients_dark_through_phase_sequence -eq 8 -and
    $manifest.binder_domain_must_remain_empty -eq $true -and
    $manifest.backup_chain_required -eq $true -and
    [int]$manifest.installation_evidence_ttl_hours -eq 24 -and
    [int]$manifest.prior_evidence_ttl_hours -eq 2 -and
    [int]$manifest.backup_max_activation_recovery_lag_minutes -eq 1440 -and
    (
      [int]$manifest.installation_evidence_ttl_hours * 60
    ) -eq [int]$manifest.backup_max_activation_recovery_lag_minutes -and
    $manifest.clients_dark_evidence_required -eq $true -and
    [int]$manifest.clients_dark_evidence_ttl_hours -eq 2 -and
    [string]$manifest.clients_dark_evidence_package_id -ceq
      'COLLABORATIVE-BINDERS-CLIENTS-DARK-V1' -and
    [string]$manifest.clients_dark_web_origin -ceq
      'https://grookaivault.com' -and
    [string]$manifest.clients_dark_mobile_application_id -ceq
      'com.grookai.vault' -and
    (@($manifest.clients_dark_web_flag_keys) -join "`n") -ceq
      (@($expectedWebClientFlags) -join "`n") -and
    (@($manifest.clients_dark_samsung_compile_flag_keys) -join "`n") -ceq
      (@($expectedSamsungCompileFlags) -join "`n")
  ) (
    'Binder activation must remain clients_dark with an empty Binder ' +
    'domain through phase eight.'
  )

  return [pscustomobject][ordered]@{
    ManifestPath = $manifestPath
    Manifest = $manifest
    PackageFingerprintSha256 = $fingerprint
  }
}

function Get-BinderActivationPhaseV1 {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
      'schema_internal',
      'personal',
      'shared',
      'view_links',
      'public',
      'community',
      'custom',
      'templates'
    )]
    [string]$Phase,

    [string]$RepoRoot = $script:ActivationRepoRoot
  )

  $policy = Get-BinderActivationPolicyV1 -RepoRoot $RepoRoot
  $matches = @(
    $policy.Manifest.phases |
      Where-Object { [string]$_.flag_key -ceq $Phase }
  )
  Assert-BinderActivationConditionV1 (
    $matches.Count -eq 1
  ) 'Binder activation phase was not identified exactly once.'
  return [pscustomobject][ordered]@{
    Policy = $policy
    Phase = $matches[0]
  }
}

function Assert-BinderActivationSourceV1 {
  [CmdletBinding()]
  param(
    [string]$RepoRoot = $script:ActivationRepoRoot
  )

  $resolvedRepoRoot = [IO.Path]::GetFullPath($RepoRoot)
  $policy = Get-BinderActivationPolicyV1 -RepoRoot $resolvedRepoRoot
  $manifest = $policy.Manifest

  $sourceEntries = @(
    $manifest.production_rollout_module,
    $manifest.production_manifest,
    $manifest.installation_readback,
    $manifest.activation_readback
  ) + @($manifest.phases) + @($manifest.activation_sources) + @(
    $manifest.recovery_entrypoint,
    [ordered]@{
      file = [string]$manifest.kill_switch.file
      sha256 = [string]$manifest.kill_switch.sha256
    },
    [ordered]@{
      file = [string]$manifest.kill_switch.entrypoint_file
      sha256 = [string]$manifest.kill_switch.entrypoint_sha256
    }
  )
  foreach ($entry in $sourceEntries) {
    $path = Join-Path $resolvedRepoRoot ([string]$entry.file)
    Assert-BinderActivationConditionV1 (
      Test-Path -LiteralPath $path -PathType Leaf
    ) "Binder activation source file is missing: $($entry.file)"
    $item = Get-Item -LiteralPath $path
    Assert-BinderActivationConditionV1 (
      -not $item.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)
    ) "Binder activation source file is a reparse point: $($entry.file)"
    Assert-BinderActivationConditionV1 (
      (Get-BinderActivationSha256V1 -Path $path) -ceq
        [string]$entry.sha256
    ) "Binder activation source hash mismatch: $($entry.file)"
  }
  $killSqlPath = Join-Path $resolvedRepoRoot (
    [string]$manifest.kill_switch.file
  )
  $killSql = Get-Content -LiteralPath $killSqlPath -Raw
  Assert-BinderActivationConditionV1 (
    ([regex]::Matches(
      $killSql,
      '(?im)^\s*update\s+public\.binder_feature_flags\s+target\s*$'
    )).Count -eq 1 -and
    ([regex]::Matches($killSql, ';')).Count -eq 1 -and
    $killSql -cmatch '(?i)\bset\s+enabled\s*=\s*false\b' -and
    $killSql -cmatch (
      "(?i)where\s+target\.flag_key\s*=\s*'schema_internal'"
    ) -and
    $killSql -cnotmatch '(?i)\bset\s+enabled\s*=\s*true\b'
  ) 'Binder activation kill-switch SQL lost its one-target contract.'

  $expectedSequence = 1
  $expectedBefore = @()
  foreach ($phase in @($manifest.phases)) {
    Assert-BinderActivationConditionV1 (
      [int]$phase.sequence -eq $expectedSequence
    ) 'Binder activation phase sequence is not contiguous.'
    Assert-BinderActivationConditionV1 (
      (@($phase.enabled_before) -join "`n") -ceq
        (@($expectedBefore) -join "`n")
    ) "Binder activation prior vector is invalid for $($phase.flag_key)."
    $expectedAfter = @($expectedBefore + [string]$phase.flag_key) |
      Sort-Object
    Assert-BinderActivationConditionV1 (
      (@($phase.enabled_after) -join "`n") -ceq
        (@($expectedAfter) -join "`n")
    ) "Binder activation result vector is invalid for $($phase.flag_key)."

    $sqlPath = Join-Path $resolvedRepoRoot ([string]$phase.file)
    $sql = Get-Content -LiteralPath $sqlPath -Raw
    Assert-BinderActivationConditionV1 (
      ([regex]::Matches(
        $sql,
        '(?im)^\s*update\s+public\.binder_feature_flags\s+target\s*$'
      )).Count -eq 1
    ) "Activation SQL must update the flag table exactly once: $($phase.file)"
    $forbiddenMutationTokens = @(
      [regex]::Matches(
        $sql,
        '(?i)\b(?:insert|delete|merge|alter|create|drop|' +
        'truncate|copy|call|do|execute|grant|revoke|refresh|' +
        'vacuum|analyze)\b'
      )
    )
    Assert-BinderActivationConditionV1 (
      $forbiddenMutationTokens.Count -eq 0
    ) (
      'Activation SQL must contain only its one literal UPDATE mutation: ' +
      $phase.file
    )
    Assert-BinderActivationConditionV1 (
      ([regex]::Matches($sql, ';')).Count -eq 1
    ) "Activation SQL must contain exactly one prepared statement: $($phase.file)"
    Assert-BinderActivationConditionV1 (
      $sql -cmatch (
        "where target\.flag_key = '" +
        [regex]::Escape([string]$phase.flag_key) +
        "'"
      )
    ) "Activation SQL target is not literal and exact: $($phase.file)"
    Assert-BinderActivationConditionV1 (
      [string]$phase.flag_key -cnotin @(
        'notifications',
        'pulse_milestones',
        'set_binders'
      )
    ) "Activation SQL targets an excluded flag: $($phase.file)"

    $expectedBefore = @($phase.enabled_after)
    $expectedSequence += 1
  }
  Assert-BinderActivationConditionV1 (
    (@($manifest.final_enabled_flags) -join "`n") -ceq
      (@($expectedBefore) -join "`n")
  ) 'Binder activation final vector is invalid.'
  Assert-BinderActivationConditionV1 (
    (@($manifest.excluded_flags) -join "`n") -ceq
      (@('notifications', 'pulse_milestones', 'set_binders') -join "`n")
  ) 'Binder activation excluded flags are invalid.'
  Assert-BinderActivationConditionV1 (
    [string]$manifest.excluded_project_phase -ceq 'P8'
  ) 'Binder activation must keep P8 excluded.'
  Assert-BinderActivationConditionV1 (
    [string]$manifest.required_installation_head_sha -ceq
      'a29680bdf79409823eedab8a62f0bd5cc89d675c'
  ) 'Binder installation source HEAD requirement changed.'

  $rollout = Test-BinderSourceV1 -RepoRoot $resolvedRepoRoot
  Assert-BinderActivationConditionV1 (
    $rollout.PackageFingerprintSha256 -ceq
      [string]$manifest.required_installation_package_fingerprint_sha256
  ) 'Installed Binder package fingerprint requirement changed.'
  $supabaseExecutable = Resolve-BinderSupabaseExecutableV1
  Assert-BinderActivationConditionV1 (
    $rollout.SupabaseCliVersion -ceq
      [string]$manifest.supported_supabase_cli_version
  ) 'Activation Supabase CLI version requirement changed.'
  Assert-BinderActivationConditionV1 (
    $rollout.SupabaseCliLauncherSha256 -ceq
      [string]$manifest.supabase_cli_launcher_sha256
  ) 'Activation Supabase CLI launcher requirement changed.'
  Assert-BinderActivationConditionV1 (
    $rollout.SupabaseCliBinarySha256 -ceq
      [string]$manifest.supabase_cli_binary_sha256
  ) 'Activation Supabase CLI binary requirement changed.'
  Assert-BinderActivationConditionV1 (
    $rollout.SupabaseCliShimDescriptorSha256 -ceq
      [string]$manifest.supabase_cli_shim_descriptor_sha256
  ) 'Activation Supabase CLI shim requirement changed.'
  return [pscustomobject][ordered]@{
    PackageId = [string]$manifest.package_id
    PackageFingerprintSha256 = $policy.PackageFingerprintSha256
    ProjectRef = [string]$manifest.production_project_ref
    PhaseCount = @($manifest.phases).Count
    FinalEnabledFlags = @($manifest.final_enabled_flags)
    ExcludedFlags = @($manifest.excluded_flags)
    RolloutModel = [string]$manifest.rollout_model
    BinderDomainMustRemainEmpty =
      [bool]$manifest.binder_domain_must_remain_empty
    RolloutPackageFingerprintSha256 = $rollout.PackageFingerprintSha256
    SupabaseCliVersion = $rollout.SupabaseCliVersion
    SupabaseCliLauncherSha256 = $rollout.SupabaseCliLauncherSha256
    SupabaseCliBinarySha256 = $rollout.SupabaseCliBinarySha256
    SupabaseCliShimDescriptorSha256 =
      $rollout.SupabaseCliShimDescriptorSha256
    SupabaseCliLauncherPath = $supabaseExecutable.LauncherPath
    SupabaseCliBinaryPath = $supabaseExecutable.BinaryPath
    SupabaseCliShimDescriptorPath =
      $supabaseExecutable.ShimDescriptorPath
  }
}

function Assert-BinderActivationRepositoryV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedHeadSha
  )

  $installationHeadSha =
    'a29680bdf79409823eedab8a62f0bd5cc89d675c'
  $sealedActivationHeadSha =
    '67a33dbe0b69e930d064094ece9c8cf167fe6536'
  $reviewedSafeMainHeadSha =
    'd01a2d818513175061db8b6e9280c9850319b5ab'
  $allowedInstallationTransitionPaths = @(
    'scripts/ops/CollaborativeBindersActivationV1.psm1',
    'scripts/ops/collaborative_binders_activation_apply_v1.ps1',
    'scripts/ops/collaborative_binders_activation_kill_switch_v1.ps1',
    'scripts/ops/collaborative_binders_activation_manifest_v1.json',
    'scripts/ops/collaborative_binders_activation_preflight_v1.ps1',
    'scripts/ops/collaborative_binders_activation_recovery_v1.ps1',
    'scripts/ops/collaborative_binders_activation_source_validate_v1.ps1',
    'scripts/ops/collaborative_binders_clients_dark_evidence_v1.ps1',
    'tests/contracts/collaborative_binders_activation_v1.test.mjs'
  )
  $allowedCurrentGuardTransitionPaths = @(
    'scripts/ops/CollaborativeBindersActivationV1.psm1',
    'scripts/ops/collaborative_binders_activation_apply_v1.ps1',
    'scripts/ops/collaborative_binders_activation_kill_switch_v1.ps1',
    'scripts/ops/collaborative_binders_activation_manifest_v1.json',
    'scripts/ops/collaborative_binders_activation_preflight_v1.ps1',
    'scripts/ops/collaborative_binders_activation_recovery_v1.ps1',
    'scripts/ops/collaborative_binders_activation_source_validate_v1.ps1',
    'scripts/ops/collaborative_binders_clients_dark_evidence_v1.ps1',
    'tests/contracts/collaborative_binders_activation_v1.test.mjs'
  )
  $protectedTreePaths = @(
    '.metadata',
    'analysis_options.yaml',
    'android',
    'apps',
    'backend',
    'deno.lock',
    'ios',
    'lib',
    'linux',
    'macos',
    'package-lock.json',
    'pubspec.lock',
    'pubspec.yaml',
    'scripts/ops',
    'supabase',
    'test',
    'web',
    'windows'
  )
  $policy = Get-BinderActivationPolicyV1 -RepoRoot $RepoRoot
  $manifest = $policy.Manifest
  Assert-BinderActivationConditionV1 (
    [string]$manifest.required_installation_head_sha -ceq
      $installationHeadSha -and
    [string]$manifest.sealed_activation_head_sha -ceq
      $sealedActivationHeadSha -and
    [string]$manifest.reviewed_safe_main_head_sha -ceq
      $reviewedSafeMainHeadSha -and
    (@($manifest.installation_to_sealed_transition_paths) -join "`n") -ceq
      (@($allowedInstallationTransitionPaths) -join "`n") -and
    (@($manifest.safe_main_to_current_transition_paths) -join "`n") -ceq
      (@($allowedCurrentGuardTransitionPaths) -join "`n") -and
    (@($manifest.protected_tree_paths) -join "`n") -ceq
      (@($protectedTreePaths) -join "`n")
  ) 'Binder activation repository continuity policy is not exact.'
  Assert-BinderActivationConditionV1 (
    $ExpectedHeadSha -ceq $sealedActivationHeadSha
  ) 'Binder activation evidence HEAD is not the sealed activation HEAD.'

  $currentRepositoryHeadSha = & $script:RolloutModule {
    param($TargetRepoRoot)
    $head = Invoke-BinderGitV1 `
      -Arguments @('rev-parse', 'HEAD') `
      -RepoRoot $TargetRepoRoot
    Assert-BinderCommandSucceededV1 `
      -Result $head `
      -Label 'Binder current repository HEAD check'
    $headSha = $head.StdOut.Trim()
    Assert-BinderConditionV1 (
      $headSha -cmatch '^[0-9a-f]{40}$'
    ) 'Binder current repository HEAD is invalid.'
    return $headSha
  } $RepoRoot
  $repository = & $script:RolloutModule {
    param($TargetRepoRoot, $TargetHeadSha)
    Assert-BinderRepositoryStateV1 `
      -RepoRoot $TargetRepoRoot `
      -ExpectedHeadSha $TargetHeadSha
  } $RepoRoot $currentRepositoryHeadSha

  $installationTransition = & $script:RolloutModule {
    param(
      $TargetRepoRoot,
      $InstallationHead,
      $SealedActivationHead
    )
    $ancestor = Invoke-BinderGitV1 `
      -Arguments @(
        'merge-base',
        '--is-ancestor',
        $InstallationHead,
        $SealedActivationHead
      ) `
      -RepoRoot $TargetRepoRoot
    Assert-BinderCommandSucceededV1 `
      -Result $ancestor `
      -Label 'Binder installation-to-sealed-activation ancestor check'
    $diff = Invoke-BinderGitV1 `
      -Arguments @(
        'diff',
        '--name-only',
        '--diff-filter=ACDMRTUXB',
        "$InstallationHead..$SealedActivationHead"
      ) `
      -RepoRoot $TargetRepoRoot
    Assert-BinderCommandSucceededV1 `
      -Result $diff `
      -Label 'Binder installation-to-sealed-activation path check'
    return @(
      $diff.StdOut -split '\r?\n' |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
  } $RepoRoot $installationHeadSha $ExpectedHeadSha
  Assert-BinderActivationConditionV1 (
    (@($installationTransition | Sort-Object) -join "`n") -ceq
      (@($allowedInstallationTransitionPaths | Sort-Object) -join "`n")
  ) 'Binder installation-to-sealed-activation transition changed outside the exact guard allowlist.'

  $repositoryContinuity = & $script:RolloutModule {
    param(
      $TargetRepoRoot,
      $SealedActivationHead,
      $ReviewedSafeMainHead,
      $CurrentHead,
      $ProtectedPaths
    )
    $sealedToReviewedAncestor = Invoke-BinderGitV1 `
      -Arguments @(
        'merge-base',
        '--is-ancestor',
        $SealedActivationHead,
        $ReviewedSafeMainHead
      ) `
      -RepoRoot $TargetRepoRoot
    Assert-BinderCommandSucceededV1 `
      -Result $sealedToReviewedAncestor `
      -Label 'Binder sealed-to-reviewed-main ancestor check'
    $reviewedToCurrentAncestor = Invoke-BinderGitV1 `
      -Arguments @(
        'merge-base',
        '--is-ancestor',
        $ReviewedSafeMainHead,
        $CurrentHead
      ) `
      -RepoRoot $TargetRepoRoot
    Assert-BinderCommandSucceededV1 `
      -Result $reviewedToCurrentAncestor `
      -Label 'Binder reviewed-main-to-current ancestor check'

    $protectedObjects = @(
      foreach ($path in @($ProtectedPaths)) {
        $sealedObject = Invoke-BinderGitV1 `
          -Arguments @(
            'rev-parse',
            ('{0}:{1}' -f $SealedActivationHead, $path)
          ) `
          -RepoRoot $TargetRepoRoot
        Assert-BinderCommandSucceededV1 `
          -Result $sealedObject `
          -Label "Binder sealed protected object check: $path"
        $reviewedObject = Invoke-BinderGitV1 `
          -Arguments @(
            'rev-parse',
            ('{0}:{1}' -f $ReviewedSafeMainHead, $path)
          ) `
          -RepoRoot $TargetRepoRoot
        Assert-BinderCommandSucceededV1 `
          -Result $reviewedObject `
          -Label "Binder reviewed-main protected object check: $path"
        $sealedObjectSha = $sealedObject.StdOut.Trim()
        $reviewedObjectSha = $reviewedObject.StdOut.Trim()
        Assert-BinderConditionV1 (
          $sealedObjectSha -cmatch '^[0-9a-f]{40}$' -and
          $reviewedObjectSha -cmatch '^[0-9a-f]{40}$' -and
          $sealedObjectSha -ceq $reviewedObjectSha
        ) "Binder protected object changed in reviewed main: $path"
        [pscustomobject][ordered]@{
          path = [string]$path
          sealed_object_sha = $sealedObjectSha
          reviewed_main_object_sha = $reviewedObjectSha
        }
      }
    )

    $diff = Invoke-BinderGitV1 `
      -Arguments @(
        'diff',
        '--name-only',
        '--diff-filter=ACDMRTUXB',
        "$ReviewedSafeMainHead..$CurrentHead"
      ) `
      -RepoRoot $TargetRepoRoot
    Assert-BinderCommandSucceededV1 `
      -Result $diff `
      -Label 'Binder reviewed-main-to-current guard path check'
    $transitionPaths = @(
      $diff.StdOut -split '\r?\n' |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
    return [pscustomobject][ordered]@{
      TransitionPaths = @($transitionPaths)
      ProtectedObjects = @($protectedObjects)
    }
  } `
    $RepoRoot `
    $sealedActivationHeadSha `
    $reviewedSafeMainHeadSha `
    $currentRepositoryHeadSha `
    $protectedTreePaths
  Assert-BinderActivationConditionV1 (
    (@($repositoryContinuity.TransitionPaths | Sort-Object) -join "`n") -ceq
      (@($allowedCurrentGuardTransitionPaths | Sort-Object) -join "`n")
  ) 'Binder reviewed-main-to-current transition changed outside the exact guard allowlist.'

  return [pscustomobject][ordered]@{
    HeadSha = $ExpectedHeadSha
    ActivationHeadSha = $ExpectedHeadSha
    CurrentRepositoryHeadSha = [string]$repository.HeadSha
    OriginMainSha = [string]$repository.OriginMainSha
    Branch = [string]$repository.Branch
    Clean = [bool]$repository.Clean
    InstallationHeadSha = $installationHeadSha
    InstallationHeadIsAncestor = $true
    SealedActivationHeadSha = $sealedActivationHeadSha
    ReviewedSafeMainHeadSha = $reviewedSafeMainHeadSha
    ProtectedTreePaths = @($protectedTreePaths)
    ProtectedObjects = @($repositoryContinuity.ProtectedObjects)
    InstallationTransitionPaths = @($installationTransition)
    CurrentGuardTransitionPaths =
      @($repositoryContinuity.TransitionPaths)
  }
}

function Resolve-BinderSupabaseExecutableV1 {
  return & $script:RolloutModule {
    Get-BinderSupabaseExecutableV1
  }
}

function Invoke-BinderActivationSupabaseV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [int]$TimeoutSeconds = 60,

    [object]$ProcessLifecycle,

    [string]$ExecutablePath
  )

  return & $script:RolloutModule {
    param(
      $TargetArguments,
      $TargetRepoRoot,
      $TargetTimeout,
      $TargetLifecycle,
      $TargetExecutablePath
    )
    Invoke-BinderSupabaseV1 `
      -Arguments @($TargetArguments) `
      -RepoRoot $TargetRepoRoot `
      -TimeoutSeconds $TargetTimeout `
      -ProcessLifecycle $TargetLifecycle `
      -ExecutablePath $TargetExecutablePath
  } $Arguments $RepoRoot $TimeoutSeconds $ProcessLifecycle $ExecutablePath
}

function Assert-BinderActivationCommandSucceededV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Result,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  Assert-BinderActivationConditionV1 (
    $null -ne $Result.PSObject.Properties['OutputTruncated'] -and
    $Result.OutputTruncated -eq $false
  ) "$Label output capture was truncated or did not report truncation state."
  & $script:RolloutModule {
    param($TargetResult, $TargetLabel)
    Assert-BinderCommandSucceededV1 `
      -Result $TargetResult `
      -Label $TargetLabel
  } $Result $Label
}

function Invoke-BinderActivationReadbackV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string[]]$ExpectedEnabledFlags,

    [string[]]$AlternateEnabledFlags,

    [string]$ExecutablePath
  )

  $policy = Get-BinderActivationPolicyV1 -RepoRoot $RepoRoot
  $sqlPath = Join-Path $RepoRoot (
    [string]$policy.Manifest.activation_readback.file
  )
  $expectedHash = [string]$policy.Manifest.activation_readback.sha256
  $seal = [IO.File]::Open(
    $sqlPath,
    [IO.FileMode]::Open,
    [IO.FileAccess]::Read,
    [IO.FileShare]::Read
  )
  try {
    Assert-BinderActivationConditionV1 (
      (Get-BinderActivationSha256V1 -Path $sqlPath) -ceq $expectedHash
    ) 'Activation readback SQL hash changed.'
    & $script:RolloutModule {
      param($TargetPath)
      Assert-BinderSqlReadOnlyV1 -Path $TargetPath
    } $sqlPath
    $command = Invoke-BinderActivationSupabaseV1 `
      -Arguments @(
        'db',
        'query',
        '--linked',
        '--file',
        $sqlPath,
        '--output',
        'json',
        '--agent',
        'no'
      ) `
      -RepoRoot $RepoRoot `
      -TimeoutSeconds 60 `
      -ExecutablePath $ExecutablePath
    Assert-BinderActivationCommandSucceededV1 `
      -Result $command `
      -Label 'Binder activation catalog readback'
    $rows = @($command.StdOut | ConvertFrom-Json)
    Assert-BinderActivationConditionV1 (
      $rows.Count -eq 1 -and
      $null -ne $rows[0].rollout_readback
    ) 'Activation readback must return exactly one report.'
    $report = $rows[0].rollout_readback
    Assert-BinderActivationConditionV1 (
      $report.read_only -eq $true -and
      $report.phase -ceq 'activation' -and
      $report.ok -eq $true
    ) 'Activation readback failed its catalog contract.'
    $raw = @($report.checks.enabled_flags)
    $effective = @($report.checks.effective_enabled_flags)
    $rawText = $raw -join "`n"
    $effectiveText = $effective -join "`n"
    $expectedText = $ExpectedEnabledFlags -join "`n"
    $alternateText = if ($PSBoundParameters.ContainsKey(
      'AlternateEnabledFlags'
    )) {
      $AlternateEnabledFlags -join "`n"
    } else {
      $null
    }
    $matchesExpected = $rawText -ceq $expectedText
    $matchesAlternate = (
      $null -ne $alternateText -and
      $rawText -ceq $alternateText
    )
    Assert-BinderActivationConditionV1 (
      $matchesExpected -or $matchesAlternate
    ) 'Activation raw flag vector does not match an allowed phase vector.'
    Assert-BinderActivationConditionV1 (
      $effectiveText -ceq $rawText
    ) 'Activation effective flag vector does not match its raw vector.'
    return [pscustomobject][ordered]@{
      Command = $command
      Report = $report
      ReportSha256 = Get-CanonicalSha256V1 -Value $report
      MatchedVector = if ($matchesExpected) {
        'expected'
      } else {
        'alternate'
      }
    }
  } finally {
    $seal.Dispose()
  }
}

function Invoke-BinderActivationDiagnosticReadbackV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string[]]$EnabledBefore,

    [Parameter(Mandatory = $true)]
    [string[]]$EnabledAfter,

    [string]$ExecutablePath
  )

  $policy = Get-BinderActivationPolicyV1 -RepoRoot $RepoRoot
  $sqlPath = Join-Path $RepoRoot (
    [string]$policy.Manifest.activation_readback.file
  )
  $seal = [IO.File]::Open(
    $sqlPath,
    [IO.FileMode]::Open,
    [IO.FileAccess]::Read,
    [IO.FileShare]::Read
  )
  try {
    Assert-BinderActivationConditionV1 (
      (Get-BinderActivationSha256V1 -Path $sqlPath) -ceq
        [string]$policy.Manifest.activation_readback.sha256
    ) 'Diagnostic activation readback SQL hash changed.'
    & $script:RolloutModule {
      param($TargetPath)
      Assert-BinderSqlReadOnlyV1 -Path $TargetPath
    } $sqlPath
    $command = Invoke-BinderActivationSupabaseV1 `
      -Arguments @(
        'db',
        'query',
        '--linked',
        '--file',
        $sqlPath,
        '--output',
        'json',
        '--agent',
        'no'
      ) `
      -RepoRoot $RepoRoot `
      -TimeoutSeconds 60 `
      -ExecutablePath $ExecutablePath
    Assert-BinderActivationCommandSucceededV1 `
      -Result $command `
      -Label 'Binder activation state-neutral diagnostic readback'
    $rows = @($command.StdOut | ConvertFrom-Json)
    Assert-BinderActivationConditionV1 (
      $rows.Count -eq 1 -and
      $null -ne $rows[0].rollout_readback
    ) 'Diagnostic readback must return exactly one report.'
    $report = $rows[0].rollout_readback
    Assert-BinderActivationConditionV1 (
      $report.read_only -eq $true -and
      $report.phase -ceq 'activation'
    ) 'Diagnostic readback did not preserve its read-only contract.'
    $enabled_flags = @($report.checks.enabled_flags)
    $effective_enabled_flags = @(
      $report.checks.effective_enabled_flags
    )
    $rawText = $enabled_flags -join "`n"
    $effectiveText = $effective_enabled_flags -join "`n"
    $diagnostic_state = if ($effectiveText -cne $rawText) {
      'raw_effective_mismatch'
    } elseif ($rawText -ceq ($EnabledBefore -join "`n")) {
      'before'
    } elseif ($rawText -ceq ($EnabledAfter -join "`n")) {
      'after'
    } else {
      'unexpected'
    }
    return [pscustomobject][ordered]@{
      Command = $command
      Report = $report
      ReportSha256 = Get-CanonicalSha256V1 -Value $report
      DiagnosticState = $diagnostic_state
      EnabledFlags = $enabled_flags
      EffectiveEnabledFlags = $effective_enabled_flags
    }
  } finally {
    $seal.Dispose()
  }
}

function Assert-BinderActivationPriorEvidenceTimeV1 {
  param(
    [Parameter(Mandatory = $true)]
    [datetimeoffset]$CompletedAtUtc,

    [Parameter(Mandatory = $true)]
    [int]$PhaseSequence,

    [Parameter(Mandatory = $true)]
    [object]$Manifest,

    [Parameter(Mandatory = $true)]
    [datetimeoffset]$NowUtc
  )

  Assert-BinderActivationConditionV1 (
    $PhaseSequence -ge 1 -and
    $PhaseSequence -le 8
  ) 'Prior evidence phase sequence is invalid.'
  $ttlHours = if ($PhaseSequence -eq 1) {
    [int]$Manifest.installation_evidence_ttl_hours
  } else {
    [int]$Manifest.prior_evidence_ttl_hours
  }
  Assert-BinderActivationConditionV1 (
    ($PhaseSequence -ne 1 -or $ttlHours -eq 24) -and
    ($PhaseSequence -eq 1 -or $ttlHours -eq 2)
  ) 'Prior evidence phase-specific TTL is invalid.'
  Assert-BinderActivationConditionV1 (
    $CompletedAtUtc -le $NowUtc.AddMinutes(5) -and
    $CompletedAtUtc -ge $NowUtc.AddHours(-$ttlHours)
  ) 'Prior evidence is outside its phase-specific activation window.'
  return $ttlHours
}

function Test-BinderActivationPriorEvidenceV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [object]$Phase,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedHeadSha,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedWebDeploymentId,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedMobileVersionName,

    [Parameter(Mandatory = $true)]
    [int]$ExpectedMobileVersionCode,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedMobileApkSha256,

    [datetimeoffset]$NowUtc = [datetimeoffset]::UtcNow
  )

  $policy = Get-BinderActivationPolicyV1 -RepoRoot $RepoRoot
  $root = if ([int]$Phase.sequence -eq 1) {
    Assert-BinderInstallationEvidenceRootV1 `
      -Path $Path `
      -RepoRoot $RepoRoot
  } else {
    Assert-BinderActivationArtifactRootV1 `
      -Path $Path `
      -RepoRoot $RepoRoot
  }
  $installationPreflight = if ([int]$Phase.sequence -eq 1) {
    Test-BinderInstallationPreflightEvidenceV1 `
      -PreflightRoot (Split-Path -Parent $root) `
      -ApplyRoot $root
  } else {
    $null
  }
  $checksums = Test-BinderActivationChecksumsV1 -Root $root
  $resultPath = Join-Path $root 'apply-result.json'
  $readbackPath = Join-Path $root 'readback.after.json'
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $resultPath -PathType Leaf
  ) 'Prior evidence apply result is missing.'
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $readbackPath -PathType Leaf
  ) 'Prior evidence readback is missing.'
  $result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
  $readback = Get-Content -LiteralPath $readbackPath -Raw | ConvertFrom-Json
  $completed = ConvertTo-BinderActivationUtcV1 `
    -Value $result.completed_at_utc `
    -Label 'Prior evidence completion time'
  [void](Assert-BinderActivationPriorEvidenceTimeV1 `
    -CompletedAtUtc $completed `
    -PhaseSequence ([int]$Phase.sequence) `
    -Manifest $policy.Manifest `
    -NowUtc $NowUtc)
  $backup = $null
  $priorClientsDark = $null
  $installationEvidenceHeadSha = $null

  if ([int]$Phase.sequence -eq 1) {
    Assert-BinderActivationConditionV1 (
      $result.status -ceq 'pass' -and
      $result.package_id -ceq 'COLLABORATIVE-BINDERS-DB-V1' -and
      $result.package_fingerprint_sha256 -ceq
        [string]$policy.Manifest.required_installation_package_fingerprint_sha256 -and
      $result.project_ref -ceq 'ycdxbpibncqcchqiihfz' -and
      $result.head_sha -ceq
        [string]$policy.Manifest.required_installation_head_sha -and
      $result.push_succeeded -eq $true -and
      $result.push_termination_confirmed -eq $true -and
      [int]$result.feature_flags_enabled -eq 0
    ) 'Installation evidence is not a successful exact Binder apply.'
    Assert-BinderActivationConditionV1 (
      $readback.phase -ceq 'post_apply' -and
      $readback.ok -eq $true -and
      [int]$readback.checks.enabled_flag_count -eq 0 -and
      @($readback.checks.enabled_flags).Count -eq 0
    ) 'Installation evidence readback is invalid.'

    $installationManifestPath = $installationPreflight.ManifestPath
    $backupDigestPath = $installationPreflight.BackupDigestPath
    $installationManifest = & $script:RolloutModule {
      param($TargetPath, $TargetCompletedAtUtc)
      Test-PreflightManifestV1 `
        -Path $TargetPath `
        -NowUtc $TargetCompletedAtUtc
    } $installationManifestPath $completed.UtcDateTime
    Assert-BinderActivationConditionV1 (
      $installationManifest.Data.head_sha -ceq
        [string]$policy.Manifest.required_installation_head_sha -and
      $installationManifest.Data.origin_main_sha -ceq
        [string]$policy.Manifest.required_installation_head_sha -and
      $installationManifest.Data.project_ref -ceq
        'ycdxbpibncqcchqiihfz' -and
      $installationManifest.Data.package_fingerprint_sha256 -ceq
        [string]$policy.Manifest.required_installation_package_fingerprint_sha256
    ) 'Installation preflight manifest does not chain to activation.'
    $digest = Get-Content -Raw -LiteralPath $backupDigestPath |
      ConvertFrom-Json
    Assert-BinderActivationConditionV1 (
      $installationManifest.Data.backup_evidence_sha256 -ceq
        [string]$digest.Sha256 -and
      (Get-BinderActivationSha256V1 -Path ([string]$digest.Path)) -ceq
        [string]$digest.Sha256
    ) 'Installation backup evidence hash no longer matches its preflight.'
    $backup = [pscustomobject][ordered]@{
      backup_kind = [string]$digest.Kind
      backup_verified_at_utc = [string]$digest.VerifiedAtUtc
      backup_recoverable_through_utc =
        [string]$digest.RecoverableThroughUtc
      backup_evidence_reference = [string]$digest.EvidenceReference
      backup_evidence_sha256 = [string]$digest.Sha256
      restore_path_reviewed = [bool]$digest.RestorePathReviewed
    }
    $installationEvidenceHeadSha =
      [string]$policy.Manifest.required_installation_head_sha
  } else {
    $expectedPreviousSequence = [int]$Phase.sequence - 1
    $normalApply = (
      $result.status -ceq 'pass' -and
      $result.mutation_succeeded -eq $true -and
      $result.mutation_termination_confirmed -eq $true
    )
    $recoveredApply = (
      $result.status -ceq 'recovered_committed' -and
      $result.recovery_state -ceq 'after' -and
      $result.recovery_readback_succeeded -eq $true -and
      $result.mutation_performed_by_recovery -eq $false -and
      $result.automatic_retry_permitted -eq $false -and
      [string]$result.recovered_from_evidence_sha256 -cmatch
        '^[0-9a-f]{64}$'
    )
    Assert-BinderActivationConditionV1 (
      ($normalApply -or $recoveredApply) -and
      $result.package_id -ceq 'COLLABORATIVE-BINDERS-ACTIVATION-V1' -and
      $result.package_fingerprint_sha256 -ceq
        $policy.PackageFingerprintSha256 -and
      $result.project_ref -ceq 'ycdxbpibncqcchqiihfz' -and
      $result.head_sha -ceq $ExpectedHeadSha -and
      [string]$result.activation_head_sha -ceq $ExpectedHeadSha -and
      [string]$result.installation_evidence_head_sha -ceq
        [string]$policy.Manifest.required_installation_head_sha -and
      [int]$result.phase_sequence -eq $expectedPreviousSequence
    ) 'Prior activation evidence is invalid.'
    Assert-BinderActivationConditionV1 (
      (@($result.enabled_flags_after) -join "`n") -ceq
        (@($Phase.enabled_before) -join "`n")
    ) 'Prior activation result does not chain to this phase.'
    Assert-BinderActivationConditionV1 (
      $readback.phase -ceq 'activation' -and
      $readback.ok -eq $true -and
      (@($readback.checks.enabled_flags) -join "`n") -ceq
        (@($Phase.enabled_before) -join "`n") -and
      (@($readback.checks.effective_enabled_flags) -join "`n") -ceq
        (@($Phase.enabled_before) -join "`n")
    ) 'Prior activation readback does not chain to this phase.'
    $backup = [pscustomobject][ordered]@{
      backup_kind = [string]$result.backup_kind
      backup_verified_at_utc = [string]$result.backup_verified_at_utc
      backup_recoverable_through_utc =
        [string]$result.backup_recoverable_through_utc
      backup_evidence_reference =
        [string]$result.backup_evidence_reference
      backup_evidence_sha256 = [string]$result.backup_evidence_sha256
      restore_path_reviewed = [bool]$result.restore_path_reviewed
    }
    $priorClientsDark = [pscustomobject][ordered]@{
      root = [string]$result.clients_dark_evidence_root
      checksum_sha256 =
        [string]$result.clients_dark_evidence_checksum_sha256
      evidence_sha256 =
        [string]$result.clients_dark_evidence_sha256
      fingerprint_sha256 =
        [string]$result.clients_dark_evidence_fingerprint_sha256
      created_at_utc =
        [string]$result.clients_dark_evidence_created_at_utc
      expires_at_utc =
        [string]$result.clients_dark_expires_at_utc
      web_deployment_id =
        [string]$result.web_deployment_id
      web_deployment_commit_sha =
        [string]$result.web_deployment_commit_sha
      mobile_application_id =
        [string]$result.mobile_application_id
      mobile_version_name =
        [string]$result.mobile_version_name
      mobile_version_code =
        [int]$result.mobile_version_code
      mobile_apk_sha256 =
        [string]$result.mobile_apk_sha256
    }
    $installationEvidenceHeadSha =
      [string]$result.installation_evidence_head_sha
  }

  Assert-BinderActivationConditionV1 (
    @(
      'supabase_pitr',
      'supabase_platform_backup',
      'verified_logical_backup'
    ) -ccontains $backup.backup_kind -and
    $backup.backup_evidence_sha256 -cmatch '^[0-9a-f]{64}$' -and
    -not [string]::IsNullOrWhiteSpace(
      $backup.backup_evidence_reference
    ) -and
    $backup.restore_path_reviewed -eq $true
  ) 'Prior evidence does not preserve valid reviewed backup recovery data.'
  $backupVerified = ConvertTo-BinderActivationUtcV1 `
    -Value $backup.backup_verified_at_utc `
    -Label 'Prior backup verification time'
  $backupRecoverable = ConvertTo-BinderActivationUtcV1 `
    -Value $backup.backup_recoverable_through_utc `
    -Label 'Prior backup recoverable-through time'
  Assert-BinderActivationConditionV1 (
    $backupVerified -le $completed -and
    $backupRecoverable -le $backupVerified -and
    $backupVerified -le $NowUtc -and
    $backupRecoverable -le $NowUtc -and
    $backupRecoverable -ge $NowUtc.AddMinutes(
      -[int]$policy.Manifest.backup_max_activation_recovery_lag_minutes
    )
  ) 'Prior evidence backup recovery timestamps are inconsistent.'
  if ([int]$Phase.sequence -gt 1) {
    Assert-BinderActivationConditionV1 (
      -not [string]::IsNullOrWhiteSpace($priorClientsDark.root) -and
      $priorClientsDark.checksum_sha256 -cmatch '^[0-9a-f]{64}$' -and
      $priorClientsDark.fingerprint_sha256 -cmatch '^[0-9a-f]{64}$' -and
      $priorClientsDark.mobile_apk_sha256 -cmatch '^[0-9a-f]{64}$'
    ) 'Prior activation lost its clients-dark evidence chain.'
    $historicalClientsDark =
      Test-BinderActivationClientsDarkEvidenceV1 `
      -Path $priorClientsDark.root `
      -ExpectedHeadSha $ExpectedHeadSha `
      -ExpectedWebDeploymentId $ExpectedWebDeploymentId `
      -ExpectedMobileVersionName $ExpectedMobileVersionName `
      -ExpectedMobileVersionCode $ExpectedMobileVersionCode `
      -ExpectedMobileApkSha256 $ExpectedMobileApkSha256 `
      -RepoRoot $RepoRoot `
      -NowUtc $completed
    Assert-BinderActivationConditionV1 (
      $historicalClientsDark.ChecksumSha256 -ceq
        $priorClientsDark.checksum_sha256 -and
      $historicalClientsDark.EvidenceSha256 -ceq
        $priorClientsDark.evidence_sha256 -and
      $historicalClientsDark.EvidenceFingerprintSha256 -ceq
        $priorClientsDark.fingerprint_sha256 -and
      $historicalClientsDark.CreatedAtUtc -ceq
        $priorClientsDark.created_at_utc -and
      $historicalClientsDark.ExpiresAtUtc -ceq
        $priorClientsDark.expires_at_utc -and
      $historicalClientsDark.WebDeploymentId -ceq
        $priorClientsDark.web_deployment_id -and
      $historicalClientsDark.WebDeploymentCommitSha -ceq
        $priorClientsDark.web_deployment_commit_sha -and
      $historicalClientsDark.MobileApplicationId -ceq
        $priorClientsDark.mobile_application_id -and
      $historicalClientsDark.MobileVersionName -ceq
        $priorClientsDark.mobile_version_name -and
      $historicalClientsDark.MobileVersionCode -eq
        $priorClientsDark.mobile_version_code -and
      $historicalClientsDark.MobileApkSha256 -ceq
        $priorClientsDark.mobile_apk_sha256
    ) 'Prior activation clients-dark evidence changed.'
  }

  return [pscustomobject][ordered]@{
    Root = $root
    ActivationHeadSha = $ExpectedHeadSha
    InstallationEvidenceHeadSha = $installationEvidenceHeadSha
    ChecksumPath = $checksums.ChecksumPath
    ChecksumSha256 = $checksums.ChecksumSha256
    CompletedAtUtc = $completed.ToString('o')
    StableCatalogFingerprintSha256 =
      [string]$readback.checks.stable_catalog_fingerprint_sha256
    BackupKind = $backup.backup_kind
    BackupVerifiedAtUtc = $backupVerified.ToString('o')
    BackupRecoverableThroughUtc = $backupRecoverable.ToString('o')
    BackupEvidenceReference = $backup.backup_evidence_reference
    BackupEvidenceSha256 = $backup.backup_evidence_sha256
    RestorePathReviewed = $backup.restore_path_reviewed
    ClientsDarkEvidenceRoot = if ($null -ne $priorClientsDark) {
      $priorClientsDark.root
    } else {
      $null
    }
    ClientsDarkEvidenceChecksumSha256 = if (
      $null -ne $priorClientsDark
    ) {
      $priorClientsDark.checksum_sha256
    } else {
      $null
    }
    ClientsDarkEvidenceSha256 = if ($null -ne $priorClientsDark) {
      $priorClientsDark.evidence_sha256
    } else {
      $null
    }
    ClientsDarkEvidenceFingerprintSha256 = if (
      $null -ne $priorClientsDark
    ) {
      $priorClientsDark.fingerprint_sha256
    } else {
      $null
    }
    ClientsDarkEvidenceCreatedAtUtc = if ($null -ne $priorClientsDark) {
      $priorClientsDark.created_at_utc
    } else {
      $null
    }
    ClientsDarkExpiresAtUtc = if ($null -ne $priorClientsDark) {
      $priorClientsDark.expires_at_utc
    } else {
      $null
    }
    WebDeploymentId = if ($null -ne $priorClientsDark) {
      $priorClientsDark.web_deployment_id
    } else {
      $null
    }
    WebDeploymentCommitSha = if ($null -ne $priorClientsDark) {
      $priorClientsDark.web_deployment_commit_sha
    } else {
      $null
    }
    MobileApplicationId = if ($null -ne $priorClientsDark) {
      $priorClientsDark.mobile_application_id
    } else {
      $null
    }
    MobileVersionName = if ($null -ne $priorClientsDark) {
      $priorClientsDark.mobile_version_name
    } else {
      $null
    }
    MobileVersionCode = if ($null -ne $priorClientsDark) {
      $priorClientsDark.mobile_version_code
    } else {
      $null
    }
    MobileApkSha256 = if ($null -ne $priorClientsDark) {
      $priorClientsDark.mobile_apk_sha256
    } else {
      $null
    }
  }
}

function New-BinderActivationManifestV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Phase,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedHeadSha,

    [Parameter(Mandatory = $true)]
    [object]$Policy,

    [Parameter(Mandatory = $true)]
    [object]$PriorEvidence,

    [Parameter(Mandatory = $true)]
    [object]$Readback,

    [Parameter(Mandatory = $true)]
    [object]$ClientsDarkEvidence,

    [datetimeoffset]$NowUtc = [datetimeoffset]::UtcNow
  )

  $core = [ordered]@{
    schema_version = 1
    package_id = [string]$Policy.Manifest.package_id
    package_fingerprint_sha256 = $Policy.PackageFingerprintSha256
    status = 'pass'
    created_at_utc = $NowUtc.ToString('o')
    expires_at_utc = $NowUtc.AddMinutes(30).ToString('o')
    project_ref = [string]$Policy.Manifest.production_project_ref
    head_sha = $ExpectedHeadSha
    activation_head_sha = $ExpectedHeadSha
    installation_evidence_head_sha =
      [string]$PriorEvidence.InstallationEvidenceHeadSha
    phase_sequence = [int]$Phase.sequence
    target_flag = [string]$Phase.flag_key
    rollout_model = [string]$Policy.Manifest.rollout_model
    clients_dark_through_phase_sequence =
      [int]$Policy.Manifest.clients_dark_through_phase_sequence
    binder_domain_must_remain_empty =
      [bool]$Policy.Manifest.binder_domain_must_remain_empty
    clients_dark_evidence_root =
      [string]$ClientsDarkEvidence.Root
    clients_dark_evidence_checksum_sha256 =
      [string]$ClientsDarkEvidence.ChecksumSha256
    clients_dark_evidence_sha256 =
      [string]$ClientsDarkEvidence.EvidenceSha256
    clients_dark_evidence_fingerprint_sha256 =
      [string]$ClientsDarkEvidence.EvidenceFingerprintSha256
    clients_dark_evidence_created_at_utc =
      [string]$ClientsDarkEvidence.CreatedAtUtc
    clients_dark_expires_at_utc =
      [string]$ClientsDarkEvidence.ExpiresAtUtc
    web_deployment_id =
      [string]$ClientsDarkEvidence.WebDeploymentId
    web_deployment_commit_sha =
      [string]$ClientsDarkEvidence.WebDeploymentCommitSha
    mobile_application_id =
      [string]$ClientsDarkEvidence.MobileApplicationId
    mobile_version_name =
      [string]$ClientsDarkEvidence.MobileVersionName
    mobile_version_code =
      [int]$ClientsDarkEvidence.MobileVersionCode
    mobile_apk_sha256 =
      [string]$ClientsDarkEvidence.MobileApkSha256
    enabled_before = @($Phase.enabled_before)
    enabled_after = @($Phase.enabled_after)
    phase_sql_file = [string]$Phase.file
    phase_sql_sha256 = [string]$Phase.sha256
    activation_readback_sha256 =
      [string]$Policy.Manifest.activation_readback.sha256
    prior_evidence_root = [string]$PriorEvidence.Root
    prior_evidence_checksum_sha256 =
      [string]$PriorEvidence.ChecksumSha256
    prior_evidence_completed_at_utc =
      [string]$PriorEvidence.CompletedAtUtc
    backup_kind = [string]$PriorEvidence.BackupKind
    backup_verified_at_utc =
      [string]$PriorEvidence.BackupVerifiedAtUtc
    backup_recoverable_through_utc =
      [string]$PriorEvidence.BackupRecoverableThroughUtc
    backup_evidence_reference =
      [string]$PriorEvidence.BackupEvidenceReference
    backup_evidence_sha256 =
      [string]$PriorEvidence.BackupEvidenceSha256
    restore_path_reviewed =
      [bool]$PriorEvidence.RestorePathReviewed
    readback_before_sha256 = [string]$Readback.ReportSha256
    stable_catalog_fingerprint_sha256 =
      [string]$Readback.Report.checks.stable_catalog_fingerprint_sha256
    apply_argv = @(
      'db',
      'query',
      '--linked',
      '--file',
      [string]$Phase.file,
      '--output',
      'json',
      '--agent',
      'no'
    )
  }
  $fingerprint = Get-CanonicalSha256V1 -Value $core
  $manifest = [ordered]@{}
  foreach ($entry in $core.GetEnumerator()) {
    $manifest[$entry.Key] = $entry.Value
  }
  $manifest.manifest_fingerprint_sha256 = $fingerprint
  return $manifest
}

function Invoke-BinderActivationPreflightV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
      'schema_internal',
      'personal',
      'shared',
      'view_links',
      'public',
      'community',
      'custom',
      'templates'
    )]
    [string]$Phase,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedHeadSha,

    [Parameter(Mandatory = $true)]
    [string]$PriorEvidenceRoot,

    [Parameter(Mandatory = $true)]
    [string]$ClientsDarkEvidenceRoot,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedWebDeploymentId,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedMobileVersionName,

    [Parameter(Mandatory = $true)]
    [int]$ExpectedMobileVersionCode,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedMobileApkSha256,

    [Parameter(Mandatory = $true)]
    [string]$ArtifactRoot,

    [string]$RepoRoot = $script:ActivationRepoRoot
  )

  [void](Assert-BinderActivationSourceV1 -RepoRoot $RepoRoot)
  [void](Assert-BinderActivationRepositoryV1 `
    -RepoRoot $RepoRoot `
    -ExpectedHeadSha $ExpectedHeadSha)
  [void](Assert-ProjectBindingV1 -RepoRoot $RepoRoot)
  $phaseEnvelope = Get-BinderActivationPhaseV1 `
    -Phase $Phase `
    -RepoRoot $RepoRoot
  $phasePolicy = $phaseEnvelope.Policy
  $phaseDefinition = $phaseEnvelope.Phase
  $prior = Test-BinderActivationPriorEvidenceV1 `
    -Path $PriorEvidenceRoot `
    -Phase $phaseDefinition `
    -ExpectedHeadSha $ExpectedHeadSha `
    -ExpectedWebDeploymentId $ExpectedWebDeploymentId `
    -ExpectedMobileVersionName $ExpectedMobileVersionName `
    -ExpectedMobileVersionCode $ExpectedMobileVersionCode `
    -ExpectedMobileApkSha256 $ExpectedMobileApkSha256 `
    -RepoRoot $RepoRoot
  $clientsDark = Test-BinderActivationClientsDarkEvidenceV1 `
    -Path $ClientsDarkEvidenceRoot `
    -ExpectedHeadSha $ExpectedHeadSha `
    -ExpectedWebDeploymentId $ExpectedWebDeploymentId `
    -ExpectedMobileVersionName $ExpectedMobileVersionName `
    -ExpectedMobileVersionCode $ExpectedMobileVersionCode `
    -ExpectedMobileApkSha256 $ExpectedMobileApkSha256 `
    -RepoRoot $RepoRoot
  $readback = Invoke-BinderActivationReadbackV1 `
    -RepoRoot $RepoRoot `
    -ExpectedEnabledFlags @($phaseDefinition.enabled_before)
  Assert-BinderActivationConditionV1 (
    [string]$readback.Report.checks.stable_catalog_fingerprint_sha256 -ceq
      [string]$prior.StableCatalogFingerprintSha256
  ) 'Stable catalog changed since the preceding evidence.'

  $evidenceRoot = New-BinderActivationArtifactRootV1 `
    -Path $ArtifactRoot `
    -RepoRoot $RepoRoot
  try {
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $evidenceRoot 'source.json') `
      -Value (Assert-BinderActivationSourceV1 -RepoRoot $RepoRoot)
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $evidenceRoot 'prior-evidence.json') `
      -Value $prior
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $evidenceRoot 'clients-dark-evidence.json') `
      -Value $clientsDark
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $evidenceRoot 'readback.before.json') `
      -Value $readback.Report
    $manifest = New-BinderActivationManifestV1 `
      -Phase $phaseDefinition `
      -ExpectedHeadSha $ExpectedHeadSha `
      -Policy $phasePolicy `
      -PriorEvidence $prior `
      -Readback $readback `
      -ClientsDarkEvidence $clientsDark
    $manifestPath = Join-Path (
      $evidenceRoot
    ) 'activation-preflight-manifest.json'
    Write-BinderActivationJsonV1 -Path $manifestPath -Value $manifest
    Write-BinderActivationTextV1 `
      -Path (Join-Path $evidenceRoot 'activation-preflight-manifest.sha256') `
      -Value (
        (Get-BinderActivationSha256V1 -Path $manifestPath) +
        [Environment]::NewLine
      )
    $ack = (
      'ACTIVATE-COLLABORATIVE-BINDERS-V1::' +
      $manifest.project_ref + '::' +
      $manifest.head_sha + '::' +
      $manifest.target_flag + '::' +
      $manifest.manifest_fingerprint_sha256
    )
    Write-BinderActivationTextV1 `
      -Path (Join-Path $evidenceRoot 'approval.txt') `
      -Value ($ack + [Environment]::NewLine)
    Write-BinderActivationChecksumsV1 -Root $evidenceRoot
    return [pscustomobject][ordered]@{
      Status = 'pass'
      ArtifactRoot = $evidenceRoot
      ManifestPath = $manifestPath
      ManifestFingerprintSha256 =
        $manifest.manifest_fingerprint_sha256
      Approval = $ack
    }
  } catch {
    throw
  }
}

function Read-BinderActivationPreflightManifestV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [datetimeoffset]$NowUtc = [datetimeoffset]::UtcNow,

    [switch]$AllowExpired
  )

  $fullPath = [IO.Path]::GetFullPath($Path)
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $fullPath -PathType Leaf
  ) 'Activation preflight manifest is missing.'
  $sidecar = Join-Path (
    Split-Path -Parent $fullPath
  ) 'activation-preflight-manifest.sha256'
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $sidecar -PathType Leaf
  ) 'Activation preflight manifest hash sidecar is missing.'
  $expectedFileHash = (Get-Content -LiteralPath $sidecar -Raw).Trim()
  Assert-BinderActivationConditionV1 (
    $expectedFileHash -cmatch '^[0-9a-f]{64}$' -and
    (Get-BinderActivationSha256V1 -Path $fullPath) -ceq
      $expectedFileHash
  ) 'Activation preflight manifest file hash mismatch.'
  $manifest = Get-Content -LiteralPath $fullPath -Raw |
    ConvertFrom-Json -AsHashtable
  $core = [ordered]@{}
  foreach ($entry in $manifest.GetEnumerator()) {
    if ($entry.Key -cne 'manifest_fingerprint_sha256') {
      $core[$entry.Key] = $entry.Value
    }
  }
  Assert-BinderActivationConditionV1 (
    (Get-CanonicalSha256V1 -Value $core) -ceq
      [string]$manifest.manifest_fingerprint_sha256
  ) 'Activation preflight manifest fingerprint mismatch.'
  Assert-BinderActivationConditionV1 (
    [int]$manifest.schema_version -eq 1 -and
    [string]$manifest.package_id -ceq
      'COLLABORATIVE-BINDERS-ACTIVATION-V1' -and
    [string]$manifest.status -ceq 'pass' -and
    [string]$manifest.project_ref -ceq 'ycdxbpibncqcchqiihfz' -and
    [string]$manifest.head_sha -cmatch '^[0-9a-f]{40}$' -and
    [string]$manifest.activation_head_sha -ceq
      [string]$manifest.head_sha -and
    [string]$manifest.installation_evidence_head_sha -ceq
      'a29680bdf79409823eedab8a62f0bd5cc89d675c' -and
    [string]$manifest.rollout_model -ceq
      'clients_dark_empty_domain' -and
    [int]$manifest.clients_dark_through_phase_sequence -eq 8 -and
    $manifest.binder_domain_must_remain_empty -eq $true -and
    [string]$manifest.clients_dark_evidence_checksum_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$manifest.clients_dark_evidence_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$manifest.clients_dark_evidence_fingerprint_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$manifest.clients_dark_evidence_created_at_utc
    ) -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$manifest.clients_dark_expires_at_utc
    ) -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$manifest.web_deployment_id
    ) -and
    [string]$manifest.web_deployment_commit_sha -ceq
      [string]$manifest.head_sha -and
    [string]$manifest.mobile_application_id -ceq
      'com.grookai.vault' -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$manifest.mobile_version_name
    ) -and
    [int]$manifest.mobile_version_code -gt 0 -and
    [string]$manifest.mobile_apk_sha256 -cmatch '^[0-9a-f]{64}$' -and
    $manifest.restore_path_reviewed -eq $true
  ) 'Activation preflight manifest identity or safety contract is invalid.'
  $created = ConvertTo-BinderActivationUtcV1 `
    -Value $manifest.created_at_utc `
    -Label 'Activation preflight creation time'
  $expires = ConvertTo-BinderActivationUtcV1 `
    -Value $manifest.expires_at_utc `
    -Label 'Activation preflight expiration time'
  Assert-BinderActivationConditionV1 (
    $created -le $NowUtc.AddMinutes(5)
  ) 'Activation preflight creation time is in the future.'
  Assert-BinderActivationConditionV1 (
    $expires -gt $created -and $expires -le $created.AddMinutes(31)
  ) 'Activation preflight manifest has an invalid lifetime.'
  if (-not $AllowExpired.IsPresent) {
    Assert-BinderActivationConditionV1 (
      $expires -gt $NowUtc
    ) 'Activation preflight manifest has expired.'
  }
  return [pscustomobject][ordered]@{
    Path = $fullPath
    FileSha256 = $expectedFileHash
    Data = $manifest
  }
}

function Open-BinderActivationSealV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Paths
  )

  $streams = [Collections.Generic.List[IO.FileStream]]::new()
  try {
    foreach ($path in @($Paths | Sort-Object -Unique)) {
      $item = Get-Item -LiteralPath $path
      Assert-BinderActivationConditionV1 (
        -not $item.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)
      ) "Activation seal source is a reparse point: $path"
      $streams.Add([IO.File]::Open(
        $path,
        [IO.FileMode]::Open,
        [IO.FileAccess]::Read,
        [IO.FileShare]::Read
      ))
    }
    return @($streams)
  } catch {
    foreach ($stream in $streams) {
      $stream.Dispose()
    }
    throw
  }
}

function Close-BinderActivationSealV1 {
  param([object[]]$Streams)
  foreach ($stream in @($Streams)) {
    if ($null -ne $stream) {
      $stream.Dispose()
    }
  }
}

function Invoke-BinderActivationRecoveryV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$EvidenceRoot,

    [Parameter(Mandatory = $true)]
    [string]$ArtifactRoot,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedHeadSha,

    [Parameter(Mandatory = $true)]
    [string]$ClientsDarkEvidenceRoot,

    [Parameter(Mandatory = $true)]
    [bool]$ConfirmRecovery,

    [string]$RepoRoot = $script:ActivationRepoRoot
  )

  Assert-BinderActivationConditionV1 (
    $ExpectedHeadSha -cmatch '^[0-9a-f]{40}$'
  ) 'Recovery expected HEAD is invalid.'
  [void](Assert-BinderActivationSourceV1 -RepoRoot $RepoRoot)
  [void](Assert-BinderActivationRepositoryV1 `
    -RepoRoot $RepoRoot `
    -ExpectedHeadSha $ExpectedHeadSha)
  [void](Assert-ProjectBindingV1 -RepoRoot $RepoRoot)

  $interruptedRoot = Assert-BinderActivationArtifactRootV1 `
    -Path $EvidenceRoot `
    -RepoRoot $RepoRoot
  $interruptedChecksums = Test-BinderActivationChecksumsV1 `
    -Root $interruptedRoot
  $evidenceChecksumPath = Join-Path $interruptedRoot 'checksums.sha256'
  $activationIntentPath = Join-Path (
    $interruptedRoot
  ) 'activation-intent.json'
  $recoveryIntentPath = Join-Path (
    $interruptedRoot
  ) 'recovery-intent.json'
  $activationIntentExists = Test-Path `
    -LiteralPath $activationIntentPath `
    -PathType Leaf
  $recoveryIntentExists = Test-Path `
    -LiteralPath $recoveryIntentPath `
    -PathType Leaf
  Assert-BinderActivationConditionV1 (
    $activationIntentExists -xor $recoveryIntentExists
  ) 'Recovery evidence must contain exactly one activation or recovery intent.'
  $intentPath = if ($activationIntentExists) {
    $activationIntentPath
  } else {
    $recoveryIntentPath
  }
  $incidentPath = Join-Path $interruptedRoot 'STOP-incident.json'
  $applyResultPath = Join-Path $interruptedRoot (
    'apply-' + 'result.json'
  )
  $incidentExists = Test-Path -LiteralPath $incidentPath -PathType Leaf
  $applyResultExists = Test-Path `
    -LiteralPath $applyResultPath `
    -PathType Leaf
  Assert-BinderActivationConditionV1 (
    $incidentExists -xor $applyResultExists
  ) 'Recovery evidence must contain exactly one pass or STOP result.'
  $intent = Get-Content -LiteralPath $intentPath -Raw | ConvertFrom-Json
  $evidenceRecordPath = if ($incidentExists) {
    $incidentPath
  } else {
    $applyResultPath
  }
  $evidenceRecord = Get-Content -LiteralPath $evidenceRecordPath -Raw |
    ConvertFrom-Json
  $evidenceStatus = if ($incidentExists) { 'stop' } else { 'pass' }
  $phaseEnvelope = Get-BinderActivationPhaseV1 `
    -Phase ([string]$intent.target_flag) `
    -RepoRoot $RepoRoot
  $phase = $phaseEnvelope.Phase
  $policy = $phaseEnvelope.Policy
  $activationManifestPath = $policy.ManifestPath
  Assert-BinderActivationConditionV1 (
    [string]$evidenceRecord.status -ceq $evidenceStatus -and
    [string]$evidenceRecord.package_id -ceq
      'COLLABORATIVE-BINDERS-ACTIVATION-V1' -and
    [string]$evidenceRecord.package_fingerprint_sha256 -ceq
      $policy.PackageFingerprintSha256 -and
    [string]$evidenceRecord.project_ref -ceq
      'ycdxbpibncqcchqiihfz' -and
    [string]$evidenceRecord.head_sha -ceq $ExpectedHeadSha -and
    [string]$evidenceRecord.activation_head_sha -ceq
      $ExpectedHeadSha -and
    [string]$evidenceRecord.installation_evidence_head_sha -ceq
      [string]$policy.Manifest.required_installation_head_sha -and
    [int]$evidenceRecord.phase_sequence -eq [int]$phase.sequence -and
    [string]$evidenceRecord.target_flag -ceq
      [string]$phase.flag_key -and
    [string]$evidenceRecord.rollout_model -ceq
      'clients_dark_empty_domain' -and
    $evidenceRecord.binder_domain_must_remain_empty -eq $true -and
    [string]$evidenceRecord.clients_dark_evidence_checksum_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$evidenceRecord.clients_dark_evidence_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$evidenceRecord.clients_dark_evidence_fingerprint_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$evidenceRecord.clients_dark_evidence_created_at_utc
    ) -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$evidenceRecord.clients_dark_expires_at_utc
    ) -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$evidenceRecord.web_deployment_id
    ) -and
    [string]$evidenceRecord.web_deployment_commit_sha -ceq
      $ExpectedHeadSha -and
    [string]$evidenceRecord.mobile_application_id -ceq
      'com.grookai.vault' -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$evidenceRecord.mobile_version_name
    ) -and
    [int]$evidenceRecord.mobile_version_code -gt 0 -and
    [string]$evidenceRecord.mobile_apk_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$evidenceRecord.backup_evidence_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    $evidenceRecord.restore_path_reviewed -eq $true -and
    (@($evidenceRecord.excluded_flags) -join "`n") -ceq
      (@($policy.Manifest.excluded_flags) -join "`n") -and
    [string]$evidenceRecord.excluded_project_phase -ceq 'P8' -and
    (@($evidenceRecord.enabled_flags_before) -join "`n") -ceq
      (@($phase.enabled_before) -join "`n") -and
    (@($evidenceRecord.enabled_flags_after) -join "`n") -ceq
      (@($phase.enabled_after) -join "`n")
  ) 'Recovery evidence does not match one exact activation phase.'
  if ($incidentExists) {
    Assert-BinderActivationConditionV1 (
      $evidenceRecord.automatic_retry_permitted -eq $false -and
      $evidenceRecord.automatic_rollback_permitted -eq $false
    ) 'Stopped recovery evidence permits an unsafe retry or rollback.'
  } else {
    Assert-BinderActivationConditionV1 (
      $evidenceRecord.mutation_succeeded -eq $true -and
      $evidenceRecord.mutation_termination_confirmed -eq $true
    ) 'Passed recovery evidence does not prove its completed mutation.'
  }
  Assert-BinderActivationConditionV1 (
    [string]$intent.package_id -ceq
      'COLLABORATIVE-BINDERS-ACTIVATION-V1' -and
    [string]$intent.package_fingerprint_sha256 -ceq
      $policy.PackageFingerprintSha256 -and
    [string]$intent.project_ref -ceq 'ycdxbpibncqcchqiihfz' -and
    [string]$intent.head_sha -ceq $ExpectedHeadSha -and
    [string]$intent.activation_head_sha -ceq $ExpectedHeadSha -and
    [string]$intent.installation_evidence_head_sha -ceq
      [string]$policy.Manifest.required_installation_head_sha -and
    [int]$intent.phase_sequence -eq [int]$phase.sequence -and
    [string]$intent.target_flag -ceq [string]$phase.flag_key -and
    [string]$intent.rollout_model -ceq
      'clients_dark_empty_domain' -and
    $intent.binder_domain_must_remain_empty -eq $true -and
    [string]$intent.clients_dark_evidence_checksum_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$intent.clients_dark_evidence_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$intent.clients_dark_evidence_fingerprint_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$intent.web_deployment_commit_sha -ceq
      $ExpectedHeadSha -and
    [string]$intent.mobile_application_id -ceq
      'com.grookai.vault' -and
    [int]$intent.mobile_version_code -gt 0 -and
    [string]$intent.mobile_apk_sha256 -cmatch '^[0-9a-f]{64}$' -and
    $intent.automatic_retry_permitted -eq $false -and
    (@($intent.enabled_flags_before) -join "`n") -ceq
      (@($phase.enabled_before) -join "`n") -and
    (@($intent.enabled_flags_after) -join "`n") -ceq
      (@($phase.enabled_after) -join "`n")
  ) 'Interrupted activation intent does not match one exact phase.'
  Assert-BinderActivationConditionV1 (
    [string]$intent.activation_head_sha -ceq
      [string]$evidenceRecord.activation_head_sha -and
    [string]$intent.installation_evidence_head_sha -ceq
      [string]$evidenceRecord.installation_evidence_head_sha -and
    [string]$intent.clients_dark_evidence_root -ceq
      [string]$evidenceRecord.clients_dark_evidence_root -and
    [string]$intent.clients_dark_evidence_checksum_sha256 -ceq
      [string]$evidenceRecord.clients_dark_evidence_checksum_sha256 -and
    [string]$intent.clients_dark_evidence_sha256 -ceq
      [string]$evidenceRecord.clients_dark_evidence_sha256 -and
    [string]$intent.clients_dark_evidence_fingerprint_sha256 -ceq
      [string]$evidenceRecord.clients_dark_evidence_fingerprint_sha256 -and
    [string]$intent.clients_dark_evidence_created_at_utc -ceq
      [string]$evidenceRecord.clients_dark_evidence_created_at_utc -and
    [string]$intent.clients_dark_expires_at_utc -ceq
      [string]$evidenceRecord.clients_dark_expires_at_utc -and
    [string]$intent.web_deployment_id -ceq
      [string]$evidenceRecord.web_deployment_id -and
    [string]$intent.web_deployment_commit_sha -ceq
      [string]$evidenceRecord.web_deployment_commit_sha -and
    [string]$intent.mobile_application_id -ceq
      [string]$evidenceRecord.mobile_application_id -and
    [string]$intent.mobile_version_name -ceq
      [string]$evidenceRecord.mobile_version_name -and
    [int]$intent.mobile_version_code -eq
      [int]$evidenceRecord.mobile_version_code -and
    [string]$intent.mobile_apk_sha256 -ceq
      [string]$evidenceRecord.mobile_apk_sha256
  ) 'Interrupted activation clients-dark identity chain changed.'

  $preflightPath = [IO.Path]::GetFullPath(
    [string]$intent.preflight_manifest_path
  )
  Assert-BinderActivationConditionV1 (
    $preflightPath -ceq
      [IO.Path]::GetFullPath(
        [string]$evidenceRecord.preflight_manifest_path
      )
  ) 'Recovery evidence preflight references disagree.'
  $preflightRoot = Assert-BinderActivationArtifactRootV1 `
    -Path (Split-Path -Parent $preflightPath) `
    -RepoRoot $RepoRoot
  Assert-BinderActivationConditionV1 (
    (Split-Path -Parent $preflightRoot) -ceq
      (Split-Path -Parent $interruptedRoot) -and
    $preflightRoot -cne $interruptedRoot
  ) 'Interrupted activation evidence is not a preflight sibling.'
  $preflightChecksums = Test-BinderActivationChecksumsV1 `
    -Root $preflightRoot
  $manifestEnvelope = Read-BinderActivationPreflightManifestV1 `
    -Path $preflightPath `
    -AllowExpired
  $manifest = $manifestEnvelope.Data
  Assert-BinderActivationConditionV1 (
    [string]$intent.preflight_manifest_sha256 -ceq
      $manifestEnvelope.FileSha256 -and
    [string]$intent.preflight_manifest_fingerprint_sha256 -ceq
      [string]$manifest.manifest_fingerprint_sha256 -and
    [string]$manifest.head_sha -ceq $ExpectedHeadSha -and
    [string]$manifest.activation_head_sha -ceq $ExpectedHeadSha -and
    [string]$manifest.installation_evidence_head_sha -ceq
      [string]$policy.Manifest.required_installation_head_sha -and
    [int]$manifest.phase_sequence -eq [int]$phase.sequence -and
    [string]$manifest.target_flag -ceq [string]$phase.flag_key -and
    [string]$manifest.package_fingerprint_sha256 -ceq
      $policy.PackageFingerprintSha256 -and
    [string]$manifest.phase_sql_sha256 -ceq [string]$phase.sha256 -and
    [string]$manifest.clients_dark_evidence_root -ceq
      [string]$intent.clients_dark_evidence_root -and
    [string]$manifest.clients_dark_evidence_checksum_sha256 -ceq
      [string]$intent.clients_dark_evidence_checksum_sha256 -and
    [string]$manifest.clients_dark_evidence_sha256 -ceq
      [string]$intent.clients_dark_evidence_sha256 -and
    [string]$manifest.clients_dark_evidence_fingerprint_sha256 -ceq
      [string]$intent.clients_dark_evidence_fingerprint_sha256 -and
    [string]$manifest.clients_dark_evidence_created_at_utc -ceq
      [string]$intent.clients_dark_evidence_created_at_utc -and
    [string]$manifest.clients_dark_expires_at_utc -ceq
      [string]$intent.clients_dark_expires_at_utc -and
    [string]$manifest.web_deployment_id -ceq
      [string]$intent.web_deployment_id -and
    [string]$manifest.web_deployment_commit_sha -ceq
      [string]$intent.web_deployment_commit_sha -and
    [string]$manifest.mobile_application_id -ceq
      [string]$intent.mobile_application_id -and
    [string]$manifest.mobile_version_name -ceq
      [string]$intent.mobile_version_name -and
    [int]$manifest.mobile_version_code -eq
      [int]$intent.mobile_version_code -and
    [string]$manifest.mobile_apk_sha256 -ceq
      [string]$intent.mobile_apk_sha256
  ) 'Interrupted activation preflight no longer matches its intent.'
  $preflightCreated = ConvertTo-BinderActivationUtcV1 `
    -Value $manifest.created_at_utc `
    -Label 'Interrupted activation preflight creation time'
  $prior = Test-BinderActivationPriorEvidenceV1 `
    -Path ([string]$manifest.prior_evidence_root) `
    -Phase $phase `
    -ExpectedHeadSha $ExpectedHeadSha `
    -ExpectedWebDeploymentId ([string]$manifest.web_deployment_id) `
    -ExpectedMobileVersionName ([string]$manifest.mobile_version_name) `
    -ExpectedMobileVersionCode ([int]$manifest.mobile_version_code) `
    -ExpectedMobileApkSha256 ([string]$manifest.mobile_apk_sha256) `
    -RepoRoot $RepoRoot `
    -NowUtc $preflightCreated
  Assert-BinderActivationConditionV1 (
    $prior.ChecksumSha256 -ceq
      [string]$manifest.prior_evidence_checksum_sha256
  ) 'Interrupted activation prior evidence changed.'
  Assert-BinderActivationConditionV1 (
    $prior.BackupKind -ceq [string]$manifest.backup_kind -and
    $prior.BackupVerifiedAtUtc -ceq
      [string]$manifest.backup_verified_at_utc -and
    $prior.BackupRecoverableThroughUtc -ceq
      [string]$manifest.backup_recoverable_through_utc -and
    $prior.BackupEvidenceReference -ceq
      [string]$manifest.backup_evidence_reference -and
    $prior.BackupEvidenceSha256 -ceq
      [string]$manifest.backup_evidence_sha256 -and
    $prior.RestorePathReviewed -eq $true
  ) 'Interrupted activation backup recovery chain changed.'
  $sealedClientsDark = Test-BinderActivationClientsDarkEvidenceV1 `
    -Path ([string]$manifest.clients_dark_evidence_root) `
    -ExpectedHeadSha $ExpectedHeadSha `
    -ExpectedWebDeploymentId ([string]$manifest.web_deployment_id) `
    -ExpectedMobileVersionName ([string]$manifest.mobile_version_name) `
    -ExpectedMobileVersionCode ([int]$manifest.mobile_version_code) `
    -ExpectedMobileApkSha256 ([string]$manifest.mobile_apk_sha256) `
    -RepoRoot $RepoRoot `
    -NowUtc $preflightCreated
  Assert-BinderActivationConditionV1 (
    $sealedClientsDark.ChecksumSha256 -ceq
      [string]$manifest.clients_dark_evidence_checksum_sha256 -and
    $sealedClientsDark.EvidenceSha256 -ceq
      [string]$manifest.clients_dark_evidence_sha256 -and
    $sealedClientsDark.EvidenceFingerprintSha256 -ceq
      [string]$manifest.clients_dark_evidence_fingerprint_sha256 -and
    $sealedClientsDark.CreatedAtUtc -ceq
      [string]$manifest.clients_dark_evidence_created_at_utc -and
    $sealedClientsDark.ExpiresAtUtc -ceq
      [string]$manifest.clients_dark_expires_at_utc -and
    $sealedClientsDark.WebDeploymentId -ceq
      [string]$manifest.web_deployment_id -and
    $sealedClientsDark.WebDeploymentCommitSha -ceq
      [string]$manifest.web_deployment_commit_sha -and
    $sealedClientsDark.MobileApplicationId -ceq
      [string]$manifest.mobile_application_id -and
    $sealedClientsDark.MobileVersionName -ceq
      [string]$manifest.mobile_version_name -and
    $sealedClientsDark.MobileVersionCode -eq
      [int]$manifest.mobile_version_code -and
    $sealedClientsDark.MobileApkSha256 -ceq
      [string]$manifest.mobile_apk_sha256
  ) 'Interrupted preflight clients-dark evidence changed.'
  $clientsDark = Test-BinderActivationClientsDarkEvidenceV1 `
    -Path $ClientsDarkEvidenceRoot `
    -ExpectedHeadSha $ExpectedHeadSha `
    -ExpectedWebDeploymentId ([string]$manifest.web_deployment_id) `
    -ExpectedMobileVersionName ([string]$manifest.mobile_version_name) `
    -ExpectedMobileVersionCode ([int]$manifest.mobile_version_code) `
    -ExpectedMobileApkSha256 ([string]$manifest.mobile_apk_sha256) `
    -RepoRoot $RepoRoot

  Assert-BinderActivationConditionV1 (
    $ConfirmRecovery
  ) 'Explicit ConfirmRecovery is required.'
  $expectedAck = (
    'RECOVER-COLLABORATIVE-BINDERS-V1::' +
    $manifest.project_ref + '::' +
    $manifest.head_sha + '::' +
    $manifest.target_flag + '::' +
    $interruptedChecksums.ChecksumSha256
  )
  Assert-BinderActivationConditionV1 (
    $env:GROOKAI_BINDER_ACTIVATION_RECOVERY_ACK -ceq $expectedAck
  ) 'Exact Binder activation recovery acknowledgement is missing.'

  $resolvedRecoveryCandidate = [IO.Path]::GetFullPath(
    $ArtifactRoot
  ).TrimEnd('\', '/')
  Assert-BinderActivationConditionV1 (
    (Split-Path -Parent $resolvedRecoveryCandidate) -ceq
      (Split-Path -Parent $interruptedRoot) -and
    $resolvedRecoveryCandidate -cne $interruptedRoot -and
    $resolvedRecoveryCandidate -cne $preflightRoot -and
    $resolvedRecoveryCandidate -cne $prior.Root -and
    $resolvedRecoveryCandidate -cne $sealedClientsDark.Root -and
    $resolvedRecoveryCandidate -cne $clientsDark.Root
  ) 'Recovery evidence must be a distinct interrupted-evidence sibling.'

  $readbackSqlPath = Join-Path $RepoRoot (
    [string]$policy.Manifest.activation_readback.file
  )
  $configPath = Join-Path $RepoRoot 'supabase/config.toml'
  $projectRefPath = Join-Path $RepoRoot 'supabase/.temp/project-ref'
  $supabaseExecutable = Resolve-BinderSupabaseExecutableV1
  $binaryPath = [string]$supabaseExecutable.BinaryPath
  $launcherPath = [string]$supabaseExecutable.LauncherPath
  $shimDescriptorPath = [string]$supabaseExecutable.ShimDescriptorPath
  Assert-BinderActivationConditionV1 (
    -not [string]::IsNullOrWhiteSpace($binaryPath) -and
    -not [string]::IsNullOrWhiteSpace($launcherPath) -and
    -not [string]::IsNullOrWhiteSpace($shimDescriptorPath)
  ) 'Recovery could not resolve the exact reviewed Supabase CLI files.'
  $sealPaths = @(
    $readbackSqlPath,
    $configPath,
    $projectRefPath,
    $binaryPath,
    $launcherPath,
    $shimDescriptorPath,
    $activationManifestPath,
    (Join-Path $RepoRoot (
      'scripts/ops/CollaborativeBindersActivationV1.psm1'
    )),
    (Join-Path $RepoRoot (
      [string]$policy.Manifest.production_rollout_module.file
    )),
    (Join-Path $RepoRoot (
      [string]$policy.Manifest.production_manifest.file
    )),
    $intentPath,
    $evidenceRecordPath,
    $evidenceChecksumPath,
    $manifestEnvelope.Path,
    (Join-Path $preflightRoot 'activation-preflight-manifest.sha256'),
    $preflightChecksums.ChecksumPath,
    $prior.ChecksumPath,
    $sealedClientsDark.ChecksumPath,
    $clientsDark.ChecksumPath
  )
  $sealPaths += @(
    Get-ChildItem `
      -LiteralPath $sealedClientsDark.Root `
      -File `
      -Recurse |
      Select-Object -ExpandProperty FullName
  )
  $sealPaths += @(
    Get-ChildItem -LiteralPath $clientsDark.Root -File -Recurse |
      Select-Object -ExpandProperty FullName
  )
  $sealStreams = @()
  $stopRecorded = $false
  $recoveryRoot = New-BinderActivationArtifactRootV1 `
    -Path $resolvedRecoveryCandidate `
    -RepoRoot $RepoRoot

  try {
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $recoveryRoot 'recovery-intent.json') `
      -Value ([ordered]@{
        schema_version = 1
        package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
        package_fingerprint_sha256 = $policy.PackageFingerprintSha256
        project_ref = 'ycdxbpibncqcchqiihfz'
        head_sha = $ExpectedHeadSha
        activation_head_sha = $ExpectedHeadSha
        installation_evidence_head_sha =
          [string]$manifest.installation_evidence_head_sha
        phase_sequence = [int]$phase.sequence
        target_flag = [string]$phase.flag_key
        enabled_flags_before = @($phase.enabled_before)
        enabled_flags_after = @($phase.enabled_after)
        rollout_model = 'clients_dark_empty_domain'
        binder_domain_must_remain_empty = $true
        interrupted_evidence_root = $interruptedRoot
        interrupted_evidence_checksum_sha256 =
          $interruptedChecksums.ChecksumSha256
        preflight_manifest_path = $manifestEnvelope.Path
        preflight_manifest_sha256 = $manifestEnvelope.FileSha256
        preflight_manifest_fingerprint_sha256 =
          [string]$manifest.manifest_fingerprint_sha256
        prior_evidence_root = $prior.Root
        prior_evidence_checksum_sha256 = $prior.ChecksumSha256
        clients_dark_evidence_root = $clientsDark.Root
        clients_dark_evidence_checksum_sha256 =
          $clientsDark.ChecksumSha256
        clients_dark_evidence_sha256 =
          $clientsDark.EvidenceSha256
        clients_dark_evidence_fingerprint_sha256 =
          $clientsDark.EvidenceFingerprintSha256
        clients_dark_evidence_created_at_utc =
          $clientsDark.CreatedAtUtc
        clients_dark_expires_at_utc =
          $clientsDark.ExpiresAtUtc
        web_deployment_id =
          $clientsDark.WebDeploymentId
        web_deployment_commit_sha =
          $clientsDark.WebDeploymentCommitSha
        mobile_application_id =
          $clientsDark.MobileApplicationId
        mobile_version_name =
          $clientsDark.MobileVersionName
        mobile_version_code =
          $clientsDark.MobileVersionCode
        mobile_apk_sha256 =
          $clientsDark.MobileApkSha256
        created_at_utc = [datetimeoffset]::UtcNow.ToString('o')
        state_neutral_readback_only = $true
        mutation_performed_by_recovery = $false
        automatic_retry_permitted = $false
        automatic_rollback_permitted = $false
      })
    $sealStreams = Open-BinderActivationSealV1 -Paths $sealPaths
    [void](Assert-BinderActivationSourceV1 -RepoRoot $RepoRoot)
    [void](Assert-BinderActivationRepositoryV1 `
      -RepoRoot $RepoRoot `
      -ExpectedHeadSha $ExpectedHeadSha)
    [void](Assert-ProjectBindingV1 -RepoRoot $RepoRoot)
    [void](Test-BinderActivationChecksumsV1 -Root $interruptedRoot)
    [void](Test-BinderActivationChecksumsV1 -Root $preflightRoot)
    [void](Test-BinderActivationChecksumsV1 `
      -Root $sealedClientsDark.Root)
    [void](Test-BinderActivationChecksumsV1 -Root $clientsDark.Root)
    $currentClientsDark =
      Test-BinderActivationClientsDarkEvidenceV1 `
      -Path $clientsDark.Root `
      -ExpectedHeadSha $ExpectedHeadSha `
      -ExpectedWebDeploymentId ([string]$manifest.web_deployment_id) `
      -ExpectedMobileVersionName ([string]$manifest.mobile_version_name) `
      -ExpectedMobileVersionCode ([int]$manifest.mobile_version_code) `
      -ExpectedMobileApkSha256 ([string]$manifest.mobile_apk_sha256) `
      -RepoRoot $RepoRoot
    Assert-BinderActivationConditionV1 (
      $currentClientsDark.ChecksumSha256 -ceq
        $clientsDark.ChecksumSha256
    ) 'Clients-dark evidence changed at the recovery seal.'
    $diagnostic = Invoke-BinderActivationDiagnosticReadbackV1 `
      -RepoRoot $RepoRoot `
      -EnabledBefore @($phase.enabled_before) `
      -EnabledAfter @($phase.enabled_after) `
      -ExecutablePath $binaryPath
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $recoveryRoot 'diagnostic-readback.json') `
      -Value $diagnostic.Report
    Assert-BinderActivationConditionV1 (
      $diagnostic.Report.ok -eq $true -and
      [string]$diagnostic.Report.checks.stable_catalog_fingerprint_sha256 -ceq
        [string]$manifest.stable_catalog_fingerprint_sha256
    ) 'Recovery diagnostic failed the empty-domain catalog contract.'

    if ($diagnostic.DiagnosticState -ceq 'after') {
      $result = [ordered]@{
        status = 'pass'
        package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
        package_fingerprint_sha256 = $policy.PackageFingerprintSha256
        project_ref = 'ycdxbpibncqcchqiihfz'
        head_sha = $ExpectedHeadSha
        activation_head_sha = $ExpectedHeadSha
        installation_evidence_head_sha =
          [string]$manifest.installation_evidence_head_sha
        phase_sequence = [int]$phase.sequence
        target_flag = [string]$phase.flag_key
        rollout_model = [string]$manifest.rollout_model
        binder_domain_must_remain_empty =
          [bool]$manifest.binder_domain_must_remain_empty
        clients_dark_evidence_root = $clientsDark.Root
        clients_dark_evidence_checksum_sha256 =
          $clientsDark.ChecksumSha256
        clients_dark_evidence_sha256 =
          $clientsDark.EvidenceSha256
        clients_dark_evidence_fingerprint_sha256 =
          $clientsDark.EvidenceFingerprintSha256
        clients_dark_evidence_created_at_utc =
          $clientsDark.CreatedAtUtc
        clients_dark_expires_at_utc =
          $clientsDark.ExpiresAtUtc
        web_deployment_id =
          $clientsDark.WebDeploymentId
        web_deployment_commit_sha =
          $clientsDark.WebDeploymentCommitSha
        mobile_application_id =
          $clientsDark.MobileApplicationId
        mobile_version_name =
          $clientsDark.MobileVersionName
        mobile_version_code =
          $clientsDark.MobileVersionCode
        mobile_apk_sha256 =
          $clientsDark.MobileApkSha256
        enabled_flags_before = @($phase.enabled_before)
        enabled_flags_after = @($phase.enabled_after)
        backup_kind = [string]$manifest.backup_kind
        backup_verified_at_utc =
          [string]$manifest.backup_verified_at_utc
        backup_recoverable_through_utc =
          [string]$manifest.backup_recoverable_through_utc
        backup_evidence_reference =
          [string]$manifest.backup_evidence_reference
        backup_evidence_sha256 =
          [string]$manifest.backup_evidence_sha256
        restore_path_reviewed =
          [bool]$manifest.restore_path_reviewed
        artifact_root = $recoveryRoot
        recovered_from_evidence_root = $interruptedRoot
        recovered_from_evidence_checksum_sha256 =
          $interruptedChecksums.ChecksumSha256
        preflight_manifest_path = $manifestEnvelope.Path
        preflight_manifest_fingerprint_sha256 =
          [string]$manifest.manifest_fingerprint_sha256
        completed_at_utc = [datetimeoffset]::UtcNow.ToString('o')
        recovery_classification = 'after'
        recovered_prior_evidence = $true
        recovery_readback_succeeded = $true
        mutation_succeeded = $true
        mutation_termination_confirmed = $true
        mutation_performed_by_recovery = $false
        automatic_retry_permitted = $false
        automatic_rollback_permitted = $false
        excluded_flags = @($policy.Manifest.excluded_flags)
        excluded_project_phase = 'P8'
      }
      Write-BinderActivationJsonV1 `
        -Path (Join-Path $recoveryRoot 'apply-result.json') `
        -Value $result
      Write-BinderActivationJsonV1 `
        -Path (Join-Path $recoveryRoot 'readback.after.json') `
        -Value $diagnostic.Report
      Write-BinderActivationChecksumsV1 -Root $recoveryRoot
      return [pscustomobject]$result
    }

    if ($diagnostic.DiagnosticState -ceq 'before') {
      $stop = [ordered]@{
        status = 'stop'
        package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
        project_ref = 'ycdxbpibncqcchqiihfz'
        head_sha = $ExpectedHeadSha
        activation_head_sha = $ExpectedHeadSha
        installation_evidence_head_sha =
          [string]$manifest.installation_evidence_head_sha
        phase_sequence = [int]$phase.sequence
        target_flag = [string]$phase.flag_key
        artifact_root = $recoveryRoot
        interrupted_evidence_root = $interruptedRoot
        interrupted_evidence_checksum_sha256 =
          $interruptedChecksums.ChecksumSha256
        recorded_at_utc = [datetimeoffset]::UtcNow.ToString('o')
        recovery_classification = 'before'
        recovered_prior_evidence = $false
        enabled_flags = @($diagnostic.EnabledFlags)
        effective_enabled_flags = @($diagnostic.EffectiveEnabledFlags)
        phase_committed = $false
        mutation_performed_by_recovery = $false
        automatic_retry_permitted = $false
        automatic_rollback_permitted = $false
      }
      Write-BinderActivationJsonV1 `
        -Path (Join-Path $recoveryRoot 'STOP-recovery.json') `
        -Value $stop
      Write-BinderActivationChecksumsV1 -Root $recoveryRoot
      $stopRecorded = $true
      throw (
        'Activation recovery proved the phase was not committed. ' +
        'No automatic retry or rollback is permitted.'
      )
    }

    if ($diagnostic.DiagnosticState -ceq 'unexpected') {
      $stop = [ordered]@{
        status = 'stop'
        package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
        project_ref = 'ycdxbpibncqcchqiihfz'
        head_sha = $ExpectedHeadSha
        activation_head_sha = $ExpectedHeadSha
        installation_evidence_head_sha =
          [string]$manifest.installation_evidence_head_sha
        phase_sequence = [int]$phase.sequence
        target_flag = [string]$phase.flag_key
        artifact_root = $recoveryRoot
        interrupted_evidence_root = $interruptedRoot
        interrupted_evidence_checksum_sha256 =
          $interruptedChecksums.ChecksumSha256
        recorded_at_utc = [datetimeoffset]::UtcNow.ToString('o')
        recovery_classification = 'unexpected'
        recovered_prior_evidence = $false
        enabled_flags = @($diagnostic.EnabledFlags)
        effective_enabled_flags = @($diagnostic.EffectiveEnabledFlags)
        phase_committed = $null
        mutation_performed_by_recovery = $false
        automatic_retry_permitted = $false
        automatic_rollback_permitted = $false
      }
      Write-BinderActivationJsonV1 `
        -Path (Join-Path $recoveryRoot 'STOP-recovery.json') `
        -Value $stop
      Write-BinderActivationChecksumsV1 -Root $recoveryRoot
      $stopRecorded = $true
      throw (
        'Activation recovery found an unexpected flag vector. ' +
        'No automatic retry or rollback is permitted.'
      )
    }

    throw (
      'Activation recovery found a raw/effective mismatch. ' +
      'No automatic retry or rollback is permitted.'
    )
  } catch {
    $originalError = $_
    if (-not $stopRecorded) {
      $stop = [ordered]@{
        status = 'stop'
        package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
        project_ref = 'ycdxbpibncqcchqiihfz'
        head_sha = $ExpectedHeadSha
        activation_head_sha = $ExpectedHeadSha
        installation_evidence_head_sha =
          [string]$manifest.installation_evidence_head_sha
        phase_sequence = [int]$phase.sequence
        target_flag = [string]$phase.flag_key
        artifact_root = $recoveryRoot
        interrupted_evidence_root = $interruptedRoot
        interrupted_evidence_checksum_sha256 =
          $interruptedChecksums.ChecksumSha256
        recorded_at_utc = [datetimeoffset]::UtcNow.ToString('o')
        recovery_state = 'diagnostic_failed'
        message = $originalError.Exception.Message
        phase_committed = $null
        mutation_performed_by_recovery = $false
        automatic_retry_permitted = $false
        automatic_rollback_permitted = $false
      }
      Write-BinderActivationJsonV1 `
        -Path (Join-Path $recoveryRoot 'STOP-recovery.json') `
        -Value $stop
      try {
        Write-BinderActivationChecksumsV1 -Root $recoveryRoot
      } catch {
        Write-BinderActivationTextV1 `
          -Path (Join-Path $recoveryRoot 'checksums-error.txt') `
          -Value (
            'Activation recovery checksum generation failed: ' +
            $_.Exception.Message +
            [Environment]::NewLine
          )
      }
    }
    throw $originalError
  } finally {
    Close-BinderActivationSealV1 -Streams $sealStreams
  }
}

function Invoke-BinderActivationKillSwitchV1 {
  [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
  param(
    [Parameter(Mandatory = $true)]
    [string]$EvidenceRoot,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedHeadSha,

    [Parameter(Mandatory = $true)]
    [string]$ArtifactRoot,

    [Parameter(Mandatory = $true)]
    [bool]$ConfirmProduction,

    [string]$RepoRoot = $script:ActivationRepoRoot
  )

  Assert-BinderActivationConditionV1 (
    $ExpectedHeadSha -cmatch '^[0-9a-f]{40}$'
  ) 'Kill-switch expected HEAD is invalid.'
  [void](Assert-BinderActivationSourceV1 -RepoRoot $RepoRoot)
  [void](Assert-BinderActivationRepositoryV1 `
    -RepoRoot $RepoRoot `
    -ExpectedHeadSha $ExpectedHeadSha)
  [void](Assert-ProjectBindingV1 -RepoRoot $RepoRoot)
  $policy = Get-BinderActivationPolicyV1 -RepoRoot $RepoRoot
  $activationManifestPath = $policy.ManifestPath

  $evidenceRoot = Assert-BinderActivationArtifactRootV1 `
    -Path $EvidenceRoot `
    -RepoRoot $RepoRoot
  $evidenceChecksums = Test-BinderActivationChecksumsV1 `
    -Root $evidenceRoot
  $evidenceChecksumPath = Join-Path $evidenceRoot 'checksums.sha256'
  $applyResultPath = Join-Path $evidenceRoot 'apply-result.json'
  $stopIncidentPath = Join-Path $evidenceRoot 'STOP-incident.json'
  $applyExists = Test-Path -LiteralPath $applyResultPath -PathType Leaf
  $stopExists = Test-Path -LiteralPath $stopIncidentPath -PathType Leaf
  Assert-BinderActivationConditionV1 (
    $applyExists -xor $stopExists
  ) 'Kill-switch evidence must contain exactly one pass or STOP result.'
  Assert-BinderActivationConditionV1 (
    $applyExists
  ) 'Kill switch requires sealed successful activation evidence.'
  $result = Get-Content -LiteralPath $applyResultPath -Raw |
    ConvertFrom-Json
  $phaseEnvelope = Get-BinderActivationPhaseV1 `
    -Phase ([string]$result.target_flag) `
    -RepoRoot $RepoRoot
  $activationStep = $phaseEnvelope.Phase
  Assert-BinderActivationConditionV1 (
    [string]$result.status -ceq 'pass' -and
    [string]$result.package_id -ceq
      'COLLABORATIVE-BINDERS-ACTIVATION-V1' -and
    [string]$result.package_fingerprint_sha256 -ceq
      $policy.PackageFingerprintSha256 -and
    [string]$result.project_ref -ceq 'ycdxbpibncqcchqiihfz' -and
    [string]$result.head_sha -ceq $ExpectedHeadSha -and
    [int]$result.phase_sequence -eq [int]$activationStep.sequence -and
    [string]$result.rollout_model -ceq
      'clients_dark_empty_domain' -and
    $result.binder_domain_must_remain_empty -eq $true -and
    (@($result.enabled_flags_after) -join "`n") -ceq
      (@($activationStep.enabled_after) -join "`n") -and
    (@($result.excluded_flags) -join "`n") -ceq
      (@($policy.Manifest.excluded_flags) -join "`n") -and
    [string]$result.excluded_project_phase -ceq 'P8' -and
    [string]$result.backup_evidence_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$result.clients_dark_evidence_checksum_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$result.clients_dark_evidence_fingerprint_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    $result.restore_path_reviewed -eq $true -and
    $result.mutation_succeeded -eq $true -and
    $result.mutation_termination_confirmed -eq $true
  ) 'Kill-switch evidence is not one exact successful activation phase.'
  $evidenceCompleted = ConvertTo-BinderActivationUtcV1 `
    -Value $result.completed_at_utc `
    -Label 'Kill-switch source evidence completion time'
  $clientsDark = Test-BinderActivationClientsDarkEvidenceV1 `
    -Path ([string]$result.clients_dark_evidence_root) `
    -ExpectedHeadSha $ExpectedHeadSha `
    -ExpectedWebDeploymentId ([string]$result.web_deployment_id) `
    -ExpectedMobileVersionName ([string]$result.mobile_version_name) `
    -ExpectedMobileVersionCode ([int]$result.mobile_version_code) `
    -ExpectedMobileApkSha256 ([string]$result.mobile_apk_sha256) `
    -RepoRoot $RepoRoot `
    -NowUtc $evidenceCompleted
  Assert-BinderActivationConditionV1 (
    $clientsDark.ChecksumSha256 -ceq
      [string]$result.clients_dark_evidence_checksum_sha256 -and
    $clientsDark.EvidenceFingerprintSha256 -ceq
      [string]$result.clients_dark_evidence_fingerprint_sha256
  ) 'Kill-switch clients-dark evidence changed.'
  $readbackAfterPath = Join-Path $evidenceRoot 'readback.after.json'
  Assert-BinderActivationConditionV1 (
    Test-Path -LiteralPath $readbackAfterPath -PathType Leaf
  ) 'Kill-switch evidence readback is missing.'
  $evidenceReadback = Get-Content -LiteralPath $readbackAfterPath -Raw |
    ConvertFrom-Json
  Assert-BinderActivationConditionV1 (
    $evidenceReadback.read_only -eq $true -and
    [string]$evidenceReadback.phase -ceq 'activation' -and
    $evidenceReadback.ok -eq $true -and
    (@($evidenceReadback.checks.enabled_flags) -join "`n") -ceq
      (@($activationStep.enabled_after) -join "`n") -and
    (@($evidenceReadback.checks.effective_enabled_flags) -join "`n") -ceq
      (@($activationStep.enabled_after) -join "`n")
  ) 'Kill-switch evidence readback is not an exact phase result.'

  if (-not $PSCmdlet.ShouldProcess(
    'Supabase production project ycdxbpibncqcchqiihfz',
    'disable only the Binder schema_internal feature flag'
  )) {
    return [pscustomobject][ordered]@{
      status = 'not_applied'
      package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
      project_ref = 'ycdxbpibncqcchqiihfz'
      mutation_possible = $false
    }
  }
  Assert-BinderActivationConditionV1 (
    $ConfirmProduction
  ) 'Explicit ConfirmProduction is required for the kill switch.'
  $killSwitch = $policy.Manifest.kill_switch
  Assert-BinderActivationConditionV1 (
    [string]$killSwitch.target_flag -ceq 'schema_internal' -and
    $killSwitch.set_enabled -eq $false -and
    $killSwitch.automatic_retry_permitted -eq $false -and
    $killSwitch.automatic_rollback_permitted -eq $false
  ) 'Kill-switch manifest contract is invalid.'
  $expectedAck = (
    'DISABLE-COLLABORATIVE-BINDERS-V1::' +
    $result.project_ref + '::' +
    $result.head_sha + '::' +
    $evidenceChecksums.ChecksumSha256 + '::' +
    [string]$killSwitch.sha256
  )
  Assert-BinderActivationConditionV1 (
    $env:GROOKAI_BINDER_ACTIVATION_KILL_ACK -ceq $expectedAck
  ) 'Exact Binder activation kill-switch acknowledgement is missing.'

  $resolvedArtifactCandidate = [IO.Path]::GetFullPath(
    $ArtifactRoot
  ).TrimEnd('\', '/')
  Assert-BinderActivationConditionV1 (
    (Split-Path -Parent $resolvedArtifactCandidate) -ceq
      (Split-Path -Parent $evidenceRoot) -and
    $resolvedArtifactCandidate -cne $evidenceRoot -and
    $resolvedArtifactCandidate -cne $clientsDark.Root
  ) 'Kill-switch evidence must be a distinct activation-evidence sibling.'

  $killSqlPath = Join-Path $RepoRoot (
    'scripts/ops/sql/' +
    'collaborative_binders_activation_kill_switch_v1.sql'
  )
  $readbackSqlPath = Join-Path $RepoRoot (
    [string]$policy.Manifest.activation_readback.file
  )
  $configPath = Join-Path $RepoRoot 'supabase/config.toml'
  $projectRefPath = Join-Path $RepoRoot 'supabase/.temp/project-ref'
  $supabaseExecutable = Resolve-BinderSupabaseExecutableV1
  $binaryPath = [string]$supabaseExecutable.BinaryPath
  $launcherPath = [string]$supabaseExecutable.LauncherPath
  $shimDescriptorPath = [string]$supabaseExecutable.ShimDescriptorPath
  Assert-BinderActivationConditionV1 (
    (Get-BinderActivationSha256V1 -Path $killSqlPath) -ceq
      [string]$killSwitch.sha256 -and
    -not [string]::IsNullOrWhiteSpace($binaryPath) -and
    -not [string]::IsNullOrWhiteSpace($launcherPath) -and
    -not [string]::IsNullOrWhiteSpace($shimDescriptorPath)
  ) 'Kill switch could not resolve its exact SQL or CLI files.'
  $sealPaths = @(
    $killSqlPath,
    $readbackSqlPath,
    $configPath,
    $projectRefPath,
    $binaryPath,
    $launcherPath,
    $shimDescriptorPath,
    $activationManifestPath,
    (Join-Path $RepoRoot (
      'scripts/ops/CollaborativeBindersActivationV1.psm1'
    )),
    (Join-Path $RepoRoot (
      [string]$policy.Manifest.production_rollout_module.file
    )),
    (Join-Path $RepoRoot (
      [string]$policy.Manifest.production_manifest.file
    )),
    $applyResultPath,
    $readbackAfterPath,
    $evidenceChecksumPath,
    $clientsDark.ChecksumPath
  )
  $sealPaths += @(
    Get-ChildItem -LiteralPath $clientsDark.Root -File -Recurse |
      Select-Object -ExpandProperty FullName
  )
  $sealStreams = @()
  $mutation = $null
  $mutationStarted = $false
  $mutationSucceeded = $false
  $lifecycle = [pscustomobject][ordered]@{
    Started = $false
    StartedAtUtc = $null
    SupervisorProcessId = $null
    TimedOut = $false
    KillAttempted = $false
    KillRequestSucceeded = $null
    KillRequestError = $null
    RootExited = $false
    ProcessTreeEmpty = $false
    TerminationConfirmed = $false
    ExitCode = $null
    EndedAtUtc = $null
    OutputCaptureCompleted = $false
  }
  $killRoot = New-BinderActivationArtifactRootV1 `
    -Path $resolvedArtifactCandidate `
    -RepoRoot $RepoRoot
  $rawEnabledAfter = @(
    $activationStep.enabled_after |
      Where-Object { [string]$_ -cne 'schema_internal' }
  )

  try {
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $killRoot 'kill-switch-intent.json') `
      -Value ([ordered]@{
        schema_version = 1
        package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
        package_fingerprint_sha256 = $policy.PackageFingerprintSha256
        project_ref = 'ycdxbpibncqcchqiihfz'
        head_sha = $ExpectedHeadSha
        phase_sequence = [int]$activationStep.sequence
        target_flag = 'schema_internal'
        set_enabled = $false
        enabled_flags_before = @($activationStep.enabled_after)
        enabled_flags_after = @($rawEnabledAfter)
        effective_enabled_flags_after = @()
        rollout_model = 'clients_dark_empty_domain'
        binder_domain_must_remain_empty = $true
        evidence_root = $evidenceRoot
        evidence_checksum_sha256 = $evidenceChecksums.ChecksumSha256
        backup_evidence_sha256 =
          [string]$result.backup_evidence_sha256
        restore_path_reviewed = [bool]$result.restore_path_reviewed
        clients_dark_evidence_root = $clientsDark.Root
        clients_dark_evidence_checksum_sha256 =
          $clientsDark.ChecksumSha256
        created_at_utc = [datetimeoffset]::UtcNow.ToString('o')
        automatic_retry_permitted = $false
        automatic_rollback_permitted = $false
      })
    $sealStreams = Open-BinderActivationSealV1 -Paths $sealPaths
    [void](Assert-BinderActivationSourceV1 -RepoRoot $RepoRoot)
    [void](Assert-BinderActivationRepositoryV1 `
      -RepoRoot $RepoRoot `
      -ExpectedHeadSha $ExpectedHeadSha)
    [void](Assert-ProjectBindingV1 -RepoRoot $RepoRoot)
    [void](Test-BinderActivationChecksumsV1 -Root $evidenceRoot)
    [void](Test-BinderActivationChecksumsV1 -Root $clientsDark.Root)
    $before = Invoke-BinderActivationDiagnosticReadbackV1 `
      -RepoRoot $RepoRoot `
      -EnabledBefore @($activationStep.enabled_after) `
      -EnabledAfter @($rawEnabledAfter) `
      -ExecutablePath $binaryPath
    Assert-BinderActivationConditionV1 (
      $before.DiagnosticState -ceq 'before' -and
      $before.Report.ok -eq $true
    ) 'Kill-switch pre-readback is not the exact sealed phase vector.'
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $killRoot 'readback.before.json') `
      -Value $before.Report

    $mutationStarted = $true
    $mutation = Invoke-BinderActivationSupabaseV1 `
      -Arguments @(
        'db',
        'query',
        '--linked',
        '--file',
        $killSqlPath,
        '--output',
        'json',
        '--agent',
        'no'
      ) `
      -RepoRoot $RepoRoot `
      -TimeoutSeconds 60 `
      -ProcessLifecycle $lifecycle `
      -ExecutablePath $binaryPath
    Write-BinderActivationTextV1 `
      -Path (Join-Path $killRoot 'kill-switch.stdout.txt') `
      -Value $mutation.StdOut
    Write-BinderActivationTextV1 `
      -Path (Join-Path $killRoot 'kill-switch.stderr.txt') `
      -Value $mutation.StdErr
    Assert-BinderActivationCommandSucceededV1 `
      -Result $mutation `
      -Label 'Binder activation kill switch'
    $rows = @($mutation.StdOut | ConvertFrom-Json)
    Assert-BinderActivationConditionV1 (
      $rows.Count -eq 1 -and
      $null -ne $rows[0].kill_switch_result
    ) 'Kill switch must return exactly one result.'
    $killSwitchResult = $rows[0].kill_switch_result
    Assert-BinderActivationConditionV1 (
      $killSwitchResult.ok -eq $true -and
      [string]$killSwitchResult.target_flag -ceq 'schema_internal' -and
      $killSwitchResult.set_enabled -eq $false -and
      [int]$killSwitchResult.phase_sequence -eq
        [int]$activationStep.sequence -and
      [int]$killSwitchResult.updated_rows -eq 1 -and
      (@($killSwitchResult.enabled_before) -join "`n") -ceq
        (@($activationStep.enabled_after) -join "`n") -and
      (@($killSwitchResult.enabled_after) -join "`n") -ceq
        (@($rawEnabledAfter) -join "`n") -and
      @($killSwitchResult.effective_enabled_after).Count -eq 0
    ) 'Kill-switch mutation result failed its exact one-target contract.'
    $mutationSucceeded = $true
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $killRoot 'kill-switch-result.json') `
      -Value $killSwitchResult

    $after = Invoke-BinderActivationDiagnosticReadbackV1 `
      -RepoRoot $RepoRoot `
      -EnabledBefore @($activationStep.enabled_after) `
      -EnabledAfter @($rawEnabledAfter) `
      -ExecutablePath $binaryPath
    Assert-BinderActivationConditionV1 (
      (@($after.EnabledFlags) -join "`n") -ceq
        (@($rawEnabledAfter) -join "`n") -and
      $after.EffectiveEnabledFlags.Count -eq 0 -and
      [string]$after.Report.checks.stable_catalog_fingerprint_sha256 -ceq
        [string]$before.Report.checks.stable_catalog_fingerprint_sha256
    ) 'Kill-switch post-readback did not prove an empty effective vector.'
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $killRoot 'readback.after.json') `
      -Value $after.Report
    $applyResult = [ordered]@{
      status = 'pass'
      package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
      package_fingerprint_sha256 = $policy.PackageFingerprintSha256
      project_ref = 'ycdxbpibncqcchqiihfz'
      head_sha = $ExpectedHeadSha
      operation = 'kill_switch'
      phase_sequence = [int]$activationStep.sequence
      target_flag = 'schema_internal'
      enabled_flags_before = @($activationStep.enabled_after)
      enabled_flags_after = @($rawEnabledAfter)
      effective_enabled_flags_after = @()
      diagnostic_state = [string]$after.DiagnosticState
      backup_evidence_sha256 =
        [string]$result.backup_evidence_sha256
      restore_path_reviewed = [bool]$result.restore_path_reviewed
      clients_dark_evidence_root = $clientsDark.Root
      clients_dark_evidence_checksum_sha256 =
        $clientsDark.ChecksumSha256
      artifact_root = $killRoot
      evidence_root = $evidenceRoot
      evidence_checksum_sha256 = $evidenceChecksums.ChecksumSha256
      completed_at_utc = [datetimeoffset]::UtcNow.ToString('o')
      mutation_succeeded = $mutationSucceeded
      mutation_termination_confirmed =
        [bool]$lifecycle.TerminationConfirmed
      mutation_output_truncated = [bool]$mutation.OutputTruncated
      automatic_retry_permitted = $false
      automatic_rollback_permitted = $false
      excluded_flags = @($policy.Manifest.excluded_flags)
      excluded_project_phase = 'P8'
    }
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $killRoot 'apply-result.json') `
      -Value $applyResult
    Write-BinderActivationChecksumsV1 -Root $killRoot
    return [pscustomobject]$applyResult
  } catch {
    $originalError = $_
    $diagnosticState = 'not_run'
    $effectiveEnabledFlags = $null
    if ($lifecycle.Started -and $lifecycle.TerminationConfirmed) {
      try {
        $diagnostic = Invoke-BinderActivationDiagnosticReadbackV1 `
          -RepoRoot $RepoRoot `
          -EnabledBefore @($activationStep.enabled_after) `
          -EnabledAfter @($rawEnabledAfter) `
          -ExecutablePath $binaryPath
        $diagnosticState = [string]$diagnostic.DiagnosticState
        $effectiveEnabledFlags = @(
          $diagnostic.EffectiveEnabledFlags
        )
        Write-BinderActivationJsonV1 `
          -Path (Join-Path $killRoot 'diagnostic-readback.json') `
          -Value $diagnostic.Report
      } catch {
        $diagnosticState = 'diagnostic_failed'
      }
    }
    $incident = [ordered]@{
      status = 'stop'
      package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
      package_fingerprint_sha256 = $policy.PackageFingerprintSha256
      project_ref = 'ycdxbpibncqcchqiihfz'
      head_sha = $ExpectedHeadSha
      operation = 'kill_switch'
      phase_sequence = [int]$activationStep.sequence
      target_flag = 'schema_internal'
      artifact_root = $killRoot
      evidence_root = $evidenceRoot
      evidence_checksum_sha256 = $evidenceChecksums.ChecksumSha256
      recorded_at_utc = [datetimeoffset]::UtcNow.ToString('o')
      message = $originalError.Exception.Message
      mutation_attempted = $mutationStarted
      mutation_succeeded = $mutationSucceeded
      mutation_termination_confirmed =
        [bool]$lifecycle.TerminationConfirmed
      diagnostic_state = $diagnosticState
      effective_enabled_flags = $effectiveEnabledFlags
      automatic_retry_permitted = $false
      automatic_rollback_permitted = $false
    }
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $killRoot 'STOP-incident.json') `
      -Value $incident
    try {
      Write-BinderActivationChecksumsV1 -Root $killRoot
    } catch {
      Write-BinderActivationTextV1 `
        -Path (Join-Path $killRoot 'checksums-error.txt') `
        -Value (
          'Kill-switch incident checksum generation failed: ' +
          $_.Exception.Message +
          [Environment]::NewLine
        )
    }
    throw $originalError
  } finally {
    if ($lifecycle.Started -and -not $lifecycle.TerminationConfirmed) {
      [Environment]::FailFast(
        'Kill-switch process-tree termination was not confirmed; ' +
        'the source seal intentionally remains open.'
      )
    }
    Close-BinderActivationSealV1 -Streams $sealStreams
  }
}

function Invoke-BinderActivationApplyV1 {
  [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
  param(
    [Parameter(Mandatory = $true)]
    [string]$ManifestPath,

    [Parameter(Mandatory = $true)]
    [string]$ArtifactRoot,

    [Parameter(Mandatory = $true)]
    [bool]$ConfirmProduction,

    [string]$RepoRoot = $script:ActivationRepoRoot
  )

  $manifestEnvelope = Read-BinderActivationPreflightManifestV1 `
    -Path $ManifestPath
  $manifest = $manifestEnvelope.Data
  $phaseEnvelope = Get-BinderActivationPhaseV1 `
    -Phase ([string]$manifest.target_flag) `
    -RepoRoot $RepoRoot
  $phase = $phaseEnvelope.Phase
  $policy = $phaseEnvelope.Policy
  Assert-BinderActivationConditionV1 (
    [int]$manifest.phase_sequence -eq [int]$phase.sequence -and
    [string]$manifest.phase_sql_sha256 -ceq [string]$phase.sha256 -and
    [string]$manifest.package_fingerprint_sha256 -ceq
      $policy.PackageFingerprintSha256 -and
    [string]$manifest.rollout_model -ceq
      'clients_dark_empty_domain' -and
    [int]$manifest.clients_dark_through_phase_sequence -eq 8 -and
    $manifest.binder_domain_must_remain_empty -eq $true -and
    [string]$manifest.clients_dark_evidence_checksum_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$manifest.clients_dark_evidence_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    [string]$manifest.clients_dark_evidence_fingerprint_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$manifest.clients_dark_evidence_created_at_utc
    ) -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$manifest.clients_dark_expires_at_utc
    ) -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$manifest.web_deployment_id
    ) -and
    [string]$manifest.web_deployment_commit_sha -ceq
      [string]$manifest.head_sha -and
    [string]$manifest.mobile_application_id -ceq
      'com.grookai.vault' -and
    -not [string]::IsNullOrWhiteSpace(
      [string]$manifest.mobile_version_name
    ) -and
    [int]$manifest.mobile_version_code -gt 0 -and
    [string]$manifest.mobile_apk_sha256 -cmatch '^[0-9a-f]{64}$' -and
    $manifest.restore_path_reviewed -eq $true -and
    [string]$manifest.backup_evidence_sha256 -cmatch '^[0-9a-f]{64}$'
  ) 'Activation preflight manifest no longer matches the reviewed phase.'
  if (-not $PSCmdlet.ShouldProcess(
    'Supabase production project ycdxbpibncqcchqiihfz',
    "enable only the Binder flag $($phase.flag_key)"
  )) {
    return [pscustomobject][ordered]@{
      status = 'not_applied'
      package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
      project_ref = 'ycdxbpibncqcchqiihfz'
      mutation_possible = $false
    }
  }
  Assert-BinderActivationConditionV1 (
    $ConfirmProduction
  ) 'Explicit ConfirmProduction is required.'
  $expectedAck = (
    'ACTIVATE-COLLABORATIVE-BINDERS-V1::' +
    $manifest.project_ref + '::' +
    $manifest.head_sha + '::' +
    $manifest.target_flag + '::' +
    $manifest.manifest_fingerprint_sha256
  )
  Assert-BinderActivationConditionV1 (
    $env:GROOKAI_BINDER_ACTIVATION_ACK -ceq $expectedAck
  ) 'Exact Binder activation acknowledgement is missing.'

  [void](Assert-BinderActivationSourceV1 -RepoRoot $RepoRoot)
  [void](Assert-BinderActivationRepositoryV1 `
    -RepoRoot $RepoRoot `
    -ExpectedHeadSha ([string]$manifest.head_sha))
  [void](Assert-ProjectBindingV1 -RepoRoot $RepoRoot)
  $clientsDark = Test-BinderActivationClientsDarkEvidenceV1 `
    -Path ([string]$manifest.clients_dark_evidence_root) `
    -ExpectedHeadSha ([string]$manifest.head_sha) `
    -ExpectedWebDeploymentId ([string]$manifest.web_deployment_id) `
    -ExpectedMobileVersionName ([string]$manifest.mobile_version_name) `
    -ExpectedMobileVersionCode ([int]$manifest.mobile_version_code) `
    -ExpectedMobileApkSha256 ([string]$manifest.mobile_apk_sha256) `
    -RepoRoot $RepoRoot
  Assert-BinderActivationConditionV1 (
    $clientsDark.ChecksumSha256 -ceq
      [string]$manifest.clients_dark_evidence_checksum_sha256 -and
    $clientsDark.EvidenceSha256 -ceq
      [string]$manifest.clients_dark_evidence_sha256 -and
    $clientsDark.EvidenceFingerprintSha256 -ceq
      [string]$manifest.clients_dark_evidence_fingerprint_sha256 -and
    $clientsDark.CreatedAtUtc -ceq
      [string]$manifest.clients_dark_evidence_created_at_utc -and
    $clientsDark.ExpiresAtUtc -ceq
      [string]$manifest.clients_dark_expires_at_utc -and
    $clientsDark.WebDeploymentId -ceq
      [string]$manifest.web_deployment_id -and
    $clientsDark.WebDeploymentCommitSha -ceq
      [string]$manifest.web_deployment_commit_sha -and
    $clientsDark.MobileApplicationId -ceq
      [string]$manifest.mobile_application_id -and
    $clientsDark.MobileVersionName -ceq
      [string]$manifest.mobile_version_name -and
    $clientsDark.MobileVersionCode -eq
      [int]$manifest.mobile_version_code -and
    $clientsDark.MobileApkSha256 -ceq
      [string]$manifest.mobile_apk_sha256
  ) 'Clients-dark evidence changed after activation preflight.'
  $prior = Test-BinderActivationPriorEvidenceV1 `
    -Path ([string]$manifest.prior_evidence_root) `
    -Phase $phase `
    -ExpectedHeadSha ([string]$manifest.head_sha) `
    -ExpectedWebDeploymentId ([string]$manifest.web_deployment_id) `
    -ExpectedMobileVersionName ([string]$manifest.mobile_version_name) `
    -ExpectedMobileVersionCode ([int]$manifest.mobile_version_code) `
    -ExpectedMobileApkSha256 ([string]$manifest.mobile_apk_sha256) `
    -RepoRoot $RepoRoot
  Assert-BinderActivationConditionV1 (
    $prior.ChecksumSha256 -ceq
      [string]$manifest.prior_evidence_checksum_sha256
  ) 'Prior evidence changed after activation preflight.'
  Assert-BinderActivationConditionV1 (
    [string]$manifest.activation_head_sha -ceq
      [string]$manifest.head_sha -and
    [string]$manifest.installation_evidence_head_sha -ceq
      [string]$prior.InstallationEvidenceHeadSha
  ) 'Activation and installation evidence HEAD continuity changed after preflight.'
  Assert-BinderActivationConditionV1 (
    $prior.BackupKind -ceq [string]$manifest.backup_kind -and
    $prior.BackupVerifiedAtUtc -ceq
      [string]$manifest.backup_verified_at_utc -and
    $prior.BackupRecoverableThroughUtc -ceq
      [string]$manifest.backup_recoverable_through_utc -and
    $prior.BackupEvidenceReference -ceq
      [string]$manifest.backup_evidence_reference -and
    $prior.BackupEvidenceSha256 -ceq
      [string]$manifest.backup_evidence_sha256 -and
    $prior.RestorePathReviewed -eq $true
  ) 'Backup recovery evidence changed after activation preflight.'

  $preflightRoot = Assert-BinderActivationArtifactRootV1 `
    -Path (Split-Path -Parent $manifestEnvelope.Path) `
    -RepoRoot $RepoRoot
  [void](Test-BinderActivationChecksumsV1 -Root $preflightRoot)
  $resolvedApplyCandidate = [IO.Path]::GetFullPath(
    $ArtifactRoot
  ).TrimEnd('\', '/')
  Assert-BinderActivationConditionV1 (
    (Split-Path -Parent $resolvedApplyCandidate) -ceq
      (Split-Path -Parent $preflightRoot) -and
    $resolvedApplyCandidate -cne $preflightRoot -and
    $resolvedApplyCandidate -cne $prior.Root -and
    $resolvedApplyCandidate -cne $clientsDark.Root
  ) 'Activation apply evidence must be a distinct preflight sibling.'

  $phaseSqlPath = Join-Path $RepoRoot ([string]$phase.file)
  $readbackSqlPath = Join-Path $RepoRoot (
    [string]$policy.Manifest.activation_readback.file
  )
  $configPath = Join-Path $RepoRoot 'supabase/config.toml'
  $projectRefPath = Join-Path $RepoRoot 'supabase/.temp/project-ref'
  $supabaseExecutable = Resolve-BinderSupabaseExecutableV1
  $binaryPath = [string]$supabaseExecutable.BinaryPath
  $launcherPath = [string]$supabaseExecutable.LauncherPath
  $shimDescriptorPath = [string]$supabaseExecutable.ShimDescriptorPath
  Assert-BinderActivationConditionV1 (
    -not [string]::IsNullOrWhiteSpace($binaryPath) -and
    -not [string]::IsNullOrWhiteSpace($launcherPath) -and
    -not [string]::IsNullOrWhiteSpace($shimDescriptorPath)
  ) 'Activation could not resolve the exact reviewed Supabase CLI files.'
  $sealPaths = @(
    $phaseSqlPath,
    $readbackSqlPath,
    $configPath,
    $projectRefPath,
    $binaryPath,
    $launcherPath,
    $shimDescriptorPath,
    $policy.ManifestPath,
    (Join-Path $RepoRoot (
      'scripts/ops/CollaborativeBindersActivationV1.psm1'
    )),
    (Join-Path $RepoRoot (
      [string]$policy.Manifest.production_rollout_module.file
    )),
    (Join-Path $RepoRoot (
      [string]$policy.Manifest.production_manifest.file
    )),
    $manifestEnvelope.Path,
    (Join-Path $preflightRoot 'activation-preflight-manifest.sha256'),
    (Join-Path $preflightRoot 'checksums.sha256'),
    $prior.ChecksumPath,
    $clientsDark.ChecksumPath
  )
  $sealPaths += @(
    Get-ChildItem -LiteralPath $clientsDark.Root -File -Recurse |
      Select-Object -ExpandProperty FullName
  )
  $sealStreams = @()
  $mutation = $null
  $mutationStarted = $false
  $mutationSucceeded = $false
  $lifecycle = [pscustomobject][ordered]@{
    Started = $false
    StartedAtUtc = $null
    SupervisorProcessId = $null
    TimedOut = $false
    KillAttempted = $false
    KillRequestSucceeded = $null
    KillRequestError = $null
    RootExited = $false
    ProcessTreeEmpty = $false
    TerminationConfirmed = $false
    ExitCode = $null
    EndedAtUtc = $null
    OutputCaptureCompleted = $false
  }
  $applyRoot = New-BinderActivationArtifactRootV1 `
    -Path $resolvedApplyCandidate `
    -RepoRoot $RepoRoot

  try {
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $applyRoot 'activation-intent.json') `
      -Value ([ordered]@{
        schema_version = 1
        package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
        package_fingerprint_sha256 = $policy.PackageFingerprintSha256
        project_ref = 'ycdxbpibncqcchqiihfz'
        head_sha = [string]$manifest.head_sha
        activation_head_sha = [string]$manifest.activation_head_sha
        installation_evidence_head_sha =
          [string]$manifest.installation_evidence_head_sha
        phase_sequence = [int]$phase.sequence
        target_flag = [string]$phase.flag_key
        enabled_flags_before = @($phase.enabled_before)
        enabled_flags_after = @($phase.enabled_after)
        rollout_model = [string]$manifest.rollout_model
        binder_domain_must_remain_empty =
          [bool]$manifest.binder_domain_must_remain_empty
        clients_dark_evidence_root = $clientsDark.Root
        clients_dark_evidence_checksum_sha256 =
          $clientsDark.ChecksumSha256
        clients_dark_evidence_sha256 =
          $clientsDark.EvidenceSha256
        clients_dark_evidence_fingerprint_sha256 =
          $clientsDark.EvidenceFingerprintSha256
        clients_dark_evidence_created_at_utc =
          $clientsDark.CreatedAtUtc
        clients_dark_expires_at_utc =
          $clientsDark.ExpiresAtUtc
        web_deployment_id =
          $clientsDark.WebDeploymentId
        web_deployment_commit_sha =
          $clientsDark.WebDeploymentCommitSha
        mobile_application_id =
          $clientsDark.MobileApplicationId
        mobile_version_name =
          $clientsDark.MobileVersionName
        mobile_version_code =
          $clientsDark.MobileVersionCode
        mobile_apk_sha256 =
          $clientsDark.MobileApkSha256
        preflight_manifest_path = $manifestEnvelope.Path
        preflight_manifest_sha256 = $manifestEnvelope.FileSha256
        preflight_manifest_fingerprint_sha256 =
          [string]$manifest.manifest_fingerprint_sha256
        prior_evidence_root = [string]$prior.Root
        prior_evidence_checksum_sha256 =
          [string]$prior.ChecksumSha256
        backup_kind = [string]$manifest.backup_kind
        backup_verified_at_utc =
          [string]$manifest.backup_verified_at_utc
        backup_recoverable_through_utc =
          [string]$manifest.backup_recoverable_through_utc
        backup_evidence_reference =
          [string]$manifest.backup_evidence_reference
        backup_evidence_sha256 =
          [string]$manifest.backup_evidence_sha256
        restore_path_reviewed =
          [bool]$manifest.restore_path_reviewed
        created_at_utc = [datetimeoffset]::UtcNow.ToString('o')
        mutation_started = $false
        automatic_retry_permitted = $false
      })
    $sealStreams = Open-BinderActivationSealV1 -Paths $sealPaths
    [void](Assert-BinderActivationSourceV1 -RepoRoot $RepoRoot)
    [void](Assert-BinderActivationRepositoryV1 `
      -RepoRoot $RepoRoot `
      -ExpectedHeadSha ([string]$manifest.head_sha))
    [void](Assert-ProjectBindingV1 -RepoRoot $RepoRoot)
    $clientsDarkAtApply =
      Test-BinderActivationClientsDarkEvidenceV1 `
      -Path $clientsDark.Root `
      -ExpectedHeadSha ([string]$manifest.head_sha) `
      -ExpectedWebDeploymentId ([string]$manifest.web_deployment_id) `
      -ExpectedMobileVersionName ([string]$manifest.mobile_version_name) `
      -ExpectedMobileVersionCode ([int]$manifest.mobile_version_code) `
      -ExpectedMobileApkSha256 ([string]$manifest.mobile_apk_sha256) `
      -RepoRoot $RepoRoot
    Assert-BinderActivationConditionV1 (
      $clientsDarkAtApply.ChecksumSha256 -ceq
        $clientsDark.ChecksumSha256
    ) 'Clients-dark evidence changed at the final activation seal.'
    $readbackBefore = Invoke-BinderActivationReadbackV1 `
      -RepoRoot $RepoRoot `
      -ExpectedEnabledFlags @($phase.enabled_before) `
      -ExecutablePath $binaryPath
    Assert-BinderActivationConditionV1 (
      $readbackBefore.ReportSha256 -ceq
        [string]$manifest.readback_before_sha256
    ) 'Activation live readback changed after preflight.'
    Assert-BinderActivationConditionV1 (
      [string]$readbackBefore.Report.checks.stable_catalog_fingerprint_sha256 -ceq
        [string]$manifest.stable_catalog_fingerprint_sha256
    ) 'Activation stable catalog changed after preflight.'
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $applyRoot 'readback.before.json') `
      -Value $readbackBefore.Report
    Assert-BinderActivationConditionV1 (
      (Get-BinderActivationSha256V1 -Path $phaseSqlPath) -ceq
        [string]$phase.sha256
    ) 'Activation phase SQL changed at the final seal.'

    $mutationStarted = $true
    $mutation = Invoke-BinderActivationSupabaseV1 `
      -Arguments @(
        'db',
        'query',
        '--linked',
        '--file',
        $phaseSqlPath,
        '--output',
        'json',
        '--agent',
        'no'
      ) `
      -RepoRoot $RepoRoot `
      -TimeoutSeconds 60 `
      -ProcessLifecycle $lifecycle `
      -ExecutablePath $binaryPath
    Write-BinderActivationTextV1 `
      -Path (Join-Path $applyRoot 'activation.stdout.txt') `
      -Value $mutation.StdOut
    Write-BinderActivationTextV1 `
      -Path (Join-Path $applyRoot 'activation.stderr.txt') `
      -Value $mutation.StdErr
    Assert-BinderActivationCommandSucceededV1 `
      -Result $mutation `
      -Label "Binder activation phase $($phase.flag_key)"
    $rows = @($mutation.StdOut | ConvertFrom-Json)
    Assert-BinderActivationConditionV1 (
      $rows.Count -eq 1 -and
      $null -ne $rows[0].activation_result
    ) 'Activation mutation must return exactly one result.'
    $activationResult = $rows[0].activation_result
    Assert-BinderActivationConditionV1 (
      $activationResult.ok -eq $true -and
      [int]$activationResult.updated_rows -eq 1 -and
      [int]$activationResult.phase_sequence -eq [int]$phase.sequence -and
      [string]$activationResult.target_flag -ceq [string]$phase.flag_key -and
      (@($activationResult.enabled_before) -join "`n") -ceq
        (@($phase.enabled_before) -join "`n") -and
      (@($activationResult.enabled_after) -join "`n") -ceq
        (@($phase.enabled_after) -join "`n")
    ) 'Activation mutation result failed its exact phase contract.'
    $mutationSucceeded = $true

    $readbackAfter = Invoke-BinderActivationReadbackV1 `
      -RepoRoot $RepoRoot `
      -ExpectedEnabledFlags @($phase.enabled_after) `
      -ExecutablePath $binaryPath
    Assert-BinderActivationConditionV1 (
      [string]$readbackAfter.Report.checks.stable_catalog_fingerprint_sha256 -ceq
        [string]$manifest.stable_catalog_fingerprint_sha256
    ) 'Stable catalog changed during Binder activation.'
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $applyRoot 'readback.after.json') `
      -Value $readbackAfter.Report
    $result = [ordered]@{
      status = 'pass'
      package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
      package_fingerprint_sha256 = $policy.PackageFingerprintSha256
      project_ref = 'ycdxbpibncqcchqiihfz'
      head_sha = [string]$manifest.head_sha
      activation_head_sha = [string]$manifest.activation_head_sha
      installation_evidence_head_sha =
        [string]$manifest.installation_evidence_head_sha
      phase_sequence = [int]$phase.sequence
      target_flag = [string]$phase.flag_key
      rollout_model = [string]$manifest.rollout_model
      binder_domain_must_remain_empty =
        [bool]$manifest.binder_domain_must_remain_empty
      clients_dark_evidence_root = $clientsDark.Root
      clients_dark_evidence_checksum_sha256 =
        $clientsDark.ChecksumSha256
      clients_dark_evidence_sha256 =
        $clientsDark.EvidenceSha256
      clients_dark_evidence_fingerprint_sha256 =
        $clientsDark.EvidenceFingerprintSha256
      clients_dark_evidence_created_at_utc =
        $clientsDark.CreatedAtUtc
      clients_dark_expires_at_utc =
        $clientsDark.ExpiresAtUtc
      web_deployment_id =
        $clientsDark.WebDeploymentId
      web_deployment_commit_sha =
        $clientsDark.WebDeploymentCommitSha
      mobile_application_id =
        $clientsDark.MobileApplicationId
      mobile_version_name =
        $clientsDark.MobileVersionName
      mobile_version_code =
        $clientsDark.MobileVersionCode
      mobile_apk_sha256 =
        $clientsDark.MobileApkSha256
      enabled_flags_before = @($phase.enabled_before)
      enabled_flags_after = @($phase.enabled_after)
      backup_kind = [string]$manifest.backup_kind
      backup_verified_at_utc =
        [string]$manifest.backup_verified_at_utc
      backup_recoverable_through_utc =
        [string]$manifest.backup_recoverable_through_utc
      backup_evidence_reference =
        [string]$manifest.backup_evidence_reference
      backup_evidence_sha256 =
        [string]$manifest.backup_evidence_sha256
      restore_path_reviewed =
        [bool]$manifest.restore_path_reviewed
      artifact_root = $applyRoot
      preflight_manifest_path = $manifestEnvelope.Path
      preflight_manifest_fingerprint_sha256 =
        [string]$manifest.manifest_fingerprint_sha256
      completed_at_utc = [datetimeoffset]::UtcNow.ToString('o')
      mutation_started = [bool]$lifecycle.Started
      mutation_succeeded = $mutationSucceeded
      mutation_timed_out = [bool]$lifecycle.TimedOut
      mutation_termination_confirmed =
        [bool]$lifecycle.TerminationConfirmed
      mutation_exit_code = $lifecycle.ExitCode
      mutation_possible = [bool]$lifecycle.Started
      mutation_output_truncated = if ($null -ne $mutation) {
        [bool]$mutation.OutputTruncated
      } else {
        $null
      }
      automatic_retry_permitted = $false
      automatic_rollback_permitted = $false
      excluded_flags = @($policy.Manifest.excluded_flags)
      excluded_project_phase = 'P8'
    }
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $applyRoot 'apply-result.json') `
      -Value $result
    Write-BinderActivationChecksumsV1 -Root $applyRoot
    return [pscustomobject]$result
  } catch {
    $originalError = $_
    $diagnosticReadback = $null
    $diagnosticError = $null
    $diagnostic_state = 'not_run'
    if ($lifecycle.Started -and $lifecycle.TerminationConfirmed) {
      try {
        $diagnosticReadback =
          Invoke-BinderActivationDiagnosticReadbackV1 `
          -RepoRoot $RepoRoot `
          -EnabledBefore @($phase.enabled_before) `
          -EnabledAfter @($phase.enabled_after) `
          -ExecutablePath $binaryPath
        $diagnostic_state = $diagnosticReadback.DiagnosticState
        Write-BinderActivationJsonV1 `
          -Path (Join-Path $applyRoot 'diagnostic-readback.json') `
          -Value $diagnosticReadback.Report
      } catch {
        $diagnosticError = $_.Exception.Message
        $diagnostic_state = 'diagnostic_failed'
        Write-BinderActivationJsonV1 `
          -Path (Join-Path $applyRoot 'diagnostic-error.json') `
          -Value ([ordered]@{
            status = 'diagnostic_failed'
            recorded_at_utc = [datetimeoffset]::UtcNow.ToString('o')
            message = $diagnosticError
            mutation_state_remains_unknown = $true
          })
      }
    }
    $incident = [ordered]@{
      status = 'stop'
      package_id = 'COLLABORATIVE-BINDERS-ACTIVATION-V1'
      package_fingerprint_sha256 = $policy.PackageFingerprintSha256
      project_ref = 'ycdxbpibncqcchqiihfz'
      head_sha = [string]$manifest.head_sha
      activation_head_sha = [string]$manifest.activation_head_sha
      installation_evidence_head_sha =
        [string]$manifest.installation_evidence_head_sha
      phase_sequence = [int]$phase.sequence
      target_flag = [string]$phase.flag_key
      enabled_flags_before = @($phase.enabled_before)
      enabled_flags_after = @($phase.enabled_after)
      rollout_model = [string]$manifest.rollout_model
      binder_domain_must_remain_empty =
        [bool]$manifest.binder_domain_must_remain_empty
      clients_dark_evidence_root = $clientsDark.Root
      clients_dark_evidence_checksum_sha256 =
        $clientsDark.ChecksumSha256
      clients_dark_evidence_sha256 =
        $clientsDark.EvidenceSha256
      clients_dark_evidence_fingerprint_sha256 =
        $clientsDark.EvidenceFingerprintSha256
      clients_dark_evidence_created_at_utc =
        $clientsDark.CreatedAtUtc
      clients_dark_expires_at_utc =
        $clientsDark.ExpiresAtUtc
      web_deployment_id =
        $clientsDark.WebDeploymentId
      web_deployment_commit_sha =
        $clientsDark.WebDeploymentCommitSha
      mobile_application_id =
        $clientsDark.MobileApplicationId
      mobile_version_name =
        $clientsDark.MobileVersionName
      mobile_version_code =
        $clientsDark.MobileVersionCode
      mobile_apk_sha256 =
        $clientsDark.MobileApkSha256
      backup_kind = [string]$manifest.backup_kind
      backup_verified_at_utc =
        [string]$manifest.backup_verified_at_utc
      backup_recoverable_through_utc =
        [string]$manifest.backup_recoverable_through_utc
      backup_evidence_reference =
        [string]$manifest.backup_evidence_reference
      backup_evidence_sha256 =
        [string]$manifest.backup_evidence_sha256
      restore_path_reviewed =
        [bool]$manifest.restore_path_reviewed
      artifact_root = $applyRoot
      preflight_manifest_path = $manifestEnvelope.Path
      recorded_at_utc = [datetimeoffset]::UtcNow.ToString('o')
      message = $originalError.Exception.Message
      mutation_attempted = $mutationStarted
      mutation_started = [bool]$lifecycle.Started
      mutation_succeeded = $mutationSucceeded
      mutation_timed_out = [bool]$lifecycle.TimedOut
      mutation_termination_confirmed =
        [bool]$lifecycle.TerminationConfirmed
      mutation_exit_code = $lifecycle.ExitCode
      mutation_possible = [bool]$lifecycle.Started
      mutation_output_truncated = if ($null -ne $mutation) {
        [bool]$mutation.OutputTruncated
      } else {
        $null
      }
      diagnostic_state = $diagnostic_state
      diagnostic_error = $diagnosticError
      diagnostic_enabled_flags = if ($null -ne $diagnosticReadback) {
        @($diagnosticReadback.EnabledFlags)
      } else {
        $null
      }
      diagnostic_effective_enabled_flags = if (
        $null -ne $diagnosticReadback
      ) {
        @($diagnosticReadback.EffectiveEnabledFlags)
      } else {
        $null
      }
      automatic_retry_permitted = $false
      automatic_rollback_permitted = $false
      excluded_flags = @($policy.Manifest.excluded_flags)
      excluded_project_phase = 'P8'
    }
    Write-BinderActivationJsonV1 `
      -Path (Join-Path $applyRoot 'STOP-incident.json') `
      -Value $incident
    try {
      Write-BinderActivationChecksumsV1 -Root $applyRoot
    } catch {
      Write-BinderActivationTextV1 `
        -Path (Join-Path $applyRoot 'checksums-error.txt') `
        -Value (
          'Activation incident checksum generation failed: ' +
          $_.Exception.Message +
          [Environment]::NewLine
        )
    }
    throw $originalError
  } finally {
    if ($lifecycle.Started -and -not $lifecycle.TerminationConfirmed) {
      [Environment]::FailFast(
        'Activation process-tree termination was not confirmed; ' +
        'the source seal intentionally remains open.'
      )
    }
    Close-BinderActivationSealV1 -Streams $sealStreams
  }
}

Export-ModuleMember -Function @(
  'Get-BinderActivationPolicyV1',
  'Get-BinderActivationPhaseV1',
  'Assert-BinderActivationSourceV1',
  'Test-BinderActivationChecksumsV1',
  'Test-BinderActivationClientsDarkEvidenceV1',
  'New-BinderActivationClientsDarkEvidenceV1',
  'Invoke-BinderActivationReadbackV1',
  'Invoke-BinderActivationPreflightV1',
  'Read-BinderActivationPreflightManifestV1',
  'Invoke-BinderActivationRecoveryV1',
  'Invoke-BinderActivationKillSwitchV1',
  'Invoke-BinderActivationApplyV1'
)
