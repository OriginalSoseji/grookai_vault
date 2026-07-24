Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:BinderSupervisorPackageFingerprintV1 =
  '14a235d9ca9bc2172ddd3bfb8e2ba8b8812849079fe0469b73f35d02b6b47fb9'
$script:BinderSupervisorStableCatalogFingerprintV1 =
  'c9921f9eb36a7633620f46c495aa48f868f0b1eedbb9dda028cff0bba52f6f38'

function Stop-BinderUnattendedV1 {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
      'safe_stop_pre_mutation',
      'local_integrity_stop',
      'mutation_possible_stop'
    )]
    [string]$ExitClass,

    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  $exception = [System.InvalidOperationException]::new($Message)
  $exception.Data['BinderSupervisorExitClass'] = $ExitClass
  throw $exception
}

function Assert-BinderUnattendedConditionV1 {
  param(
    [Parameter(Mandatory = $true)]
    [bool]$Condition,

    [Parameter(Mandatory = $true)]
    [string]$Message,

    [ValidateSet(
      'safe_stop_pre_mutation',
      'local_integrity_stop',
      'mutation_possible_stop'
    )]
    [string]$ExitClass = 'local_integrity_stop'
  )

  if (-not $Condition) {
    Stop-BinderUnattendedV1 -ExitClass $ExitClass -Message $Message
  }
}

function Get-BinderUnattendedPolicyV1 {
  [CmdletBinding()]
  param()

  $localAppData = [Environment]::GetFolderPath(
    [Environment+SpecialFolder]::LocalApplicationData
  )
  Assert-BinderUnattendedConditionV1 (
    -not [string]::IsNullOrWhiteSpace($localAppData)
  ) 'Windows LocalApplicationData could not be resolved.'
  $baseNamespace = Join-Path $localAppData 'GrookaiVaultSecureOps'
  $secureNamespace = Join-Path $baseNamespace 'CollaborativeBindersV1'
  $stateNamespace = Join-Path $secureNamespace 'state'
  $stateIdentity = (
    'ycdxbpibncqcchqiihfz--COLLABORATIVE-BINDERS-DB-V1--' +
    $script:BinderSupervisorPackageFingerprintV1
  )

  return [pscustomobject][ordered]@{
    SchemaVersion = 1
    PackageId = 'COLLABORATIVE-BINDERS-DB-V1'
    PackageFingerprintSha256 = $script:BinderSupervisorPackageFingerprintV1
    PackageManifestSha256 =
      '2e5458ba2d8161d963f561066f1e745586ebfb9e1296e695f1fbf60c6cc03a90'
    TrackedMigrationCount = 294
    TrackedMigrationSetSha256 =
      '19226d5ea43c8dce5173aa12bb0a2aff8b184b3c9080a181955f9cbc23f5c2f3'
    ProjectRef = 'ycdxbpibncqcchqiihfz'
    ProjectUrl = 'https://ycdxbpibncqcchqiihfz.supabase.co'
    CanonicalRepository = 'OriginalSoseji/grookai_vault'
    CanonicalRemoteUrl =
      'https://github.com/OriginalSoseji/grookai_vault.git'
    GitExecutablePath =
      'C:\Program Files\Git\mingw64\bin\git.exe'
    GitExecutableSha256 =
      '755d4896d35663d0ff08924f84507f35236b83d240635b512c519bf43cc71a87'
    GitVersion = 'git version 2.51.0.windows.1'
    GitExecPath =
      'C:\Program Files\Git\mingw64\libexec\git-core'
    GitHttpsHelperPath =
      'C:\Program Files\Git\mingw64\libexec\git-core\git-remote-https.exe'
    GitHttpsHelperSha256 =
      '0a5b9d55a338d202f88044c36fe0feb76cb57b68a4176798a80edacc706a34b8'
    SupabaseConfigSha256 =
      'd7ed1face7c1d1fbc70d35393ae3a42268e27886bd0e15d0b96bc1af439b1567'
    LinkedProjectRefSha256 =
      'caf1b086f20f10f60aa27783311afb3466ef31390aba80a00206730ff233d40f'
    LinkedPoolerUrlSha256 =
      'd3609ad1cb525989b2fdbe7f0f25b7fff26fac19c72e2759893de1998a5295c1'
    LinkedProjectMetadataSha256 =
      'f86521274b66370ec59227b2a5906f8bcb4499658b54306b50427196ff60e8ed'
    StableCatalogFingerprintSha256 =
      $script:BinderSupervisorStableCatalogFingerprintV1
    SupportedSupabaseCliVersion = '2.90.0'
    SupabaseCliLauncherSha256 =
      '140e3801d8adeda639a21b14e62b93a4c7d26b7a758421f43c82be59753be49b'
    SupabaseCliBinarySha256 =
      '31c2a25bd590a36ad803a7c669cf76a62eac3cd5aa7112eeb2e1c5f308c8b39c'
    SupabaseCliShimDescriptorSha256 =
      '0c68f69a367b2b76e61f3e71fb98c9a867143628a361a2e715dd30f33c4b2c3f'
    RolloutModuleRelativePath =
      'scripts/ops/CollaborativeBindersProductionRolloutV1.psm1'
    SupervisorModuleRelativePath =
      'scripts/ops/CollaborativeBindersUnattendedSupervisorV1.psm1'
    SupervisorEntrypointRelativePath =
      'scripts/ops/collaborative_binders_unattended_supervisor_v1.ps1'
    PreflightEntrypointRelativePath =
      'scripts/ops/collaborative_binders_production_preflight_v1.ps1'
    ApplyEntrypointRelativePath =
      'scripts/ops/collaborative_binders_production_apply_v1.ps1'
    PackageManifestRelativePath =
      'scripts/ops/collaborative_binders_production_manifest_v1.json'
    PreflightSqlRelativePath =
      'scripts/ops/sql/collaborative_binders_production_preflight_v1.sql'
    PostApplySqlRelativePath =
      'scripts/ops/sql/collaborative_binders_production_post_apply_v1.sql'
    RestoreProcedureRelativePath =
      'docs/runbooks/SUPABASE_PLATFORM_BACKUP_RESTORE_PROCEDURE_V1.md'
    RestoreProcedureUri =
      'repo:///docs/runbooks/SUPABASE_PLATFORM_BACKUP_RESTORE_PROCEDURE_V1.md'
    PreflightSqlSha256 =
      '268458ed8a4a16dc513b55b6d0e5b3b03c301320e55a9ab4887a135c7652800d'
    PostApplySqlSha256 =
      '5125b0d89f5b3d36c66f98863f0b69b9c6df55561dfb54303437d47d8731f1a1'
    BaseNamespaceRoot = $baseNamespace
    SecureNamespaceRoot = $secureNamespace
    StateNamespaceRoot = $stateNamespace
    StateRoot = Join-Path $stateNamespace $stateIdentity
    ArtifactNamespaceRoot = Join-Path $secureNamespace 'artifacts'
    MutexName =
      'Global\GrookaiVault.CollaborativeBinders.DBV1.ycdxbpibncqcchqiihfz'
    AttemptClaimFileName = 'UNATTENDED_ATTEMPT_CLAIMED'
    MutationClaimFileName = 'MUTATION_LAUNCH_COMMITTED'
    BackupListArguments = @(
      'backups',
      'list',
      '--project-ref',
      'ycdxbpibncqcchqiihfz',
      '--output',
      'json',
      '--agent',
      'no'
    )
    ApplyArguments = @('db', 'push', '--linked', '--yes')
    BackupPollSeconds = 60
    BackupConfirmationSeconds = 30
    BackupMaximumAgeMinutes = 5
    BackupNotBeforeUtc = '2026-07-24T10:25:37.891Z'
    BackupExpectedRegion = 'us-east-2'
    BackupExpectedPitrEnabled = $false
    BackupExpectedWalgEnabled = $true
    BackupGuardMaximumAgeMinutes = 15
    BackupApplyReserveMinutes = 5
    AuthorizationMaximumHours = 36
    Migrations = @(
      [pscustomobject][ordered]@{
        version = '20260723100000'
        file = '20260723100000_collaborative_binders_schema_v1.sql'
        sha256 =
          '7e83ab8bb83e5b938fbec758b21f8cae2b4a71427a6600c54c5f773c974bae33'
      },
      [pscustomobject][ordered]@{
        version = '20260723101000'
        file = '20260723101000_collaborative_binders_core_rpcs_v1.sql'
        sha256 =
          'eb9ca9898bca12b127f4b79aff9df81259efe74fa1029487ea133e94e8a67a7d'
      },
      [pscustomobject][ordered]@{
        version = '20260723102000'
        file = '20260723102000_collaborative_binders_collaboration_rpcs_v1.sql'
        sha256 =
          '680580044161936c8a382e5209e2cc54369943e13f1a3ae2ed41c299532cf3bf'
      },
      [pscustomobject][ordered]@{
        version = '20260723103000'
        file = '20260723103000_collaborative_binders_read_rpcs_v1.sql'
        sha256 =
          '73dab7009f059267dcc571fcb6ec79cffdb23b728fc5bf04cd81397a06bcd6fb'
      },
      [pscustomobject][ordered]@{
        version = '20260723104000'
        file = '20260723104000_collaborative_binders_service_rpcs_v1.sql'
        sha256 =
          '2edbef712d6b228c73b504498a6aa09f5bac440cfef96319d5c75f65e12d2997'
      }
    )
    FeatureFlags = @(
      'schema_internal',
      'personal',
      'set_binders',
      'custom',
      'shared',
      'view_links',
      'public',
      'community',
      'templates',
      'notifications',
      'pulse_milestones'
    )
    ExcludedFlags = @(
      'set_binders',
      'notifications',
      'pulse_milestones'
    )
    ExpectedPreApply = [pscustomobject][ordered]@{
      binder_relation_collision_count = 0
      binder_type_collision_count = 0
      binder_function_count = 0
      applied_package_migration_count = 0
      binder_realtime_object_exists = $false
      binder_card_event_data_exists = $false
      binder_trust_report_data_exists = $false
      wrapped_pulse_function_exists = $false
    }
    PreflightArtifacts = @(
      'approval.txt',
      'backup-evidence.digest.json',
      'dry-run.parsed.json',
      'dry-run.stderr.txt',
      'dry-run.stdout.txt',
      'ledger.before.json',
      'ledger.before.txt',
      'preflight-manifest.json',
      'preflight-manifest.sha256',
      'project-binding.json',
      'readback.before.json',
      'repository.json',
      'source.json'
    )
  }
}

function Get-BinderUnattendedRepoRootV1 {
  return [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..\..')
  )
}

function Get-BinderUnattendedSha256BytesV1 {
  param(
    [Parameter(Mandatory = $true)]
    [byte[]]$Bytes
  )

  return [Convert]::ToHexString(
    [System.Security.Cryptography.SHA256]::HashData($Bytes)
  ).ToLowerInvariant()
}

function Get-BinderUnattendedSha256FileV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $stream = [System.IO.File]::Open(
    [System.IO.Path]::GetFullPath($Path),
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::Read
  )
  try {
    return [Convert]::ToHexString(
      [System.Security.Cryptography.SHA256]::HashData($stream)
    ).ToLowerInvariant()
  } finally {
    $stream.Dispose()
  }
}

function ConvertTo-BinderUnattendedUtcV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  Assert-BinderUnattendedConditionV1 (
    $Value -cmatch
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$'
  ) "$Label must be an explicit ISO-8601 timestamp with a UTC designator or offset."
  $parsed = [datetimeoffset]::MinValue
  $styles = (
    [System.Globalization.DateTimeStyles]::AllowWhiteSpaces -bor
    [System.Globalization.DateTimeStyles]::AdjustToUniversal
  )
  $valid = [datetimeoffset]::TryParse(
    $Value,
    [cultureinfo]::InvariantCulture,
    $styles,
    [ref]$parsed
  )
  Assert-BinderUnattendedConditionV1 $valid "$Label is not a valid timestamp."
  return $parsed.ToUniversalTime()
}

function Get-BinderUnattendedJsonObjectPropertiesV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Text.Json.JsonElement]$Element,

    [Parameter(Mandatory = $true)]
    [string[]]$ExpectedNames,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  Assert-BinderUnattendedConditionV1 (
    $Element.ValueKind -eq [System.Text.Json.JsonValueKind]::Object
  ) "$Label must be a JSON object."
  $properties = @($Element.EnumerateObject())
  $seen = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
  )
  $seenCaseFolded = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
  )
  foreach ($property in $properties) {
    Assert-BinderUnattendedConditionV1 (
      -not [regex]::IsMatch($property.Name, '[\x00-\x1f\x7f]')
    ) "$Label contains a control character in a JSON field name."
    Assert-BinderUnattendedConditionV1 (
      $seen.Add($property.Name)
    ) "$Label contains a duplicate JSON field: $($property.Name)"
    Assert-BinderUnattendedConditionV1 (
      $seenCaseFolded.Add($property.Name)
    ) "$Label contains a duplicate or case-colliding JSON field: $($property.Name)"
  }
  $actualNames = @($properties | ForEach-Object Name)
  Assert-BinderUnattendedConditionV1 (
    $actualNames.Count -eq $ExpectedNames.Count
  ) "$Label field count does not match the closed V1 schema."
  for ($index = 0; $index -lt $ExpectedNames.Count; $index += 1) {
    Assert-BinderUnattendedConditionV1 (
      $actualNames[$index] -ceq $ExpectedNames[$index]
    ) "$Label field order does not match the closed V1 schema."
  }
  return $properties
}

function Get-BinderUnattendedJsonStringV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Text.Json.JsonElement]$Element,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $value = [System.Text.Json.JsonElement]::new()
  Assert-BinderUnattendedConditionV1 (
    $Element.TryGetProperty($Name, [ref]$value)
  ) "$Label is missing $Name."
  Assert-BinderUnattendedConditionV1 (
    $value.ValueKind -eq [System.Text.Json.JsonValueKind]::String
  ) "$Label.$Name must be a string."
  return $value.GetString()
}

function Get-BinderUnattendedJsonBooleanV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Text.Json.JsonElement]$Element,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $value = [System.Text.Json.JsonElement]::new()
  Assert-BinderUnattendedConditionV1 (
    $Element.TryGetProperty($Name, [ref]$value)
  ) "$Label is missing $Name."
  Assert-BinderUnattendedConditionV1 (
    $value.ValueKind -eq [System.Text.Json.JsonValueKind]::True -or
    $value.ValueKind -eq [System.Text.Json.JsonValueKind]::False
  ) "$Label.$Name must be a boolean."
  return $value.GetBoolean()
}

function Get-BinderUnattendedJsonInt32V1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Text.Json.JsonElement]$Element,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $value = [System.Text.Json.JsonElement]::new()
  $parsed = 0
  Assert-BinderUnattendedConditionV1 (
    $Element.TryGetProperty($Name, [ref]$value) -and
    $value.ValueKind -eq [System.Text.Json.JsonValueKind]::Number -and
    $value.TryGetInt32([ref]$parsed)
  ) "$Label.$Name must be a 32-bit integer."
  return $parsed
}

function ConvertFrom-BinderUnattendedJsonStringArrayV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Text.Json.JsonElement]$Element,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $value = [System.Text.Json.JsonElement]::new()
  Assert-BinderUnattendedConditionV1 (
    $Element.TryGetProperty($Name, [ref]$value) -and
    $value.ValueKind -eq [System.Text.Json.JsonValueKind]::Array
  ) "$Label.$Name must be an array."
  return @(
    foreach ($entry in $value.EnumerateArray()) {
      Assert-BinderUnattendedConditionV1 (
        $entry.ValueKind -eq [System.Text.Json.JsonValueKind]::String
      ) "$Label.$Name must contain only strings."
      $entry.GetString()
    }
  )
}

function Get-BinderUnattendedAuthorizationPropertyOrderV1 {
  return @(
    'schema_version',
    'authorization_id',
    'issued_at_utc',
    'not_before_utc',
    'backup_poll_deadline_utc',
    'mutation_deadline_utc',
    'expires_at_utc',
    'operator',
    'reviewer',
    'restore_path_reviewed',
    'restore_procedure_uri',
    'restore_procedure_sha256',
    'state_root',
    'artifact_root',
    'project_ref',
    'project_url',
    'canonical_repository',
    'canonical_remote_url',
    'supabase_config_sha256',
    'linked_project_ref_sha256',
    'linked_pooler_url_sha256',
    'linked_project_metadata_sha256',
    'git_executable_path',
    'git_executable_sha256',
    'git_version',
    'git_exec_path',
    'git_https_helper_path',
    'git_https_helper_sha256',
    'git_common_config_sha256',
    'git_metadata_count',
    'git_metadata_sha256',
    'reviewed_main_sha',
    'package_id',
    'package_fingerprint_sha256',
    'package_manifest_sha256',
    'tracked_migration_count',
    'tracked_migration_set_sha256',
    'supervisor_module_sha256',
    'supervisor_entrypoint_sha256',
    'rollout_module_sha256',
    'preflight_entrypoint_sha256',
    'apply_entrypoint_sha256',
    'preflight_sql_sha256',
    'post_apply_sql_sha256',
    'supabase_cli_version',
    'supabase_cli_launcher_sha256',
    'supabase_cli_binary_sha256',
    'supabase_cli_shim_descriptor_sha256',
    'backup_source',
    'backup_not_before_utc',
    'stable_catalog_fingerprint_sha256',
    'migrations',
    'apply_argv',
    'feature_flags_must_remain_disabled',
    'excluded_from_rollout',
    'expected_preapply',
    'p8_excluded',
    'activation_allowed',
    'deployment_allowed',
    'migration_repair_allowed',
    'one_attempt_only',
    'automatic_retry_allowed'
  )
}

function Assert-BinderUnattendedScalarStringV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value,
    [Parameter(Mandatory = $true)]
    [string]$Label,
    [int]$MaximumLength = 512
  )

  Assert-BinderUnattendedConditionV1 (
    -not [string]::IsNullOrWhiteSpace($Value)
  ) "$Label must not be blank."
  Assert-BinderUnattendedConditionV1 (
    $Value.Length -le $MaximumLength
  ) "$Label exceeds the maximum length."
  Assert-BinderUnattendedConditionV1 (
    $Value -ceq $Value.Trim()
  ) "$Label must not contain leading or trailing whitespace."
  Assert-BinderUnattendedConditionV1 (
    -not [regex]::IsMatch($Value, '[\x00-\x1f\x7f]')
  ) "$Label contains a control character."
}

function ConvertFrom-BinderUnattendedAuthorizationJsonV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Json
  )

  $document = $null
  try {
    $options = [System.Text.Json.JsonDocumentOptions]::new()
    $options.AllowTrailingCommas = $false
    $options.CommentHandling =
      [System.Text.Json.JsonCommentHandling]::Disallow
    $options.MaxDepth = 16
    $document = [System.Text.Json.JsonDocument]::Parse($Json, $options)
    $root = $document.RootElement
    [void](Get-BinderUnattendedJsonObjectPropertiesV1 `
      -Element $root `
      -ExpectedNames (Get-BinderUnattendedAuthorizationPropertyOrderV1) `
      -Label 'Authorization envelope')

    $schemaVersion = Get-BinderUnattendedJsonInt32V1 `
      -Element $root -Name 'schema_version' -Label 'Authorization envelope'
    $authorizationId = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'authorization_id' -Label 'Authorization envelope'
    $issuedAt = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'issued_at_utc' -Label 'Authorization envelope'
    $notBefore = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'not_before_utc' -Label 'Authorization envelope'
    $backupPollDeadline = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'backup_poll_deadline_utc' `
      -Label 'Authorization envelope'
    $mutationDeadline = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'mutation_deadline_utc' `
      -Label 'Authorization envelope'
    $expiresAt = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'expires_at_utc' -Label 'Authorization envelope'
    $operator = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'operator' -Label 'Authorization envelope'
    $reviewer = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'reviewer' -Label 'Authorization envelope'
    $restoreProcedureUri = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'restore_procedure_uri' `
      -Label 'Authorization envelope'
    $restoreProcedureSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'restore_procedure_sha256' `
      -Label 'Authorization envelope'
    $stateRoot = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'state_root' -Label 'Authorization envelope'
    $artifactRoot = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'artifact_root' -Label 'Authorization envelope'
    $projectRef = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'project_ref' -Label 'Authorization envelope'
    $projectUrl = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'project_url' -Label 'Authorization envelope'
    $canonicalRepository = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'canonical_repository' `
      -Label 'Authorization envelope'
    $canonicalRemoteUrl = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'canonical_remote_url' `
      -Label 'Authorization envelope'
    $supabaseConfigSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'supabase_config_sha256' `
      -Label 'Authorization envelope'
    $linkedProjectRefSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'linked_project_ref_sha256' `
      -Label 'Authorization envelope'
    $linkedPoolerUrlSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'linked_pooler_url_sha256' `
      -Label 'Authorization envelope'
    $linkedProjectMetadataSha256 =
      Get-BinderUnattendedJsonStringV1 `
        -Element $root -Name 'linked_project_metadata_sha256' `
        -Label 'Authorization envelope'
    $gitExecutablePath = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'git_executable_path' `
      -Label 'Authorization envelope'
    $gitExecutableSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'git_executable_sha256' `
      -Label 'Authorization envelope'
    $gitVersion = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'git_version' `
      -Label 'Authorization envelope'
    $gitExecPath = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'git_exec_path' `
      -Label 'Authorization envelope'
    $gitHttpsHelperPath = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'git_https_helper_path' `
      -Label 'Authorization envelope'
    $gitHttpsHelperSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'git_https_helper_sha256' `
      -Label 'Authorization envelope'
    $gitCommonConfigSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'git_common_config_sha256' `
      -Label 'Authorization envelope'
    $gitMetadataCount = Get-BinderUnattendedJsonInt32V1 `
      -Element $root -Name 'git_metadata_count' `
      -Label 'Authorization envelope'
    $gitMetadataSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'git_metadata_sha256' `
      -Label 'Authorization envelope'
    $reviewedMainSha = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'reviewed_main_sha' `
      -Label 'Authorization envelope'
    $packageId = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'package_id' -Label 'Authorization envelope'
    $packageFingerprint = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'package_fingerprint_sha256' `
      -Label 'Authorization envelope'
    $packageManifestSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'package_manifest_sha256' `
      -Label 'Authorization envelope'
    $trackedMigrationCount = Get-BinderUnattendedJsonInt32V1 `
      -Element $root -Name 'tracked_migration_count' `
      -Label 'Authorization envelope'
    $trackedMigrationSetSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'tracked_migration_set_sha256' `
      -Label 'Authorization envelope'
    $supervisorModuleSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'supervisor_module_sha256' `
      -Label 'Authorization envelope'
    $supervisorEntrypointSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'supervisor_entrypoint_sha256' `
      -Label 'Authorization envelope'
    $rolloutModuleSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'rollout_module_sha256' `
      -Label 'Authorization envelope'
    $preflightEntrypointSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'preflight_entrypoint_sha256' `
      -Label 'Authorization envelope'
    $applyEntrypointSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'apply_entrypoint_sha256' `
      -Label 'Authorization envelope'
    $preflightSqlSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'preflight_sql_sha256' `
      -Label 'Authorization envelope'
    $postApplySqlSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'post_apply_sql_sha256' `
      -Label 'Authorization envelope'
    $supabaseCliVersion = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'supabase_cli_version' `
      -Label 'Authorization envelope'
    $supabaseCliLauncherSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'supabase_cli_launcher_sha256' `
      -Label 'Authorization envelope'
    $supabaseCliBinarySha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'supabase_cli_binary_sha256' `
      -Label 'Authorization envelope'
    $supabaseCliShimDescriptorSha256 = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'supabase_cli_shim_descriptor_sha256' `
      -Label 'Authorization envelope'
    $backupSource = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'backup_source' -Label 'Authorization envelope'
    $backupNotBefore = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'backup_not_before_utc' `
      -Label 'Authorization envelope'
    $stableCatalogFingerprint = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'stable_catalog_fingerprint_sha256' `
      -Label 'Authorization envelope'

    foreach ($entry in @(
      @($authorizationId, 'authorization_id', 64),
      @($operator, 'operator', 160),
      @($reviewer, 'reviewer', 160),
      @($restoreProcedureUri, 'restore_procedure_uri', 256),
      @($stateRoot, 'state_root', 512),
      @($artifactRoot, 'artifact_root', 512),
      @($projectRef, 'project_ref', 64),
      @($projectUrl, 'project_url', 256),
      @($canonicalRepository, 'canonical_repository', 160),
      @($canonicalRemoteUrl, 'canonical_remote_url', 256),
      @($gitExecutablePath, 'git_executable_path', 512),
      @($gitVersion, 'git_version', 96),
      @($gitExecPath, 'git_exec_path', 512),
      @($gitHttpsHelperPath, 'git_https_helper_path', 512),
      @($packageId, 'package_id', 96),
      @($supabaseCliVersion, 'supabase_cli_version', 32),
      @($backupSource, 'backup_source', 64)
    )) {
      Assert-BinderUnattendedScalarStringV1 `
        -Value ([string]$entry[0]) `
        -Label "Authorization envelope.$($entry[1])" `
        -MaximumLength ([int]$entry[2])
    }

    foreach ($entry in @(
      @($restoreProcedureSha256, 'restore_procedure_sha256'),
      @($supabaseConfigSha256, 'supabase_config_sha256'),
      @($linkedProjectRefSha256, 'linked_project_ref_sha256'),
      @($linkedPoolerUrlSha256, 'linked_pooler_url_sha256'),
      @(
        $linkedProjectMetadataSha256,
        'linked_project_metadata_sha256'
      ),
      @($gitExecutableSha256, 'git_executable_sha256'),
      @($gitHttpsHelperSha256, 'git_https_helper_sha256'),
      @($gitCommonConfigSha256, 'git_common_config_sha256'),
      @($gitMetadataSha256, 'git_metadata_sha256'),
      @($packageFingerprint, 'package_fingerprint_sha256'),
      @($packageManifestSha256, 'package_manifest_sha256'),
      @($trackedMigrationSetSha256, 'tracked_migration_set_sha256'),
      @($supervisorModuleSha256, 'supervisor_module_sha256'),
      @($supervisorEntrypointSha256, 'supervisor_entrypoint_sha256'),
      @($rolloutModuleSha256, 'rollout_module_sha256'),
      @($preflightEntrypointSha256, 'preflight_entrypoint_sha256'),
      @($applyEntrypointSha256, 'apply_entrypoint_sha256'),
      @($preflightSqlSha256, 'preflight_sql_sha256'),
      @($postApplySqlSha256, 'post_apply_sql_sha256'),
      @($supabaseCliLauncherSha256, 'supabase_cli_launcher_sha256'),
      @($supabaseCliBinarySha256, 'supabase_cli_binary_sha256'),
      @(
        $supabaseCliShimDescriptorSha256,
        'supabase_cli_shim_descriptor_sha256'
      ),
      @($stableCatalogFingerprint, 'stable_catalog_fingerprint_sha256')
    )) {
      Assert-BinderUnattendedConditionV1 (
        [string]$entry[0] -cmatch '^[0-9a-f]{64}$'
      ) "Authorization envelope.$($entry[1]) must be lowercase SHA-256."
    }
    Assert-BinderUnattendedConditionV1 (
      $reviewedMainSha -cmatch '^[0-9a-f]{40}$'
    ) 'Authorization envelope.reviewed_main_sha must be lowercase SHA-1.'
    Assert-BinderUnattendedConditionV1 (
      $authorizationId -cmatch '^[0-9a-f]{32}$'
    ) 'Authorization envelope.authorization_id must be 32 lowercase hex characters.'

    $migrationsElement = [System.Text.Json.JsonElement]::new()
    Assert-BinderUnattendedConditionV1 (
      $root.TryGetProperty('migrations', [ref]$migrationsElement) -and
      $migrationsElement.ValueKind -eq
        [System.Text.Json.JsonValueKind]::Array
    ) 'Authorization envelope.migrations must be an array.'
    $migrations = @(
      foreach ($migration in $migrationsElement.EnumerateArray()) {
        [void](Get-BinderUnattendedJsonObjectPropertiesV1 `
          -Element $migration `
          -ExpectedNames @('version', 'file', 'sha256') `
          -Label 'Authorization envelope.migrations entry')
        [pscustomobject][ordered]@{
          version = Get-BinderUnattendedJsonStringV1 `
            -Element $migration -Name 'version' `
            -Label 'Authorization envelope.migrations entry'
          file = Get-BinderUnattendedJsonStringV1 `
            -Element $migration -Name 'file' `
            -Label 'Authorization envelope.migrations entry'
          sha256 = Get-BinderUnattendedJsonStringV1 `
            -Element $migration -Name 'sha256' `
            -Label 'Authorization envelope.migrations entry'
        }
      }
    )

    $expectedPreApplyElement = [System.Text.Json.JsonElement]::new()
    Assert-BinderUnattendedConditionV1 (
      $root.TryGetProperty(
        'expected_preapply',
        [ref]$expectedPreApplyElement
      )
    ) 'Authorization envelope is missing expected_preapply.'
    [void](Get-BinderUnattendedJsonObjectPropertiesV1 `
      -Element $expectedPreApplyElement `
      -ExpectedNames @(
        'binder_relation_collision_count',
        'binder_type_collision_count',
        'binder_function_count',
        'applied_package_migration_count',
        'binder_realtime_object_exists',
        'binder_card_event_data_exists',
        'binder_trust_report_data_exists',
        'wrapped_pulse_function_exists'
      ) `
      -Label 'Authorization envelope.expected_preapply')
    $expectedPreApply = [pscustomobject][ordered]@{
      binder_relation_collision_count =
        Get-BinderUnattendedJsonInt32V1 `
          -Element $expectedPreApplyElement `
          -Name 'binder_relation_collision_count' `
          -Label 'Authorization envelope.expected_preapply'
      binder_type_collision_count =
        Get-BinderUnattendedJsonInt32V1 `
          -Element $expectedPreApplyElement `
          -Name 'binder_type_collision_count' `
          -Label 'Authorization envelope.expected_preapply'
      binder_function_count =
        Get-BinderUnattendedJsonInt32V1 `
          -Element $expectedPreApplyElement `
          -Name 'binder_function_count' `
          -Label 'Authorization envelope.expected_preapply'
      applied_package_migration_count =
        Get-BinderUnattendedJsonInt32V1 `
          -Element $expectedPreApplyElement `
          -Name 'applied_package_migration_count' `
          -Label 'Authorization envelope.expected_preapply'
      binder_realtime_object_exists =
        Get-BinderUnattendedJsonBooleanV1 `
          -Element $expectedPreApplyElement `
          -Name 'binder_realtime_object_exists' `
          -Label 'Authorization envelope.expected_preapply'
      binder_card_event_data_exists =
        Get-BinderUnattendedJsonBooleanV1 `
          -Element $expectedPreApplyElement `
          -Name 'binder_card_event_data_exists' `
          -Label 'Authorization envelope.expected_preapply'
      binder_trust_report_data_exists =
        Get-BinderUnattendedJsonBooleanV1 `
          -Element $expectedPreApplyElement `
          -Name 'binder_trust_report_data_exists' `
          -Label 'Authorization envelope.expected_preapply'
      wrapped_pulse_function_exists =
        Get-BinderUnattendedJsonBooleanV1 `
          -Element $expectedPreApplyElement `
          -Name 'wrapped_pulse_function_exists' `
          -Label 'Authorization envelope.expected_preapply'
    }

    return [pscustomobject][ordered]@{
      schema_version = $schemaVersion
      authorization_id = $authorizationId
      issued_at_utc = $issuedAt
      not_before_utc = $notBefore
      backup_poll_deadline_utc = $backupPollDeadline
      mutation_deadline_utc = $mutationDeadline
      expires_at_utc = $expiresAt
      operator = $operator
      reviewer = $reviewer
      restore_path_reviewed = Get-BinderUnattendedJsonBooleanV1 `
        -Element $root -Name 'restore_path_reviewed' `
        -Label 'Authorization envelope'
      restore_procedure_uri = $restoreProcedureUri
      restore_procedure_sha256 = $restoreProcedureSha256
      state_root = $stateRoot
      artifact_root = $artifactRoot
      project_ref = $projectRef
      project_url = $projectUrl
      canonical_repository = $canonicalRepository
      canonical_remote_url = $canonicalRemoteUrl
      supabase_config_sha256 = $supabaseConfigSha256
      linked_project_ref_sha256 = $linkedProjectRefSha256
      linked_pooler_url_sha256 = $linkedPoolerUrlSha256
      linked_project_metadata_sha256 =
        $linkedProjectMetadataSha256
      git_executable_path = $gitExecutablePath
      git_executable_sha256 = $gitExecutableSha256
      git_version = $gitVersion
      git_exec_path = $gitExecPath
      git_https_helper_path = $gitHttpsHelperPath
      git_https_helper_sha256 = $gitHttpsHelperSha256
      git_common_config_sha256 = $gitCommonConfigSha256
      git_metadata_count = $gitMetadataCount
      git_metadata_sha256 = $gitMetadataSha256
      reviewed_main_sha = $reviewedMainSha
      package_id = $packageId
      package_fingerprint_sha256 = $packageFingerprint
      package_manifest_sha256 = $packageManifestSha256
      tracked_migration_count = $trackedMigrationCount
      tracked_migration_set_sha256 = $trackedMigrationSetSha256
      supervisor_module_sha256 = $supervisorModuleSha256
      supervisor_entrypoint_sha256 = $supervisorEntrypointSha256
      rollout_module_sha256 = $rolloutModuleSha256
      preflight_entrypoint_sha256 = $preflightEntrypointSha256
      apply_entrypoint_sha256 = $applyEntrypointSha256
      preflight_sql_sha256 = $preflightSqlSha256
      post_apply_sql_sha256 = $postApplySqlSha256
      supabase_cli_version = $supabaseCliVersion
      supabase_cli_launcher_sha256 = $supabaseCliLauncherSha256
      supabase_cli_binary_sha256 = $supabaseCliBinarySha256
      supabase_cli_shim_descriptor_sha256 =
        $supabaseCliShimDescriptorSha256
      backup_source = $backupSource
      backup_not_before_utc = $backupNotBefore
      stable_catalog_fingerprint_sha256 = $stableCatalogFingerprint
      migrations = $migrations
      apply_argv = ConvertFrom-BinderUnattendedJsonStringArrayV1 `
        -Element $root -Name 'apply_argv' -Label 'Authorization envelope'
      feature_flags_must_remain_disabled =
        ConvertFrom-BinderUnattendedJsonStringArrayV1 `
          -Element $root `
          -Name 'feature_flags_must_remain_disabled' `
          -Label 'Authorization envelope'
      excluded_from_rollout =
        ConvertFrom-BinderUnattendedJsonStringArrayV1 `
          -Element $root -Name 'excluded_from_rollout' `
          -Label 'Authorization envelope'
      expected_preapply = $expectedPreApply
      p8_excluded = Get-BinderUnattendedJsonBooleanV1 `
        -Element $root -Name 'p8_excluded' -Label 'Authorization envelope'
      activation_allowed = Get-BinderUnattendedJsonBooleanV1 `
        -Element $root -Name 'activation_allowed' `
        -Label 'Authorization envelope'
      deployment_allowed = Get-BinderUnattendedJsonBooleanV1 `
        -Element $root -Name 'deployment_allowed' `
        -Label 'Authorization envelope'
      migration_repair_allowed = Get-BinderUnattendedJsonBooleanV1 `
        -Element $root -Name 'migration_repair_allowed' `
        -Label 'Authorization envelope'
      one_attempt_only = Get-BinderUnattendedJsonBooleanV1 `
        -Element $root -Name 'one_attempt_only' `
        -Label 'Authorization envelope'
      automatic_retry_allowed = Get-BinderUnattendedJsonBooleanV1 `
        -Element $root -Name 'automatic_retry_allowed' `
        -Label 'Authorization envelope'
    }
  } catch {
    if ($_.Exception.Data.Contains('BinderSupervisorExitClass')) {
      throw
    }
    Stop-BinderUnattendedV1 `
      -ExitClass 'local_integrity_stop' `
      -Message "Authorization JSON is invalid: $($_.Exception.Message)"
  } finally {
    if ($null -ne $document) {
      $document.Dispose()
    }
  }
}

function ConvertFrom-BinderUnattendedAuthorizationBytesV1 {
  param(
    [Parameter(Mandatory = $true)]
    [byte[]]$Bytes
  )

  Assert-BinderUnattendedConditionV1 (
    $Bytes.Length -gt 0 -and $Bytes.Length -le 65536
  ) 'Authorization envelope byte length is invalid.'
  Assert-BinderUnattendedConditionV1 (
    -not (
      $Bytes.Length -ge 3 -and
      $Bytes[0] -eq 0xef -and
      $Bytes[1] -eq 0xbb -and
      $Bytes[2] -eq 0xbf
    )
  ) 'Authorization envelope must be UTF-8 without BOM.'
  foreach ($value in $Bytes) {
    Assert-BinderUnattendedConditionV1 (
      $value -ge 0x20 -or $value -eq 0x0a
    ) 'Authorization envelope contains a forbidden control byte.'
  }
  try {
    $utf8 = [System.Text.UTF8Encoding]::new($false, $true)
    $json = $utf8.GetString($Bytes)
  } catch {
    Stop-BinderUnattendedV1 `
      -ExitClass 'local_integrity_stop' `
      -Message 'Authorization envelope is not strict UTF-8.'
  }
  $parsed = ConvertFrom-BinderUnattendedAuthorizationJsonV1 -Json $json

  $document = $null
  $writer = $null
  $memory = $null
  try {
    $document = [System.Text.Json.JsonDocument]::Parse($json)
    $memory = [System.IO.MemoryStream]::new()
    $writerOptions = [System.Text.Json.JsonWriterOptions]::new()
    $writerOptions.Indented = $false
    $writerOptions.SkipValidation = $false
    $writer = [System.Text.Json.Utf8JsonWriter]::new(
      $memory,
      $writerOptions
    )
    $document.RootElement.WriteTo($writer)
    $writer.Flush()
    $canonicalBytes = $memory.ToArray()
    $sameBytes = $Bytes.Length -eq $canonicalBytes.Length
    if ($sameBytes) {
      for ($index = 0; $index -lt $Bytes.Length; $index += 1) {
        if ($Bytes[$index] -ne $canonicalBytes[$index]) {
          $sameBytes = $false
          break
        }
      }
    }
    Assert-BinderUnattendedConditionV1 $sameBytes (
      'Authorization envelope must be the exact compact canonical UTF-8 ' +
      'encoding with ordered V1 fields, no BOM, and no trailing newline.'
    )
  } finally {
    if ($null -ne $writer) {
      $writer.Dispose()
    }
    if ($null -ne $memory) {
      $memory.Dispose()
    }
    if ($null -ne $document) {
      $document.Dispose()
    }
  }
  return $parsed
}

function Assert-BinderUnattendedLocalPathV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$Label,

    [ValidateSet('Any', 'Leaf', 'Container')]
    [string]$RequiredType = 'Any',

    [bool]$MustExist = $true
  )

  Assert-BinderUnattendedConditionV1 (
    [System.IO.Path]::IsPathFullyQualified($Path)
  ) "$Label must be an absolute path."
  Assert-BinderUnattendedConditionV1 (
    $Path -cmatch '^[A-Z]:\\' -and
    -not $Path.StartsWith('\\') -and
    -not $Path.StartsWith('\\?\') -and
    -not $Path.StartsWith('\\.\')
  ) "$Label must be a canonical local drive path."
  $drive = [System.IO.DriveInfo]::new($Path.Substring(0, 3))
  Assert-BinderUnattendedConditionV1 (
    $drive.IsReady -and
    $drive.DriveType -eq [System.IO.DriveType]::Fixed -and
    $drive.DriveFormat -ceq 'NTFS'
  ) "$Label must be on a ready fixed local NTFS volume."
  Initialize-BinderUnattendedNativeV1
  $deviceTarget = [GrookaiBinderUnattendedNativeV1]::GetDosDeviceTarget(
    $Path.Substring(0, 2)
  )
  Assert-BinderUnattendedConditionV1 (
    $deviceTarget.StartsWith(
      '\Device\HarddiskVolume',
      [System.StringComparison]::Ordinal
    )
  ) "$Label must not use a SUBST, mapped, or redirected drive."
  Assert-BinderUnattendedConditionV1 (
    $Path.IndexOf(':', 2) -lt 0
  ) "$Label must not contain an alternate data stream."
  Assert-BinderUnattendedConditionV1 (
    $Path -ceq $Path.Trim() -and
    -not [regex]::IsMatch($Path, '[\x00-\x1f\x7f]')
  ) "$Label contains forbidden whitespace or control characters."
  foreach ($segment in @($Path.Substring(3) -split '\\')) {
    if ([string]::IsNullOrEmpty($segment)) {
      continue
    }
    Assert-BinderUnattendedConditionV1 (
      -not $segment.EndsWith(
        '.',
        [System.StringComparison]::Ordinal
      ) -and
      -not $segment.EndsWith(
        ' ',
        [System.StringComparison]::Ordinal
      ) -and
      -not (
        [System.IO.Path]::GetFileNameWithoutExtension($segment) -match
          '^(?i:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$'
      )
    ) "$Label contains a Windows alias or reserved path segment."
  }
  $fullPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
  Assert-BinderUnattendedConditionV1 (
    $fullPath -ceq $Path.TrimEnd('\')
  ) "$Label must already be canonical and must not contain dot segments."

  if ($MustExist) {
    Assert-BinderUnattendedConditionV1 (
      Test-Path -LiteralPath $fullPath
    ) "$Label does not exist."
    if ($RequiredType -ceq 'Leaf') {
      Assert-BinderUnattendedConditionV1 (
        Test-Path -LiteralPath $fullPath -PathType Leaf
      ) "$Label must be a regular file."
    } elseif ($RequiredType -ceq 'Container') {
      Assert-BinderUnattendedConditionV1 (
        Test-Path -LiteralPath $fullPath -PathType Container
      ) "$Label must be a directory."
    }
  } else {
    Assert-BinderUnattendedConditionV1 (
      -not (Test-Path -LiteralPath $fullPath)
    ) "$Label must not already exist."
  }

  $cursor = if (Test-Path -LiteralPath $fullPath) {
    $fullPath
  } else {
    Split-Path -Parent $fullPath
  }
  while ($cursor -and -not (Test-Path -LiteralPath $cursor)) {
    $parent = Split-Path -Parent $cursor
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -ceq $cursor) {
      break
    }
    $cursor = $parent
  }
  $existingAncestor = $cursor
  while ($cursor -and (Test-Path -LiteralPath $cursor)) {
    $item = Get-Item -LiteralPath $cursor -Force
    Assert-BinderUnattendedConditionV1 (
      -not $item.Attributes.HasFlag(
        [System.IO.FileAttributes]::ReparsePoint
      )
    ) "$Label path contains a reparse point: $cursor"
    $parent = Split-Path -Parent $cursor
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -ceq $cursor) {
      break
    }
    $cursor = $parent
  }

  if ($existingAncestor) {
    $finalExistingAncestor =
      Get-BinderUnattendedFinalPathV1 -Path $existingAncestor
    Assert-BinderUnattendedConditionV1 (
      $finalExistingAncestor.Equals(
        [System.IO.Path]::GetFullPath($existingAncestor).TrimEnd('\'),
        [System.StringComparison]::OrdinalIgnoreCase
      )
    ) "$Label resolves through a non-canonical path alias."
  }
  if ($MustExist) {
    $finalPath = Get-BinderUnattendedFinalPathV1 -Path $fullPath
    Assert-BinderUnattendedConditionV1 (
      $finalPath.Equals(
        $fullPath,
        [System.StringComparison]::OrdinalIgnoreCase
      )
    ) "$Label final path differs from its authorized path."
  }

  if ($MustExist -and $RequiredType -ceq 'Leaf') {
    $item = Get-Item -LiteralPath $fullPath -Force
    Assert-BinderUnattendedConditionV1 (
      -not $item.Attributes.HasFlag(
        [System.IO.FileAttributes]::Directory
      )
    ) "$Label must be a regular file."
  }
  return $fullPath
}

function Assert-BinderUnattendedOutsideRepositoryV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $fullPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
  $repo = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\')
  Assert-BinderUnattendedConditionV1 (
    -not (
      $fullPath.Equals(
        $repo,
        [System.StringComparison]::OrdinalIgnoreCase
      ) -or
      $fullPath.StartsWith(
        "$repo\",
        [System.StringComparison]::OrdinalIgnoreCase
      )
    )
  ) "$Label must be outside the repository."
}

function Get-BinderUnattendedFileBytesFromStreamV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.IO.FileStream]$Stream,
    [int]$MaximumBytes = 65536
  )

  Assert-BinderUnattendedConditionV1 (
    $Stream.Length -gt 0 -and $Stream.Length -le $MaximumBytes
  ) 'Sealed file length is invalid.'
  $Stream.Position = 0
  $bytes = [byte[]]::new([int]$Stream.Length)
  $offset = 0
  while ($offset -lt $bytes.Length) {
    $read = $Stream.Read($bytes, $offset, $bytes.Length - $offset)
    Assert-BinderUnattendedConditionV1 (
      $read -gt 0
    ) 'Sealed file ended before its recorded length.'
    $offset += $read
  }
  $Stream.Position = 0
  return $bytes
}

function Open-BinderUnattendedAuthorizationV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AuthorizationPath,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedAuthorizationSha256,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  Assert-BinderUnattendedConditionV1 (
    $ExpectedAuthorizationSha256 -cmatch '^[0-9a-f]{64}$'
  ) 'ExpectedAuthorizationSha256 must be an independently supplied lowercase SHA-256.'
  $path = Assert-BinderUnattendedLocalPathV1 `
    -Path $AuthorizationPath `
    -Label 'AuthorizationPath' `
    -RequiredType Leaf
  [void](Assert-BinderUnattendedOutsideRepositoryV1 `
    -Path $path -RepoRoot $RepoRoot -Label 'AuthorizationPath')
  $stream = $null
  try {
    $stream = [System.IO.File]::Open(
      $path,
      [System.IO.FileMode]::Open,
      [System.IO.FileAccess]::Read,
      [System.IO.FileShare]::Read
    )
    $bytes = Get-BinderUnattendedFileBytesFromStreamV1 -Stream $stream
    $actualSha256 = Get-BinderUnattendedSha256BytesV1 -Bytes $bytes
    Assert-BinderUnattendedConditionV1 (
      $actualSha256 -ceq $ExpectedAuthorizationSha256
    ) 'Authorization envelope bytes do not match the caller-supplied SHA-256.'
    $authorization =
      ConvertFrom-BinderUnattendedAuthorizationBytesV1 -Bytes $bytes
    return [pscustomobject][ordered]@{
      Path = $path
      Sha256 = $actualSha256
      Data = $authorization
      Stream = $stream
    }
  } catch {
    if ($null -ne $stream) {
      $stream.Dispose()
    }
    throw
  }
}

function Read-BinderUnattendedAuthorizationV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$AuthorizationPath,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedAuthorizationSha256,

    [string]$RepoRoot = (Get-BinderUnattendedRepoRootV1)
  )

  $opened = Open-BinderUnattendedAuthorizationV1 `
    -AuthorizationPath $AuthorizationPath `
    -ExpectedAuthorizationSha256 $ExpectedAuthorizationSha256 `
    -RepoRoot $RepoRoot
  try {
    return [pscustomobject][ordered]@{
      Path = $opened.Path
      Sha256 = $opened.Sha256
      Data = $opened.Data
    }
  } finally {
    $opened.Stream.Dispose()
  }
}

function Assert-BinderUnattendedArrayEqualV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object[]]$Actual,
    [Parameter(Mandatory = $true)]
    [object[]]$Expected,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  Assert-BinderUnattendedConditionV1 (
    @($Actual).Count -eq @($Expected).Count
  ) "$Label does not match the reviewed element count."
  for ($index = 0; $index -lt @($Expected).Count; $index += 1) {
    $actualRaw = @($Actual)[$index]
    Assert-BinderUnattendedConditionV1 (
      $actualRaw -is [string]
    ) "$Label must contain JSON strings at position $index."
    $actualValue = [string]$actualRaw
    Assert-BinderUnattendedConditionV1 (
      -not [regex]::IsMatch($actualValue, '[\x00-\x1f\x7f]')
    ) "$Label contains a control character at position $index."
    Assert-BinderUnattendedConditionV1 (
      $actualValue -ceq [string]@($Expected)[$index]
    ) "$Label does not match the reviewed value at position $index."
  }
}

function Test-BinderUnattendedAuthorizationV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [object]$Authorization,

    [datetimeoffset]$NowUtc = [datetimeoffset]::UtcNow
  )

  $policy = Get-BinderUnattendedPolicyV1
  Assert-BinderUnattendedConditionV1 (
    $Authorization.schema_version -eq $policy.SchemaVersion
  ) 'Authorization schema version mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.project_ref -ceq $policy.ProjectRef
  ) 'Authorization project ref mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.project_url -ceq $policy.ProjectUrl
  ) 'Authorization project URL mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.canonical_repository -ceq
      $policy.CanonicalRepository
  ) 'Authorization canonical repository mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.canonical_remote_url -ceq
      $policy.CanonicalRemoteUrl
  ) 'Authorization canonical remote URL mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.supabase_config_sha256 -ceq
      $policy.SupabaseConfigSha256 -and
    $Authorization.linked_project_ref_sha256 -ceq
      $policy.LinkedProjectRefSha256 -and
    $Authorization.linked_pooler_url_sha256 -ceq
      $policy.LinkedPoolerUrlSha256 -and
    $Authorization.linked_project_metadata_sha256 -ceq
      $policy.LinkedProjectMetadataSha256
  ) 'Authorization Supabase source/link identity mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.git_executable_path -ceq
      $policy.GitExecutablePath -and
    $Authorization.git_executable_sha256 -ceq
      $policy.GitExecutableSha256 -and
    $Authorization.git_version -ceq $policy.GitVersion -and
    $Authorization.git_exec_path -ceq $policy.GitExecPath -and
    $Authorization.git_https_helper_path -ceq
      $policy.GitHttpsHelperPath -and
    $Authorization.git_https_helper_sha256 -ceq
      $policy.GitHttpsHelperSha256
  ) 'Authorization Git executable identity mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.git_common_config_sha256 -cmatch
      '^[0-9a-f]{64}$' -and
    $Authorization.git_metadata_count -gt 0 -and
    $Authorization.git_metadata_sha256 -cmatch '^[0-9a-f]{64}$'
  ) 'Authorization Git config/metadata identity is invalid.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.package_id -ceq $policy.PackageId
  ) 'Authorization package ID mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.package_fingerprint_sha256 -ceq
      $policy.PackageFingerprintSha256
  ) 'Authorization package fingerprint mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.package_manifest_sha256 -ceq
      $policy.PackageManifestSha256
  ) 'Authorization package-manifest hash mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.tracked_migration_count -eq
      $policy.TrackedMigrationCount -and
    $Authorization.tracked_migration_set_sha256 -ceq
      $policy.TrackedMigrationSetSha256
  ) 'Authorization tracked migration-set identity mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.preflight_sql_sha256 -ceq
      $policy.PreflightSqlSha256
  ) 'Authorization preflight SQL hash mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.post_apply_sql_sha256 -ceq
      $policy.PostApplySqlSha256
  ) 'Authorization post-apply SQL hash mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.supabase_cli_version -ceq
      $policy.SupportedSupabaseCliVersion
  ) 'Authorization Supabase CLI version mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.supabase_cli_launcher_sha256 -ceq
      $policy.SupabaseCliLauncherSha256
  ) 'Authorization Supabase CLI launcher hash mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.supabase_cli_binary_sha256 -ceq
      $policy.SupabaseCliBinarySha256
  ) 'Authorization Supabase CLI binary hash mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.supabase_cli_shim_descriptor_sha256 -ceq
      $policy.SupabaseCliShimDescriptorSha256
  ) 'Authorization Supabase CLI shim hash mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.stable_catalog_fingerprint_sha256 -ceq
      $policy.StableCatalogFingerprintSha256
  ) 'Authorization stable catalog fingerprint mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.backup_source -ceq 'supabase_cli_physical_backups_v1'
  ) 'Authorization permits only the pinned Supabase physical-backup listing.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.backup_not_before_utc -ceq
      $policy.BackupNotBeforeUtc
  ) 'Authorization backup floor differs from the reviewed completed backup.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.restore_path_reviewed -eq $true
  ) 'Authorization does not attest that the restore path was reviewed.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.restore_procedure_uri -ceq
      $policy.RestoreProcedureUri
  ) 'Authorization restore procedure URI mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $Authorization.p8_excluded -eq $true -and
    $Authorization.activation_allowed -eq $false -and
    $Authorization.deployment_allowed -eq $false -and
    $Authorization.migration_repair_allowed -eq $false -and
    $Authorization.one_attempt_only -eq $true -and
    $Authorization.automatic_retry_allowed -eq $false
  ) 'Authorization expands the reviewed no-P8/no-activation/no-retry boundary.'
  Assert-BinderUnattendedArrayEqualV1 `
    -Actual @($Authorization.apply_argv) `
    -Expected @($policy.ApplyArguments) `
    -Label 'Authorization apply argv'
  Assert-BinderUnattendedArrayEqualV1 `
    -Actual @($Authorization.feature_flags_must_remain_disabled) `
    -Expected @($policy.FeatureFlags) `
    -Label 'Authorization disabled flags'
  Assert-BinderUnattendedArrayEqualV1 `
    -Actual @($Authorization.excluded_from_rollout) `
    -Expected @($policy.ExcludedFlags) `
    -Label 'Authorization excluded flags'

  Assert-BinderUnattendedConditionV1 (
    @($Authorization.migrations).Count -eq @($policy.Migrations).Count
  ) 'Authorization must contain exactly five migrations.'
  for ($index = 0; $index -lt @($policy.Migrations).Count; $index += 1) {
    $actual = @($Authorization.migrations)[$index]
    $expected = @($policy.Migrations)[$index]
    Assert-BinderUnattendedConditionV1 (
      $actual.version -ceq $expected.version -and
      $actual.file -ceq $expected.file -and
      $actual.sha256 -ceq $expected.sha256
    ) "Authorization migration mismatch at position $index."
  }
  foreach ($property in $policy.ExpectedPreApply.PSObject.Properties) {
    Assert-BinderUnattendedConditionV1 (
      $Authorization.expected_preapply.($property.Name) -eq
        $property.Value
    ) "Authorization expected_preapply.$($property.Name) mismatch."
  }

  Assert-BinderUnattendedConditionV1 (
    $Authorization.state_root -ceq $policy.StateRoot
  ) 'Authorization state root is not the fixed package/project state root.'
  $expectedArtifactRoot = Join-Path (
    $policy.ArtifactNamespaceRoot
  ) $Authorization.authorization_id
  Assert-BinderUnattendedConditionV1 (
    $Authorization.artifact_root -ceq $expectedArtifactRoot
  ) 'Authorization artifact root is not its exact fixed-namespace run root.'

  $issued = ConvertTo-BinderUnattendedUtcV1 `
    -Value $Authorization.issued_at_utc -Label 'Authorization issued time'
  $notBefore = ConvertTo-BinderUnattendedUtcV1 `
    -Value $Authorization.not_before_utc `
    -Label 'Authorization not-before time'
  $pollDeadline = ConvertTo-BinderUnattendedUtcV1 `
    -Value $Authorization.backup_poll_deadline_utc `
    -Label 'Authorization backup-poll deadline'
  foreach ($criticalDeadline in @(
    [string]$Authorization.mutation_deadline_utc,
    [string]$Authorization.expires_at_utc
  )) {
    Assert-BinderUnattendedConditionV1 (
      $criticalDeadline -cmatch
        '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$'
    ) 'Mutation deadline and authorization expiry must be exact UTC Z timestamps.'
  }
  $mutationDeadline = ConvertTo-BinderUnattendedUtcV1 `
    -Value $Authorization.mutation_deadline_utc `
    -Label 'Authorization mutation deadline'
  $expires = ConvertTo-BinderUnattendedUtcV1 `
    -Value $Authorization.expires_at_utc `
    -Label 'Authorization expiry time'
  $backupFloor = ConvertTo-BinderUnattendedUtcV1 `
    -Value $Authorization.backup_not_before_utc `
    -Label 'Authorization backup floor'
  Assert-BinderUnattendedConditionV1 (
    $issued -le $notBefore -and
    $notBefore -lt $pollDeadline -and
    $pollDeadline -le $mutationDeadline -and
    $mutationDeadline -le $expires
  ) 'Authorization time bounds are inconsistent.'
  Assert-BinderUnattendedConditionV1 (
    $expires -le $issued.AddHours($policy.AuthorizationMaximumHours)
  ) 'Authorization validity exceeds the fixed maximum.'
  Assert-BinderUnattendedConditionV1 (
    $backupFloor -lt $notBefore -and
    $backupFloor -lt $pollDeadline
  ) 'Authorization backup floor is outside the reviewed time window.'
  Assert-BinderUnattendedConditionV1 (
    $issued -le $NowUtc.AddMinutes(5) -and
    $NowUtc -ge $notBefore -and
    $NowUtc -lt $expires
  ) 'Authorization is not currently valid.'

  return [pscustomobject][ordered]@{
    Status = 'pass'
    IssuedAtUtc = $issued
    NotBeforeUtc = $notBefore
    BackupPollDeadlineUtc = $pollDeadline
    MutationDeadlineUtc = $mutationDeadline
    ExpiresAtUtc = $expires
    BackupNotBeforeUtc = $backupFloor
  }
}

function Test-BinderUnattendedBundleV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [object]$Authorization,

    [string]$RepoRoot = (Get-BinderUnattendedRepoRootV1)
  )

  $policy = Get-BinderUnattendedPolicyV1
  $paths = [ordered]@{
    supervisor_module_sha256 =
      $policy.SupervisorModuleRelativePath
    supervisor_entrypoint_sha256 =
      $policy.SupervisorEntrypointRelativePath
    rollout_module_sha256 =
      $policy.RolloutModuleRelativePath
    preflight_entrypoint_sha256 =
      $policy.PreflightEntrypointRelativePath
    apply_entrypoint_sha256 =
      $policy.ApplyEntrypointRelativePath
    package_manifest_sha256 =
      $policy.PackageManifestRelativePath
    preflight_sql_sha256 =
      $policy.PreflightSqlRelativePath
    post_apply_sql_sha256 =
      $policy.PostApplySqlRelativePath
    restore_procedure_sha256 =
      $policy.RestoreProcedureRelativePath
    supabase_config_sha256 =
      'supabase/config.toml'
    linked_project_ref_sha256 =
      'supabase/.temp/project-ref'
    linked_pooler_url_sha256 =
      'supabase/.temp/pooler-url'
    linked_project_metadata_sha256 =
      'supabase/.temp/linked-project.json'
  }
  $hashes = [ordered]@{}
  foreach ($entry in $paths.GetEnumerator()) {
    $path = [System.IO.Path]::GetFullPath(
      (Join-Path $RepoRoot $entry.Value)
    )
    Assert-BinderUnattendedConditionV1 (
      Test-Path -LiteralPath $path -PathType Leaf
    ) "Reviewed source file is missing: $($entry.Value)"
    $item = Get-Item -LiteralPath $path -Force
    Assert-BinderUnattendedConditionV1 (
      -not $item.Attributes.HasFlag(
        [System.IO.FileAttributes]::ReparsePoint
      )
    ) "Reviewed source file is a reparse point: $($entry.Value)"
    $actual = Get-BinderUnattendedSha256FileV1 -Path $path
    Assert-BinderUnattendedConditionV1 (
      $actual -ceq [string]$Authorization.($entry.Key)
    ) "Reviewed source hash mismatch: $($entry.Value)"
    $hashes[$entry.Key] = $actual
  }
  Assert-BinderUnattendedConditionV1 (
    $hashes.package_manifest_sha256 -ceq
      $policy.PackageManifestSha256
  ) 'Package manifest bytes do not match the fixed rollout policy.'
  Assert-BinderUnattendedConditionV1 (
    $hashes.preflight_sql_sha256 -ceq $policy.PreflightSqlSha256
  ) 'Preflight SQL bytes do not match the fixed rollout policy.'
  Assert-BinderUnattendedConditionV1 (
    $hashes.post_apply_sql_sha256 -ceq $policy.PostApplySqlSha256
  ) 'Post-apply SQL bytes do not match the fixed rollout policy.'
  foreach ($entry in @(
    @(
      $policy.GitExecutablePath,
      $Authorization.git_executable_path,
      $Authorization.git_executable_sha256,
      'Git executable'
    ),
    @(
      $policy.GitHttpsHelperPath,
      $Authorization.git_https_helper_path,
      $Authorization.git_https_helper_sha256,
      'Git HTTPS helper'
    )
  )) {
    $expectedPath = [string]$entry[0]
    $authorizedPath = [string]$entry[1]
    Assert-BinderUnattendedConditionV1 (
      $authorizedPath -ceq $expectedPath
    ) "$($entry[3]) authorization path mismatch."
    [void](Assert-BinderUnattendedLocalPathV1 `
      -Path $authorizedPath `
      -Label ([string]$entry[3]) `
      -RequiredType Leaf)
    Assert-BinderUnattendedConditionV1 (
      (Get-BinderUnattendedSha256FileV1 -Path $authorizedPath) -ceq
        [string]$entry[2]
    ) "$($entry[3]) hash mismatch."
  }

  return [pscustomobject][ordered]@{
    Status = 'pass'
    Hashes = [pscustomobject]$hashes
  }
}

function Get-BinderUnattendedSha256StringV1 {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Value
  )

  return Get-BinderUnattendedSha256BytesV1 -Bytes (
    [System.Text.Encoding]::UTF8.GetBytes($Value)
  )
}

function Assert-BinderUnattendedJsonAllowedPropertiesV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Text.Json.JsonElement]$Element,
    [Parameter(Mandatory = $true)]
    [AllowEmptyCollection()]
    [string[]]$RequiredNames,
    [Parameter(Mandatory = $true)]
    [string[]]$AllowedNames,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  Assert-BinderUnattendedConditionV1 (
    $Element.ValueKind -eq [System.Text.Json.JsonValueKind]::Object
  ) "$Label must be a JSON object."
  $seen = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
  )
  $caseFolded = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
  )
  foreach ($property in $Element.EnumerateObject()) {
    Assert-BinderUnattendedConditionV1 (
      $seen.Add($property.Name) -and
      $caseFolded.Add($property.Name)
    ) "$Label contains a duplicate or case-colliding field."
    Assert-BinderUnattendedConditionV1 (
      $AllowedNames -ccontains $property.Name
    ) "$Label contains an unexpected field: $($property.Name)"
  }
  foreach ($required in $RequiredNames) {
    Assert-BinderUnattendedConditionV1 (
      $seen.Contains($required)
    ) "$Label is missing $required."
  }
}

function Read-BinderBackupConfirmationV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Json,

    [Parameter(Mandatory = $true)]
    [string]$ProjectRef,

    [Parameter(Mandatory = $true)]
    [string]$BackupNotBeforeUtc,

    [datetimeoffset]$NowUtc = [datetimeoffset]::UtcNow
  )

  $policy = Get-BinderUnattendedPolicyV1
  Assert-BinderUnattendedConditionV1 (
    $ProjectRef -ceq $policy.ProjectRef
  ) 'Backup confirmation project mismatch.'
  $backupFloor = ConvertTo-BinderUnattendedUtcV1 `
    -Value $BackupNotBeforeUtc -Label 'Backup confirmation floor'
  $document = $null
  try {
    $options = [System.Text.Json.JsonDocumentOptions]::new()
    $options.AllowTrailingCommas = $false
    $options.CommentHandling =
      [System.Text.Json.JsonCommentHandling]::Disallow
    $options.MaxDepth = 12
    $document = [System.Text.Json.JsonDocument]::Parse($Json, $options)
    $root = $document.RootElement
    Assert-BinderUnattendedJsonAllowedPropertiesV1 `
      -Element $root `
      -RequiredNames @(
        'backups',
        'physical_backup_data',
        'pitr_enabled',
        'region',
        'walg_enabled'
      ) `
      -AllowedNames @(
        'backups',
        'physical_backup_data',
        'pitr_enabled',
        'region',
        'walg_enabled'
      ) `
      -Label 'Supabase physical-backup response'

    $region = Get-BinderUnattendedJsonStringV1 `
      -Element $root -Name 'region' `
      -Label 'Supabase physical-backup response'
    Assert-BinderUnattendedScalarStringV1 `
      -Value $region -Label 'Supabase physical-backup response.region' `
      -MaximumLength 64
    $pitrEnabled = Get-BinderUnattendedJsonBooleanV1 `
      -Element $root -Name 'pitr_enabled' `
      -Label 'Supabase physical-backup response'
    $walgEnabled = Get-BinderUnattendedJsonBooleanV1 `
      -Element $root -Name 'walg_enabled' `
      -Label 'Supabase physical-backup response'
    Assert-BinderUnattendedConditionV1 (
      $region -ceq $policy.BackupExpectedRegion -and
      $pitrEnabled -eq $policy.BackupExpectedPitrEnabled -and
      $walgEnabled -eq $policy.BackupExpectedWalgEnabled
    ) 'Supabase backup mode or region changed from the reviewed platform state.'

    $physicalData = [System.Text.Json.JsonElement]::new()
    Assert-BinderUnattendedConditionV1 (
      $root.TryGetProperty(
        'physical_backup_data',
        [ref]$physicalData
      )
    ) 'Supabase physical-backup response is missing physical_backup_data.'
    Assert-BinderUnattendedJsonAllowedPropertiesV1 `
      -Element $physicalData `
      -RequiredNames @() `
      -AllowedNames @(
        'earliest_physical_backup_date_unix',
        'latest_physical_backup_date_unix'
      ) `
      -Label 'Supabase physical-backup response.physical_backup_data'
    Assert-BinderUnattendedConditionV1 (
      @($physicalData.EnumerateObject()).Count -eq 0
    ) 'Supabase physical_backup_data changed from the reviewed empty daily-backup mode.'
    foreach ($name in @(
      'earliest_physical_backup_date_unix',
      'latest_physical_backup_date_unix'
    )) {
      $value = [System.Text.Json.JsonElement]::new()
      if ($physicalData.TryGetProperty($name, [ref]$value)) {
        $parsedUnix = 0L
        Assert-BinderUnattendedConditionV1 (
          $value.ValueKind -eq [System.Text.Json.JsonValueKind]::Null -or
          (
            $value.ValueKind -eq
              [System.Text.Json.JsonValueKind]::Number -and
            $value.TryGetInt64([ref]$parsedUnix)
          )
        ) "physical_backup_data.$name has an invalid type."
      }
    }

    $backups = [System.Text.Json.JsonElement]::new()
    Assert-BinderUnattendedConditionV1 (
      $root.TryGetProperty('backups', [ref]$backups) -and
      $backups.ValueKind -eq [System.Text.Json.JsonValueKind]::Array
    ) 'Supabase physical-backup response.backups must be an array.'
    $allRows = [System.Collections.Generic.List[object]]::new()
    $eligible = [System.Collections.Generic.List[object]]::new()
    $staleNewerRows = [System.Collections.Generic.List[object]]::new()
    foreach ($backup in $backups.EnumerateArray()) {
      Assert-BinderUnattendedJsonAllowedPropertiesV1 `
        -Element $backup `
        -RequiredNames @('inserted_at', 'is_physical_backup', 'status') `
        -AllowedNames @('inserted_at', 'is_physical_backup', 'status') `
        -Label 'Supabase physical-backup response.backups entry'
      $insertedAtText = Get-BinderUnattendedJsonStringV1 `
        -Element $backup -Name 'inserted_at' `
        -Label 'Supabase physical-backup response.backups entry'
      $insertedAt = ConvertTo-BinderUnattendedUtcV1 `
        -Value $insertedAtText -Label 'Physical backup inserted_at'
      $isPhysical = Get-BinderUnattendedJsonBooleanV1 `
        -Element $backup -Name 'is_physical_backup' `
        -Label 'Supabase physical-backup response.backups entry'
      $status = Get-BinderUnattendedJsonStringV1 `
        -Element $backup -Name 'status' `
        -Label 'Supabase physical-backup response.backups entry'
      Assert-BinderUnattendedScalarStringV1 `
        -Value $status -Label 'Physical backup status' -MaximumLength 32
      $row = [pscustomobject][ordered]@{
        inserted_at_utc = $insertedAt.ToString('o')
        is_physical_backup = $isPhysical
        status = $status
      }
      $allRows.Add($row)
      if (
        $isPhysical -eq $true -and
        $status -ceq 'COMPLETED' -and
        $insertedAt -gt $backupFloor
      ) {
        if ($insertedAt -gt $NowUtc) {
          Stop-BinderUnattendedV1 `
            -ExitClass 'safe_stop_pre_mutation' `
            -Message (
              'A completed physical backup newer than the signed floor ' +
              'has a future timestamp.'
            )
        }
        if (
          $insertedAt -lt
            $NowUtc.AddMinutes(-$policy.BackupMaximumAgeMinutes)
        ) {
          $staleNewerRows.Add($row)
        } else {
          $eligible.Add($row)
        }
      }
    }

    $fingerprintLines = [System.Collections.Generic.List[string]]::new()
    $fingerprintLines.Add("project_ref=$ProjectRef")
    $fingerprintLines.Add("region=$region")
    $fingerprintLines.Add("pitr_enabled=$($pitrEnabled.ToString().ToLowerInvariant())")
    $fingerprintLines.Add("walg_enabled=$($walgEnabled.ToString().ToLowerInvariant())")
    $fingerprintLines.Add(
      "physical_backup_data=$($physicalData.GetRawText())"
    )
    foreach ($row in $allRows) {
      $fingerprintLines.Add(
        'backup=' +
        $row.inserted_at_utc + '|' +
        $row.is_physical_backup.ToString().ToLowerInvariant() + '|' +
        $row.status
      )
    }
    $fingerprint = Get-BinderUnattendedSha256StringV1 `
      -Value ($fingerprintLines -join "`n")

    if ($eligible.Count -gt 1) {
      Stop-BinderUnattendedV1 `
        -ExitClass 'safe_stop_pre_mutation' `
        -Message (
          'More than one eligible completed physical backup exists; ' +
          'selection is ambiguous.'
        )
    }
    if ($eligible.Count -eq 0) {
      if ($staleNewerRows.Count -gt 0) {
        Stop-BinderUnattendedV1 `
          -ExitClass 'safe_stop_pre_mutation' `
          -Message (
            'A completed physical backup newer than the signed floor ' +
            'is already outside the five-minute freshness window.'
          )
      }
      return [pscustomobject][ordered]@{
        Status = 'wait'
        ProjectRef = $ProjectRef
        EligibleCount = $eligible.Count
        ResponseFingerprintSha256 = $fingerprint
      }
    }
    return [pscustomobject][ordered]@{
      Status = 'candidate'
      ProjectRef = $ProjectRef
      EligibleCount = 1
      InsertedAtUtc = $eligible[0].inserted_at_utc
      BackupKey = (
        "$ProjectRef|$($eligible[0].inserted_at_utc)|PHYSICAL|COMPLETED"
      )
      ResponseFingerprintSha256 = $fingerprint
      Region = $region
    }
  } catch {
    if ($_.Exception.Data.Contains('BinderSupervisorExitClass')) {
      throw
    }
    Stop-BinderUnattendedV1 `
      -ExitClass 'local_integrity_stop' `
      -Message "Supabase physical-backup JSON is invalid: $($_.Exception.Message)"
  } finally {
    if ($null -ne $document) {
      $document.Dispose()
    }
  }
}

function Test-BinderRoutingEnvironmentNameForSupervisorV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  return [regex]::IsMatch(
    $Name,
    (
      '^(?:' +
      'PG.*|' +
      'DB_URL|' +
      'DATABASE_(?:URL|URI)|' +
      'PRISMA_DATABASE_URL|' +
      'DIRECT_URL|' +
      'SHADOW_DATABASE_URL|' +
      'POSTGRES(?:QL)?_URL.*|' +
      'SUPABASE_DB_.*|' +
      'SUPABASE_API_(?:HOST|URL)|' +
      'SUPABASE_INTERNAL_.*|' +
      'SUPABASE_PROJECT_(?:ID|REF)|' +
      'SUPABASE_CA_SKIP_VERIFY|' +
      'SUPABASE_PROFILE|' +
      'SUPABASE_WORKDIR|' +
      'SUPABASE_CONFIG_DIR|' +
      'SUPABASE_.*|' +
      'XDG_CONFIG_HOME|' +
      'GIT_.*|' +
      'GCM_.*|' +
      'MSYS.*|CYGWIN.*|CHERE_INVOKING|BASH_ENV|ENV|' +
      'NODE_OPTIONS|' +
      'PSMODULEPATH|' +
      'POWERSHELL_DISTRIBUTION_CHANNEL|' +
      'PSExecutionPolicyPreference|' +
      'HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY|' +
      'SSL_CERT_FILE|SSL_CERT_DIR|SSLKEYLOGFILE|CURL_CA_BUNDLE|' +
      'REQUESTS_CA_BUNDLE|NODE_EXTRA_CA_CERTS|' +
      'GODEBUG|GOTRACEBACK|GOCOVERDIR|GRPC_.*|' +
      'DOTNET_.*|' +
      'CORECLR_.*|' +
      'COR_.*|' +
      'COMPLUS_.*' +
      '|GROOKAI_BINDER_PROD_.*|' +
      '(?:.*_)?(?:SECRET|PASSWORD|TOKEN|KEY)(?:_.*)?|' +
      'GH_.*|GITHUB_.*|AWS_.*|AZURE_.*|GOOGLE_.*|GCP_.*' +
      ')$'
    ),
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
}

function Enter-BinderUnattendedSanitizedEnvironmentV1 {
  $policy = Get-BinderUnattendedPolicyV1
  $accessToken = [Environment]::GetEnvironmentVariable(
    'SUPABASE_ACCESS_TOKEN',
    [EnvironmentVariableTarget]::Process
  )
  $projectUrl = [Environment]::GetEnvironmentVariable(
    'SUPABASE_URL',
    [EnvironmentVariableTarget]::Process
  )
  Assert-BinderUnattendedConditionV1 (
    -not [string]::IsNullOrWhiteSpace($accessToken) -and
    -not [regex]::IsMatch($accessToken, '[\x00-\x1f\x7f]')
  ) 'SUPABASE_ACCESS_TOKEN is required for the guarded rollout.'
  Assert-BinderUnattendedConditionV1 (
    $projectUrl -ceq $policy.ProjectUrl
  ) 'SUPABASE_URL is not the exact production project origin.'
  $saved = [ordered]@{}
  foreach ($entry in Get-ChildItem Env:) {
    $retained = (
      $entry.Name.Equals(
        'SUPABASE_ACCESS_TOKEN',
        [System.StringComparison]::OrdinalIgnoreCase
      ) -or
      $entry.Name.Equals(
        'SUPABASE_URL',
        [System.StringComparison]::OrdinalIgnoreCase
      )
    )
    if ($retained) {
      continue
    }
    if (Test-BinderRoutingEnvironmentNameForSupervisorV1 -Name $entry.Name) {
      if (
        -not $entry.Name.StartsWith(
          'GROOKAI_BINDER_PROD_',
          [System.StringComparison]::OrdinalIgnoreCase
        )
      ) {
        $saved[$entry.Name] = [string]$entry.Value
      }
      Remove-Item -LiteralPath "Env:$($entry.Name)"
    }
  }
  return $saved
}

function Exit-BinderUnattendedSanitizedEnvironmentV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Collections.IDictionary]$Saved
  )

  foreach ($entry in $Saved.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable(
      [string]$entry.Key,
      [string]$entry.Value,
      [EnvironmentVariableTarget]::Process
    )
  }
}

function Protect-BinderUnattendedTextV1 {
  param(
    [AllowEmptyString()]
    [string]$Text = ''
  )

  $protected = $Text
  $protected = [regex]::Replace(
    $protected,
    '(?i)\bBearer\s+[A-Za-z0-9._~+/\-=]+',
    'Bearer [REDACTED]'
  )
  $protected = [regex]::Replace(
    $protected,
    '(?i)(?<key>apikey|api_key|access_token|password|token)=([^&\s]+)',
    '${key}=[REDACTED]'
  )
  $protected = [regex]::Replace(
    $protected,
    '(?i)"(?<key>apikey|api_key|access_token|password|token)"\s*:\s*"[^"]*"',
    '"${key}":"[REDACTED]"'
  )
  $protected = [regex]::Replace(
    $protected,
    '(?i)\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b',
    '[REDACTED_JWT]'
  )
  $protected = [regex]::Replace(
    $protected,
    '(?i)(?:postgres(?:ql)?|https?)://[^\s''"]+',
    '[REDACTED_URL]'
  )
  $protected = [regex]::Replace(
    $protected,
    '(?i)\b(?:sbp_|sb_secret_|sb_publishable_)[A-Za-z0-9_-]{8,}\b',
    '[REDACTED_SUPABASE_TOKEN]'
  )
  $protected = [regex]::Replace(
    $protected,
    '[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]',
    ''
  )
  if ($protected.Length -gt 2048) {
    $protected = $protected.Substring(0, 2048) + '[TRUNCATED]'
  }
  return $protected
}

function Get-BinderUnattendedSupabaseExecutableV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Authorization
  )

  $commands = @(
    Get-Command supabase -CommandType Application `
      -ErrorAction SilentlyContinue
  )
  Assert-BinderUnattendedConditionV1 (
    $commands.Count -gt 0
  ) 'Pinned Supabase CLI is unavailable.'
  # Get-Command returns PATH-ordered application candidates. Selecting the
  # first is exactly the executable bare `supabase` invocation would resolve;
  # its pinned launcher hash below rejects any precedence hijack.
  $command = $commands[0]
  Assert-BinderUnattendedConditionV1 (
    -not [string]::IsNullOrWhiteSpace([string]$command.Source)
  ) 'Pinned Supabase CLI resolution returned an empty launcher path.'
  $launcher = Assert-BinderUnattendedLocalPathV1 `
    -Path ([System.IO.Path]::GetFullPath([string]$command.Source)) `
    -Label 'Supabase CLI launcher' `
    -RequiredType Leaf
  $descriptor = [System.IO.Path]::ChangeExtension($launcher, '.shim')
  $descriptor = Assert-BinderUnattendedLocalPathV1 `
    -Path $descriptor -Label 'Supabase CLI shim descriptor' `
    -RequiredType Leaf
  $descriptorText = [System.IO.File]::ReadAllText($descriptor)
  $pathMatch = [regex]::Match(
    $descriptorText,
    '(?m)^\s*path\s*=\s*"(?<path>[^"]+)"\s*$'
  )
  Assert-BinderUnattendedConditionV1 (
    $pathMatch.Success
  ) 'Supabase CLI shim target could not be resolved.'
  $binaryCandidate = [System.IO.Path]::GetFullPath(
    $pathMatch.Groups['path'].Value
  )
  $binaryParent = Get-Item -LiteralPath (
    Split-Path -Parent $binaryCandidate
  ) -Force
  if ($binaryParent.Attributes.HasFlag(
    [System.IO.FileAttributes]::ReparsePoint
  )) {
    $resolvedParent = $binaryParent.ResolveLinkTarget($true)
    Assert-BinderUnattendedConditionV1 (
      $null -ne $resolvedParent
    ) 'Supabase CLI binary parent link could not be resolved.'
    $binaryCandidate = Join-Path $resolvedParent.FullName (
      Split-Path -Leaf $binaryCandidate
    )
  }
  $binary = Assert-BinderUnattendedLocalPathV1 `
    -Path $binaryCandidate `
    -Label 'Supabase CLI binary' `
    -RequiredType Leaf
  Assert-BinderUnattendedConditionV1 (
    (Get-BinderUnattendedSha256FileV1 -Path $launcher) -ceq
      $Authorization.supabase_cli_launcher_sha256
  ) 'Supabase CLI launcher hash changed.'
  Assert-BinderUnattendedConditionV1 (
    (Get-BinderUnattendedSha256FileV1 -Path $descriptor) -ceq
      $Authorization.supabase_cli_shim_descriptor_sha256
  ) 'Supabase CLI shim descriptor hash changed.'
  Assert-BinderUnattendedConditionV1 (
    (Get-BinderUnattendedSha256FileV1 -Path $binary) -ceq
      $Authorization.supabase_cli_binary_sha256
  ) 'Supabase CLI binary hash changed.'
  return [pscustomobject][ordered]@{
    LauncherPath = $launcher
    ShimDescriptorPath = $descriptor
    BinaryPath = $binary
  }
}

function Initialize-BinderUnattendedNativeV1 {
  if ('GrookaiBinderUnattendedNativeV1' -as [type]) {
    return
  }

  Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

public static class GrookaiBinderUnattendedNativeV1
{
    [StructLayout(LayoutKind.Sequential)]
    public struct SystemPowerStatus
    {
        public byte ACLineStatus;
        public byte BatteryFlag;
        public byte BatteryLifePercent;
        public byte SystemStatusFlag;
        public uint BatteryLifeTime;
        public uint BatteryFullLifeTime;
    }

    [Flags]
    public enum ExecutionState : uint
    {
        SystemRequired = 0x00000001,
        Continuous = 0x80000000
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern ExecutionState SetThreadExecutionState(
        ExecutionState esFlags);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetSystemPowerStatus(
        out SystemPowerStatus status);

    [DllImport(
        "kernel32.dll",
        CharSet = CharSet.Unicode,
        SetLastError = true)]
    private static extern uint QueryDosDeviceW(
        string deviceName,
        StringBuilder targetPath,
        int max);

    [DllImport(
        "kernel32.dll",
        CharSet = CharSet.Unicode,
        SetLastError = true)]
    private static extern SafeFileHandle CreateFileW(
        string fileName,
        uint desiredAccess,
        uint shareMode,
        IntPtr securityAttributes,
        uint creationDisposition,
        uint flagsAndAttributes,
        IntPtr templateFile);

    [DllImport(
        "kernel32.dll",
        CharSet = CharSet.Unicode,
        SetLastError = true)]
    private static extern uint GetFinalPathNameByHandleW(
        SafeFileHandle file,
        StringBuilder path,
        uint pathLength,
        uint flags);

    public static string GetFinalPath(string path)
    {
        const uint FileReadAttributes = 0x80;
        const uint ShareRead = 0x1;
        const uint ShareWrite = 0x2;
        const uint ShareDelete = 0x4;
        const uint OpenExisting = 3;
        const uint BackupSemantics = 0x02000000;

        using (SafeFileHandle handle = CreateFileW(
            path,
            FileReadAttributes,
            ShareRead | ShareWrite | ShareDelete,
            IntPtr.Zero,
            OpenExisting,
            BackupSemantics,
            IntPtr.Zero))
        {
            if (handle.IsInvalid)
            {
                throw new Win32Exception(
                    Marshal.GetLastWin32Error(),
                    "Could not open path for final-path resolution.");
            }
            var buffer = new StringBuilder(32768);
            uint length = GetFinalPathNameByHandleW(
                handle,
                buffer,
                (uint)buffer.Capacity,
                0);
            if (length == 0 || length >= buffer.Capacity)
            {
                throw new Win32Exception(
                    Marshal.GetLastWin32Error(),
                    "Could not resolve final path.");
            }
            string result = buffer.ToString();
            const string prefix = @"\\?\";
            if (result.StartsWith(prefix, StringComparison.Ordinal))
            {
                result = result.Substring(prefix.Length);
            }
            return result;
        }
    }

    public static string GetDosDeviceTarget(string drive)
    {
        var buffer = new StringBuilder(32768);
        uint length = QueryDosDeviceW(drive, buffer, buffer.Capacity);
        if (length == 0)
        {
            throw new Win32Exception(
                Marshal.GetLastWin32Error(),
                "Could not resolve DOS device target.");
        }
        return buffer.ToString();
    }
}
'@
}

function Get-BinderUnattendedFinalPathV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  Initialize-BinderUnattendedNativeV1
  return [System.IO.Path]::GetFullPath(
    [GrookaiBinderUnattendedNativeV1]::GetFinalPath($Path)
  ).TrimEnd('\')
}

function Get-BinderUnattendedWorktreePathsV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $policy = Get-BinderUnattendedPolicyV1
  $modulePath = Join-Path $RepoRoot $policy.RolloutModuleRelativePath
  Import-Module $modulePath -Force
  return @(Get-BinderWorktreePathsV1 -RepoRoot $RepoRoot)
}

function Assert-BinderUnattendedOutsideEveryWorktreeV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $finalPath = Get-BinderUnattendedFinalPathV1 -Path $Path
  foreach ($worktree in (
    Get-BinderUnattendedWorktreePathsV1 -RepoRoot $RepoRoot
  )) {
    $finalWorktree = Get-BinderUnattendedFinalPathV1 -Path $worktree
    Assert-BinderUnattendedConditionV1 (
      -not (
        $finalPath.Equals(
          $finalWorktree,
          [System.StringComparison]::OrdinalIgnoreCase
        ) -or
        $finalPath.StartsWith(
          "$finalWorktree\",
          [System.StringComparison]::OrdinalIgnoreCase
        )
      )
    ) "$Label must be outside every Git worktree."
  }
  return $finalPath
}

function Get-BinderUnattendedAllowedSidsV1 {
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  Assert-BinderUnattendedConditionV1 (
    $null -ne $identity.User
  ) 'Current Windows user SID could not be resolved.'
  return [pscustomobject][ordered]@{
    CurrentUser = $identity.User
    System = [System.Security.Principal.SecurityIdentifier]::new(
      'S-1-5-18'
    )
    Administrators =
      [System.Security.Principal.SecurityIdentifier]::new(
        'S-1-5-32-544'
      )
  }
}

function Test-BinderUnattendedSidAllowedV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Security.Principal.SecurityIdentifier]$Sid,
    [Parameter(Mandatory = $true)]
    [object]$Allowed
  )

  return (
    $Sid.Equals($Allowed.CurrentUser) -or
    $Sid.Equals($Allowed.System) -or
    $Sid.Equals($Allowed.Administrators)
  )
}

function Assert-BinderUnattendedParentDeleteSafetyV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $allowed = Get-BinderUnattendedAllowedSidsV1
  $dangerous = (
    [System.Security.AccessControl.FileSystemRights]::Delete -bor
    [System.Security.AccessControl.FileSystemRights]::
      DeleteSubdirectoriesAndFiles -bor
    [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor
    [System.Security.AccessControl.FileSystemRights]::TakeOwnership
  )
  $cursor = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
  while ($cursor -and (Test-Path -LiteralPath $cursor)) {
    $acl = Get-Acl -LiteralPath $cursor
    foreach ($rule in $acl.Access) {
      if (
        $rule.AccessControlType -eq
          [System.Security.AccessControl.AccessControlType]::Allow -and
        -not $rule.PropagationFlags.HasFlag(
          [System.Security.AccessControl.PropagationFlags]::InheritOnly
        )
      ) {
        try {
          $sid = $rule.IdentityReference.Translate(
            [System.Security.Principal.SecurityIdentifier]
          )
        } catch {
          Stop-BinderUnattendedV1 `
            -ExitClass 'local_integrity_stop' `
            -Message "ACL identity could not be resolved for $cursor."
        }
        if (-not (Test-BinderUnattendedSidAllowedV1 `
          -Sid $sid -Allowed $allowed)) {
          Assert-BinderUnattendedConditionV1 (
            ($rule.FileSystemRights -band $dangerous) -eq 0
          ) "An untrusted principal can delete or retarget secure state through $cursor."
        }
      }
    }
    $parent = Split-Path -Parent $cursor
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -ceq $cursor) {
      break
    }
    $cursor = $parent
  }
}

function Set-BinderUnattendedPrivateDirectoryAclV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $allowed = Get-BinderUnattendedAllowedSidsV1
  $security =
    [System.Security.AccessControl.DirectorySecurity]::new()
  $security.SetAccessRuleProtection($true, $false)
  $security.SetOwner($allowed.CurrentUser)
  $inheritance = (
    [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
    [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
  )
  foreach ($sid in @(
    $allowed.CurrentUser,
    $allowed.System,
    $allowed.Administrators
  )) {
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      [System.Security.AccessControl.FileSystemRights]::FullControl,
      $inheritance,
      [System.Security.AccessControl.PropagationFlags]::None,
      [System.Security.AccessControl.AccessControlType]::Allow
    )
    [void]$security.AddAccessRule($rule)
  }
  $directory = [System.IO.DirectoryInfo]::new($Path)
  [System.IO.FileSystemAclExtensions]::SetAccessControl(
    $directory,
    $security
  )
}

function Assert-BinderUnattendedPrivateDirectoryAclV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $allowed = Get-BinderUnattendedAllowedSidsV1
  $acl = Get-Acl -LiteralPath $Path
  Assert-BinderUnattendedConditionV1 (
    $acl.AreAccessRulesProtected
  ) "Secure directory inherits ACL entries: $Path"
  $ownerSid = (
    [System.Security.Principal.NTAccount]$acl.Owner
  ).Translate([System.Security.Principal.SecurityIdentifier])
  Assert-BinderUnattendedConditionV1 (
    Test-BinderUnattendedSidAllowedV1 -Sid $ownerSid -Allowed $allowed
  ) "Secure directory owner is not trusted: $Path"
  $requiredSids = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
  )
  foreach ($rule in $acl.Access) {
    $sid = $rule.IdentityReference.Translate(
      [System.Security.Principal.SecurityIdentifier]
    )
    Assert-BinderUnattendedConditionV1 (
      $rule.AccessControlType -eq
        [System.Security.AccessControl.AccessControlType]::Allow -and
      (Test-BinderUnattendedSidAllowedV1 -Sid $sid -Allowed $allowed) -and
      -not $rule.IsInherited -and
      (
        $rule.FileSystemRights -band
          [System.Security.AccessControl.FileSystemRights]::FullControl
      ) -eq [System.Security.AccessControl.FileSystemRights]::FullControl
    ) "Secure directory ACL contains an unexpected rule: $Path"
    [void]$requiredSids.Add($sid.Value)
  }
  foreach ($sid in @(
    $allowed.CurrentUser,
    $allowed.System,
    $allowed.Administrators
  )) {
    Assert-BinderUnattendedConditionV1 (
      $requiredSids.Contains($sid.Value)
    ) "Secure directory ACL is missing a required trustee: $Path"
  }
}

function New-BinderUnattendedPrivateDirectoryV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [bool]$AllowExisting = $false
  )

  $fullPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
  if (Test-Path -LiteralPath $fullPath) {
    Assert-BinderUnattendedConditionV1 $AllowExisting (
      "Secure directory already exists unexpectedly: $fullPath"
    )
    [void](Assert-BinderUnattendedLocalPathV1 `
      -Path $fullPath -Label 'Secure directory' `
      -RequiredType Container)
    Assert-BinderUnattendedPrivateDirectoryAclV1 -Path $fullPath
    return $fullPath
  }
  $parent = Split-Path -Parent $fullPath
  Assert-BinderUnattendedConditionV1 (
    Test-Path -LiteralPath $parent -PathType Container
  ) "Secure directory parent does not exist: $parent"
  Assert-BinderUnattendedParentDeleteSafetyV1 -Path $parent
  [void][System.IO.Directory]::CreateDirectory($fullPath)
  Set-BinderUnattendedPrivateDirectoryAclV1 -Path $fullPath
  [void](Assert-BinderUnattendedLocalPathV1 `
    -Path $fullPath -Label 'Secure directory' `
    -RequiredType Container)
  Assert-BinderUnattendedPrivateDirectoryAclV1 -Path $fullPath
  Assert-BinderUnattendedParentDeleteSafetyV1 -Path $parent
  return $fullPath
}

function Initialize-BinderUnattendedSecureRootsV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Authorization
  )

  $policy = Get-BinderUnattendedPolicyV1
  $localAppData = [Environment]::GetFolderPath(
    [Environment+SpecialFolder]::LocalApplicationData
  )
  [void](Assert-BinderUnattendedLocalPathV1 `
    -Path $localAppData -Label 'LocalApplicationData' `
    -RequiredType Container)
  Assert-BinderUnattendedParentDeleteSafetyV1 -Path $localAppData
  [void](New-BinderUnattendedPrivateDirectoryV1 `
    -Path $policy.BaseNamespaceRoot -AllowExisting $true)
  $namespace = New-BinderUnattendedPrivateDirectoryV1 `
    -Path $policy.SecureNamespaceRoot -AllowExisting $true
  [void](New-BinderUnattendedPrivateDirectoryV1 `
    -Path $policy.StateNamespaceRoot -AllowExisting $true)
  $state = New-BinderUnattendedPrivateDirectoryV1 `
    -Path $policy.StateRoot -AllowExisting $true
  $artifacts = New-BinderUnattendedPrivateDirectoryV1 `
    -Path $policy.ArtifactNamespaceRoot -AllowExisting $true
  return [pscustomobject][ordered]@{
    NamespaceRoot = $namespace
    StateRoot = $state
    ArtifactNamespaceRoot = $artifacts
    ArtifactRoot = $Authorization.artifact_root
  }
}

function Assert-BinderUnattendedStateAvailableV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$StateRoot
  )

  Assert-BinderUnattendedPrivateDirectoryAclV1 -Path $StateRoot
  $entries = @(
    Get-ChildItem -LiteralPath $StateRoot -Force
  )
  $mutationClaimPath = Join-Path (
    $StateRoot
  ) (Get-BinderUnattendedPolicyV1).MutationClaimFileName
  if (Test-Path -LiteralPath $mutationClaimPath) {
    Stop-BinderUnattendedV1 `
      -ExitClass 'mutation_possible_stop' `
      -Message (
        'Stable state contains the durable mutation-launch marker. ' +
        'Automation is permanently blocked and database state may have changed.'
      )
  }
  Assert-BinderUnattendedConditionV1 (
    $entries.Count -eq 0
  ) (
    'Stable package/project state is not empty. A prior, corrupt, ' +
    'unknown, or mutation-possible attempt permanently blocks automation.'
  )
}

function New-BinderUnattendedArtifactRunRootV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ArtifactRoot
  )

  Assert-BinderUnattendedConditionV1 (
    -not (Test-Path -LiteralPath $ArtifactRoot)
  ) 'Authorization artifact run root already exists.'
  return New-BinderUnattendedPrivateDirectoryV1 -Path $ArtifactRoot
}

function New-BinderUnattendedMutexV1 {
  $policy = Get-BinderUnattendedPolicyV1
  $allowed = Get-BinderUnattendedAllowedSidsV1
  $security = [System.Security.AccessControl.MutexSecurity]::new()
  $security.SetAccessRuleProtection($true, $false)
  foreach ($sid in @(
    $allowed.CurrentUser,
    $allowed.System,
    $allowed.Administrators
  )) {
    $rule = [System.Security.AccessControl.MutexAccessRule]::new(
      $sid,
      [System.Security.AccessControl.MutexRights]::FullControl,
      [System.Security.AccessControl.AccessControlType]::Allow
    )
    [void]$security.AddAccessRule($rule)
  }
  $createdNew = $false
  try {
    $mutex = [System.Threading.MutexAcl]::Create(
      $false,
      $policy.MutexName,
      [ref]$createdNew,
      $security
    )
  } catch {
    Stop-BinderUnattendedV1 `
      -ExitClass 'local_integrity_stop' `
      -Message 'The fixed global rollout mutex could not be created.'
  }
  if (-not $createdNew) {
    $mutex.Dispose()
    Stop-BinderUnattendedV1 `
      -ExitClass 'safe_stop_pre_mutation' `
      -Message 'The fixed global rollout mutex already exists.'
  }
  try {
    $acquired = $mutex.WaitOne(0)
  } catch [System.Threading.AbandonedMutexException] {
    $mutex.Dispose()
    Stop-BinderUnattendedV1 `
      -ExitClass 'local_integrity_stop' `
      -Message 'The fixed global rollout mutex was abandoned.'
  }
  if (-not $acquired) {
    $mutex.Dispose()
    Stop-BinderUnattendedV1 `
      -ExitClass 'safe_stop_pre_mutation' `
      -Message 'Another Binder rollout supervisor owns the global mutex.'
  }
  return $mutex
}

function Enter-BinderUnattendedWakeLockV1 {
  Initialize-BinderUnattendedNativeV1
  $flags = (
    [GrookaiBinderUnattendedNativeV1+ExecutionState]::Continuous -bor
    [GrookaiBinderUnattendedNativeV1+ExecutionState]::SystemRequired
  )
  $previous =
    [GrookaiBinderUnattendedNativeV1]::SetThreadExecutionState($flags)
  Assert-BinderUnattendedConditionV1 (
    [uint32]$previous -ne 0
  ) 'Windows system-awake lock could not be established.'
  return $true
}

function Exit-BinderUnattendedWakeLockV1 {
  if ('GrookaiBinderUnattendedNativeV1' -as [type]) {
    [void][GrookaiBinderUnattendedNativeV1]::SetThreadExecutionState(
      [GrookaiBinderUnattendedNativeV1+ExecutionState]::Continuous
    )
  }
}

function Assert-BinderUnattendedAcPowerV1 {
  Initialize-BinderUnattendedNativeV1
  $status =
    [GrookaiBinderUnattendedNativeV1+SystemPowerStatus]::new()
  $succeeded =
    [GrookaiBinderUnattendedNativeV1]::GetSystemPowerStatus(
      [ref]$status
    )
  Assert-BinderUnattendedConditionV1 (
    $succeeded -and $status.ACLineStatus -eq 1
  ) 'Unattended production rollout requires confirmed AC power.'
  return [pscustomobject][ordered]@{
    ACLineStatus = [int]$status.ACLineStatus
    BatteryFlag = [int]$status.BatteryFlag
    BatteryLifePercent = [int]$status.BatteryLifePercent
  }
}

function Write-BinderUnattendedCreateNewDurableV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [byte[]]$Bytes
  )

  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $parent = Split-Path -Parent $fullPath
  Assert-BinderUnattendedPrivateDirectoryAclV1 -Path $parent
  $stream = $null
  try {
    $stream = [System.IO.FileStream]::new(
      $fullPath,
      [System.IO.FileMode]::CreateNew,
      [System.IO.FileAccess]::Write,
      [System.IO.FileShare]::Read,
      4096,
      [System.IO.FileOptions]::WriteThrough
    )
    $stream.Write($Bytes, 0, $Bytes.Length)
    $stream.Flush($true)
  } catch [System.IO.IOException] {
    Stop-BinderUnattendedV1 `
      -ExitClass 'local_integrity_stop' `
      -Message "Durable at-most-once state already exists or could not be created: $fullPath"
  } finally {
    if ($null -ne $stream) {
      $stream.Dispose()
    }
  }
  $item = Get-Item -LiteralPath $fullPath -Force
  Assert-BinderUnattendedConditionV1 (
    -not $item.Attributes.HasFlag(
      [System.IO.FileAttributes]::ReparsePoint
    )
  ) 'Durable state file became a reparse point.'
  $readback = [System.IO.File]::ReadAllBytes($fullPath)
  $matches = $readback.Length -eq $Bytes.Length
  if ($matches) {
    for ($index = 0; $index -lt $Bytes.Length; $index += 1) {
      if ($readback[$index] -ne $Bytes[$index]) {
        $matches = $false
        break
      }
    }
  }
  Assert-BinderUnattendedConditionV1 (
    $matches
  ) 'Durable state file readback differs from the flushed claim bytes.'
  return $fullPath
}

function New-BinderUnattendedClaimV1 {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('attempt', 'mutation')]
    [string]$Kind,
    [Parameter(Mandatory = $true)]
    [object]$Authorization,
    [Parameter(Mandatory = $true)]
    [string]$AuthorizationSha256,
    [Parameter(Mandatory = $true)]
    [string]$StateRoot,
    [Parameter(Mandatory = $true)]
    [string]$PreflightManifestSha256,
    [datetimeoffset]$NowUtc = [datetimeoffset]::UtcNow
  )

  $policy = Get-BinderUnattendedPolicyV1
  $fileName = if ($Kind -ceq 'attempt') {
    $policy.AttemptClaimFileName
  } else {
    $policy.MutationClaimFileName
  }
  $claim = [ordered]@{
    schema_version = 1
    claim_kind = $Kind
    project_ref = $policy.ProjectRef
    package_id = $policy.PackageId
    package_fingerprint_sha256 = $policy.PackageFingerprintSha256
    authorization_id = $Authorization.authorization_id
    authorization_sha256 = $AuthorizationSha256
    reviewed_main_sha = $Authorization.reviewed_main_sha
    preflight_manifest_sha256 = $PreflightManifestSha256
    committed_at_utc = $NowUtc.ToString('o')
  }
  $json = ($claim | ConvertTo-Json -Compress -Depth 8)
  return Write-BinderUnattendedCreateNewDurableV1 `
    -Path (Join-Path $StateRoot $fileName) `
    -Bytes ([System.Text.UTF8Encoding]::new($false).GetBytes($json))
}

function Get-BinderUnattendedFilesNoReparseV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root
  )

  $rootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd('\')
  $directories =
    [System.Collections.Generic.Stack[string]]::new()
  $directories.Push($rootPath)
  $files = [System.Collections.Generic.List[object]]::new()
  while ($directories.Count -gt 0) {
    $directory = $directories.Pop()
    $directoryItem = Get-Item -LiteralPath $directory -Force
    Assert-BinderUnattendedConditionV1 (
      -not $directoryItem.Attributes.HasFlag(
        [System.IO.FileAttributes]::ReparsePoint
      )
    ) "Artifact directory is a reparse point: $directory"
    foreach ($item in Get-ChildItem -LiteralPath $directory -Force) {
      Assert-BinderUnattendedConditionV1 (
        -not $item.Attributes.HasFlag(
          [System.IO.FileAttributes]::ReparsePoint
        )
      ) "Artifact entry is a reparse point: $($item.FullName)"
      if ($item.PSIsContainer) {
        $directories.Push($item.FullName)
      } else {
        $files.Add($item)
      }
    }
  }
  return @($files)
}

function Test-BinderUnattendedChecksumsV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root,

    [Parameter(Mandatory = $true)]
    [string[]]$ExpectedRelativeFiles
  )

  $rootPath = Assert-BinderUnattendedLocalPathV1 `
    -Path $Root -Label 'Preflight artifact root' `
    -RequiredType Container
  Assert-BinderUnattendedConditionV1 (
    @(
      Get-ChildItem -LiteralPath $rootPath -Directory -Force
    ).Count -eq 0
  ) 'Preflight artifact root must not contain subdirectories.'
  $checksumPath = Join-Path $rootPath 'checksums.sha256'
  [void](Assert-BinderUnattendedLocalPathV1 `
    -Path $checksumPath -Label 'Preflight checksum file' `
    -RequiredType Leaf)
  $checksumBytes = [System.IO.File]::ReadAllBytes($checksumPath)
  Assert-BinderUnattendedConditionV1 (
    -not (
      $checksumBytes.Length -ge 3 -and
      $checksumBytes[0] -eq 0xef -and
      $checksumBytes[1] -eq 0xbb -and
      $checksumBytes[2] -eq 0xbf
    )
  ) 'Preflight checksum file must not contain a BOM.'
  foreach ($value in $checksumBytes) {
    Assert-BinderUnattendedConditionV1 (
      $value -ge 0x20 -or $value -eq 0x0a
    ) 'Preflight checksum file contains a forbidden control byte.'
  }
  $checksumText = [System.Text.UTF8Encoding]::new(
    $false,
    $true
  ).GetString($checksumBytes)
  Assert-BinderUnattendedConditionV1 (
    $checksumText.EndsWith("`n", [StringComparison]::Ordinal) -and
    -not $checksumText.Contains("`r") -and
    (
      $checksumText.Length -eq 1 -or
      $checksumText[$checksumText.Length - 2] -ne "`n"
    )
  ) 'Preflight checksum file must use LF and end with one LF.'
  $lines = @(
    $checksumText.Substring(0, $checksumText.Length - 1) -split "`n"
  )
  $entries = [ordered]@{}
  $caseFolded = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
  )
  foreach ($line in $lines) {
    $match = [regex]::Match(
      $line,
      '^(?<sha>[0-9a-f]{64})  (?<path>[A-Za-z0-9._/-]+)$'
    )
    Assert-BinderUnattendedConditionV1 (
      $match.Success
    ) 'Preflight checksum line is not canonical.'
    $relative = $match.Groups['path'].Value
    $segments = @($relative -split '/')
    Assert-BinderUnattendedConditionV1 (
      -not $relative.StartsWith('/') -and
      -not $relative.Contains('\') -and
      -not $relative.Contains(':') -and
      -not ($segments -ccontains '') -and
      -not ($segments -ccontains '..') -and
      -not ($segments -ccontains '.')
    ) 'Preflight checksum path is unsafe.'
    foreach ($segment in $segments) {
      Assert-BinderUnattendedConditionV1 (
        -not $segment.EndsWith(
          '.',
          [StringComparison]::Ordinal
        ) -and
        -not $segment.EndsWith(
          ' ',
          [StringComparison]::Ordinal
        ) -and
        -not (
          [System.IO.Path]::GetFileNameWithoutExtension($segment) -match
            '^(?i:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$'
        )
      ) 'Preflight checksum path contains a Windows alias or reserved name.'
    }
    Assert-BinderUnattendedConditionV1 (
      -not $entries.Contains($relative) -and
      $caseFolded.Add($relative)
    ) 'Preflight checksum contains a duplicate or case-colliding path.'
    $entries[$relative] = $match.Groups['sha'].Value
  }
  $expected = @($ExpectedRelativeFiles)
  $actualEntryNames = @($entries.Keys)
  Assert-BinderUnattendedArrayEqualV1 `
    -Actual $actualEntryNames -Expected $expected `
    -Label 'Preflight checksum paths'

  $actualFiles = @(
    Get-BinderUnattendedFilesNoReparseV1 -Root $rootPath |
      Where-Object {
        -not $_.FullName.Equals(
          $checksumPath,
          [System.StringComparison]::OrdinalIgnoreCase
        )
      } |
      ForEach-Object {
        [System.IO.Path]::GetRelativePath(
          $rootPath,
          $_.FullName
        ).Replace('\', '/')
      }
  )
  Assert-BinderUnattendedConditionV1 (
    $actualFiles.Count -eq $expected.Count
  ) 'Preflight artifact file count is not exact.'
  $actualFileSet = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
  )
  $actualFileFolded =
    [System.Collections.Generic.HashSet[string]]::new(
      [System.StringComparer]::OrdinalIgnoreCase
    )
  foreach ($relative in $actualFiles) {
    Assert-BinderUnattendedConditionV1 (
      $actualFileSet.Add($relative) -and
      $actualFileFolded.Add($relative)
    ) 'Preflight artifacts contain duplicate or case-colliding paths.'
  }
  foreach ($relative in $expected) {
    Assert-BinderUnattendedConditionV1 (
      $actualFileSet.Contains($relative)
    ) "Preflight artifact is missing: $relative"
  }
  foreach ($relative in $entries.Keys) {
    $fullPath = [System.IO.Path]::GetFullPath(
      (Join-Path $rootPath $relative)
    )
    Assert-BinderUnattendedConditionV1 (
      $fullPath.StartsWith(
        "$rootPath\",
        [System.StringComparison]::OrdinalIgnoreCase
      )
    ) 'Preflight checksum path escaped the artifact root.'
    Assert-BinderUnattendedConditionV1 (
      (Get-BinderUnattendedSha256FileV1 -Path $fullPath) -ceq
        $entries[$relative]
    ) "Preflight artifact checksum mismatch: $relative"
  }
  return [pscustomobject][ordered]@{
    Status = 'pass'
    FileCount = $entries.Count
    ChecksumFileSha256 =
      Get-BinderUnattendedSha256FileV1 -Path $checksumPath
  }
}

function Assert-BinderUnattendedNoJsonCollisionsV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Text.Json.JsonElement]$Element,
    [string]$Label = 'JSON'
  )

  if ($Element.ValueKind -eq [System.Text.Json.JsonValueKind]::Object) {
    $ordinal = [System.Collections.Generic.HashSet[string]]::new(
      [System.StringComparer]::Ordinal
    )
    $folded = [System.Collections.Generic.HashSet[string]]::new(
      [System.StringComparer]::OrdinalIgnoreCase
    )
    foreach ($property in $Element.EnumerateObject()) {
      Assert-BinderUnattendedConditionV1 (
        $ordinal.Add($property.Name) -and
        $folded.Add($property.Name) -and
        -not [regex]::IsMatch($property.Name, '[\x00-\x1f\x7f]')
      ) "$Label contains duplicate, case-colliding, or unsafe fields."
      Assert-BinderUnattendedNoJsonCollisionsV1 `
        -Element $property.Value -Label "$Label.$($property.Name)"
    }
  } elseif ($Element.ValueKind -eq [System.Text.Json.JsonValueKind]::Array) {
    $index = 0
    foreach ($entry in $Element.EnumerateArray()) {
      Assert-BinderUnattendedNoJsonCollisionsV1 `
        -Element $entry -Label "$Label[$index]"
      $index += 1
    }
  }
}

function ConvertFrom-BinderUnattendedJsonElementV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Text.Json.JsonElement]$Element
  )

  switch ($Element.ValueKind) {
    ([System.Text.Json.JsonValueKind]::Object) {
      $value = [ordered]@{}
      foreach ($property in $Element.EnumerateObject()) {
        $value[$property.Name] =
          ConvertFrom-BinderUnattendedJsonElementV1 `
            -Element $property.Value
      }
      return [pscustomobject]$value
    }
    ([System.Text.Json.JsonValueKind]::Array) {
      $values = [System.Collections.Generic.List[object]]::new()
      foreach ($entry in $Element.EnumerateArray()) {
        $values.Add(
          (ConvertFrom-BinderUnattendedJsonElementV1 -Element $entry)
        )
      }
      return ,$values.ToArray()
    }
    ([System.Text.Json.JsonValueKind]::String) {
      return $Element.GetString()
    }
    ([System.Text.Json.JsonValueKind]::Number) {
      $integer = 0L
      if ($Element.TryGetInt64([ref]$integer)) {
        return $integer
      }
      $decimal = [decimal]::Zero
      if ($Element.TryGetDecimal([ref]$decimal)) {
        return $decimal
      }
      return $Element.GetDouble()
    }
    ([System.Text.Json.JsonValueKind]::True) {
      return $true
    }
    ([System.Text.Json.JsonValueKind]::False) {
      return $false
    }
    ([System.Text.Json.JsonValueKind]::Null) {
      return $null
    }
    default {
      Stop-BinderUnattendedV1 `
        -ExitClass 'local_integrity_stop' `
        -Message 'Reviewed JSON artifact contains an unsupported value kind.'
    }
  }
}

function Read-BinderUnattendedJsonFileV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [string[]]$RequiredTopLevelNames = @(),
    [string[]]$AllowedTopLevelNames = @()
  )

  [void](Assert-BinderUnattendedLocalPathV1 `
    -Path $Path -Label 'Reviewed JSON artifact' -RequiredType Leaf)
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  Assert-BinderUnattendedConditionV1 (
    -not (
      $bytes.Length -ge 3 -and
      $bytes[0] -eq 0xef -and
      $bytes[1] -eq 0xbb -and
      $bytes[2] -eq 0xbf
    )
  ) 'Reviewed JSON artifact contains a BOM.'
  $json = [System.Text.UTF8Encoding]::new($false, $true).GetString(
    $bytes
  )
  $document = $null
  $materialized = $null
  try {
    $document = [System.Text.Json.JsonDocument]::Parse($json)
    Assert-BinderUnattendedNoJsonCollisionsV1 `
      -Element $document.RootElement -Label 'Reviewed JSON artifact'
    if ($AllowedTopLevelNames.Count -gt 0) {
      Assert-BinderUnattendedJsonAllowedPropertiesV1 `
        -Element $document.RootElement `
        -RequiredNames $RequiredTopLevelNames `
        -AllowedNames $AllowedTopLevelNames `
        -Label 'Reviewed JSON artifact'
    }
    $materialized = ConvertFrom-BinderUnattendedJsonElementV1 `
      -Element $document.RootElement
  } finally {
    if ($null -ne $document) {
      $document.Dispose()
    }
  }
  return $materialized
}

function Read-BinderUnattendedStrictShaSidecarV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $fullPath = Assert-BinderUnattendedLocalPathV1 `
    -Path $Path -Label 'SHA-256 sidecar' -RequiredType Leaf
  $bytes = [System.IO.File]::ReadAllBytes($fullPath)
  Assert-BinderUnattendedConditionV1 (
    $bytes.Length -eq 65 -and $bytes[64] -eq 0x0a
  ) 'SHA-256 sidecar must be exactly 64 lowercase hex bytes plus LF.'
  $text = [System.Text.Encoding]::ASCII.GetString(
    $bytes,
    0,
    64
  )
  Assert-BinderUnattendedConditionV1 (
    $text -cmatch '^[0-9a-f]{64}$'
  ) 'SHA-256 sidecar is invalid.'
  return $text
}

function Read-BinderUnattendedStrictApprovalV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [object]$Manifest
  )

  $fullPath = Assert-BinderUnattendedLocalPathV1 `
    -Path $Path -Label 'Approval artifact' -RequiredType Leaf
  $bytes = [System.IO.File]::ReadAllBytes($fullPath)
  Assert-BinderUnattendedConditionV1 (
    -not (
      $bytes.Length -ge 3 -and
      $bytes[0] -eq 0xef -and
      $bytes[1] -eq 0xbb -and
      $bytes[2] -eq 0xbf
    )
  ) 'Approval artifact must not contain a BOM.'
  foreach ($value in $bytes) {
    Assert-BinderUnattendedConditionV1 (
      $value -ge 0x20 -or $value -eq 0x0a
    ) 'Approval artifact contains a forbidden control byte.'
  }
  $text = [System.Text.UTF8Encoding]::new($false, $true).GetString(
    $bytes
  )
  $expectedApply = (
    'GROOKAI_BINDER_PROD_APPLY_ACK=' +
    'APPLY-COLLABORATIVE-BINDERS-V1::' +
    "$($Manifest.project_ref)::" +
    "$($Manifest.head_sha)::" +
    $Manifest.manifest_fingerprint_sha256
  )
  $expectedBackup = (
    'GROOKAI_BINDER_PROD_BACKUP_ACK=' +
    "BACKUP-VERIFIED::$($Manifest.project_ref)::" +
    $Manifest.backup_evidence_sha256
  )
  $expectedText = "$expectedApply`n$expectedBackup`n"
  Assert-BinderUnattendedConditionV1 (
    $text -ceq $expectedText
  ) 'Approval artifact is not the exact derived two-line acknowledgement.'
  return [pscustomobject][ordered]@{
    ApplyAck = $expectedApply.Substring(
      'GROOKAI_BINDER_PROD_APPLY_ACK='.Length
    )
    BackupAck = $expectedBackup.Substring(
      'GROOKAI_BINDER_PROD_BACKUP_ACK='.Length
    )
  }
}

function Assert-BinderUnattendedObjectPropertySetV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Value,
    [Parameter(Mandatory = $true)]
    [string[]]$ExpectedNames,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  Assert-BinderUnattendedConditionV1 (
    $null -ne $Value
  ) "$Label must be an object."
  $properties = @($Value.PSObject.Properties)
  Assert-BinderUnattendedConditionV1 (
    $properties.Count -eq $ExpectedNames.Count
  ) "$Label field count is not exact."
  $actual = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
  )
  $folded = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
  )
  foreach ($property in $properties) {
    Assert-BinderUnattendedConditionV1 (
      $actual.Add($property.Name) -and
      $folded.Add($property.Name)
    ) "$Label has duplicate or case-colliding fields."
  }
  foreach ($name in $ExpectedNames) {
    Assert-BinderUnattendedConditionV1 (
      $actual.Contains($name)
    ) "$Label is missing $name."
  }
}

function Test-BinderUnattendedPreflightArtifactsV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$PreflightRoot,
    [Parameter(Mandatory = $true)]
    [object]$Authorization,
    [Parameter(Mandatory = $true)]
    [string]$BackupEvidencePath,
    [string]$RepoRoot = (Get-BinderUnattendedRepoRootV1),
    [datetimeoffset]$NowUtc = [datetimeoffset]::UtcNow
  )

  $policy = Get-BinderUnattendedPolicyV1
  $checksum = Test-BinderUnattendedChecksumsV1 `
    -Root $PreflightRoot `
    -ExpectedRelativeFiles $policy.PreflightArtifacts
  $manifestPath = Join-Path $PreflightRoot 'preflight-manifest.json'
  $manifestSidecar = Join-Path (
    $PreflightRoot
  ) 'preflight-manifest.sha256'
  $manifestFileSha256 = Read-BinderUnattendedStrictShaSidecarV1 `
    -Path $manifestSidecar
  Assert-BinderUnattendedConditionV1 (
    (Get-BinderUnattendedSha256FileV1 -Path $manifestPath) -ceq
      $manifestFileSha256
  ) 'Preflight manifest sidecar does not match the manifest bytes.'

  $manifestFields = @(
    'schema_version',
    'package_id',
    'status',
    'created_at_utc',
    'expires_at_utc',
    'project_ref',
    'package_fingerprint_sha256',
    'package_manifest_file_sha256',
    'head_sha',
    'origin_main_sha',
    'supabase_config_sha256',
    'linked_project_ref_sha256',
    'linked_pooler_url_sha256',
    'linked_project_metadata_sha256',
    'git_executable_path',
    'git_executable_sha256',
    'git_version',
    'git_exec_path',
    'git_https_helper_path',
    'git_https_helper_sha256',
    'git_common_config_sha256',
    'git_metadata_count',
    'git_metadata_sha256',
    'supabase_cli_version',
    'supabase_cli_launcher_sha256',
    'supabase_cli_binary_sha256',
    'supabase_cli_shim_descriptor_sha256',
    'tracked_migration_count',
    'tracked_migration_set_sha256',
    'migration_files',
    'pending_versions',
    'dry_run_files',
    'preapply_readback_sha256',
    'stable_catalog_fingerprint_sha256',
    'backup_evidence_path',
    'backup_evidence_sha256',
    'apply_argv',
    'manifest_fingerprint_sha256'
  )
  $manifest = Read-BinderUnattendedJsonFileV1 `
    -Path $manifestPath `
    -RequiredTopLevelNames $manifestFields `
    -AllowedTopLevelNames $manifestFields

  $rolloutModulePath = Join-Path (
    $RepoRoot
  ) $policy.RolloutModuleRelativePath
  Import-Module $rolloutModulePath -Force
  $guardManifest = Test-PreflightManifestV1 `
    -Path $manifestPath `
    -NowUtc $NowUtc.UtcDateTime
  Assert-BinderUnattendedConditionV1 (
    $guardManifest.FingerprintSha256 -ceq
      $manifest.manifest_fingerprint_sha256
  ) 'Independent preflight manifest fingerprint mismatch.'
  Assert-BinderUnattendedConditionV1 (
    $manifest.schema_version -is [long] -and
    $manifest.tracked_migration_count -is [long] -and
    $manifest.git_metadata_count -is [long] -and
    $manifest.migration_files -is [object[]] -and
    $manifest.pending_versions -is [object[]] -and
    $manifest.dry_run_files -is [object[]] -and
    $manifest.apply_argv -is [object[]]
  ) 'Preflight manifest primitive types are not exact JSON types.'
  foreach ($name in @(
    $manifestFields |
      Where-Object {
        $_ -notin @(
          'schema_version',
          'tracked_migration_count',
          'git_metadata_count',
          'migration_files',
          'pending_versions',
          'dry_run_files',
          'apply_argv'
        )
      }
  )) {
    Assert-BinderUnattendedConditionV1 (
      $manifest.PSObject.Properties[$name].Value -is [string]
    ) "Preflight manifest $name must be a JSON string."
  }
  Assert-BinderUnattendedConditionV1 (
    $manifest.schema_version -eq 1 -and
    $manifest.package_id -ceq $Authorization.package_id -and
    $manifest.status -ceq 'pass' -and
    $manifest.project_ref -ceq $Authorization.project_ref -and
    $manifest.package_fingerprint_sha256 -ceq
      $Authorization.package_fingerprint_sha256 -and
    $manifest.package_manifest_file_sha256 -ceq
      $Authorization.package_manifest_sha256 -and
    $manifest.head_sha -ceq $Authorization.reviewed_main_sha -and
    $manifest.origin_main_sha -ceq $Authorization.reviewed_main_sha
  ) 'Preflight manifest identity differs from the authorization envelope.'
  Assert-BinderUnattendedConditionV1 (
    $manifest.supabase_config_sha256 -ceq
      $Authorization.supabase_config_sha256 -and
    $manifest.linked_project_ref_sha256 -ceq
      $Authorization.linked_project_ref_sha256 -and
    $manifest.linked_pooler_url_sha256 -ceq
      $Authorization.linked_pooler_url_sha256 -and
    $manifest.linked_project_metadata_sha256 -ceq
      $Authorization.linked_project_metadata_sha256 -and
    $manifest.git_executable_path -ceq
      $Authorization.git_executable_path -and
    $manifest.git_executable_sha256 -ceq
      $Authorization.git_executable_sha256 -and
    $manifest.git_version -ceq $Authorization.git_version -and
    $manifest.git_exec_path -ceq $Authorization.git_exec_path -and
    $manifest.git_https_helper_path -ceq
      $Authorization.git_https_helper_path -and
    $manifest.git_https_helper_sha256 -ceq
      $Authorization.git_https_helper_sha256 -and
    $manifest.git_common_config_sha256 -ceq
      $Authorization.git_common_config_sha256 -and
    $manifest.git_metadata_count -eq
      $Authorization.git_metadata_count -and
    $manifest.git_metadata_sha256 -ceq
      $Authorization.git_metadata_sha256 -and
    $manifest.supabase_cli_version -ceq
      $Authorization.supabase_cli_version -and
    $manifest.supabase_cli_launcher_sha256 -ceq
      $Authorization.supabase_cli_launcher_sha256 -and
    $manifest.supabase_cli_binary_sha256 -ceq
      $Authorization.supabase_cli_binary_sha256 -and
    $manifest.supabase_cli_shim_descriptor_sha256 -ceq
      $Authorization.supabase_cli_shim_descriptor_sha256 -and
    $manifest.tracked_migration_count -eq
      $Authorization.tracked_migration_count -and
    $manifest.tracked_migration_set_sha256 -ceq
      $Authorization.tracked_migration_set_sha256
  ) 'Preflight manifest source or CLI identity differs from authorization.'
  Assert-BinderUnattendedArrayEqualV1 `
    -Actual @($manifest.pending_versions) `
    -Expected @($policy.Migrations | ForEach-Object version) `
    -Label 'Preflight pending migration versions'
  Assert-BinderUnattendedArrayEqualV1 `
    -Actual @($manifest.dry_run_files) `
    -Expected @($policy.Migrations | ForEach-Object file) `
    -Label 'Preflight dry-run files'
  Assert-BinderUnattendedArrayEqualV1 `
    -Actual @($manifest.apply_argv) `
    -Expected @($policy.ApplyArguments) `
    -Label 'Preflight apply argv'
  Assert-BinderUnattendedConditionV1 (
    @($manifest.migration_files).Count -eq @($policy.Migrations).Count
  ) 'Preflight manifest migration count mismatch.'
  for ($index = 0; $index -lt @($policy.Migrations).Count; $index += 1) {
    $actual = @($manifest.migration_files)[$index]
    $expected = @($policy.Migrations)[$index]
    Assert-BinderUnattendedObjectPropertySetV1 `
      -Value $actual `
      -ExpectedNames @('version', 'file', 'sha256') `
      -Label "Preflight manifest migration_files[$index]"
    Assert-BinderUnattendedConditionV1 (
      $actual.version -is [string] -and
      $actual.file -is [string] -and
      $actual.sha256 -is [string] -and
      $actual.version -ceq $expected.version -and
      $actual.file -ceq $expected.file -and
      $actual.sha256 -ceq $expected.sha256
    ) "Preflight manifest migration mismatch at position $index."
  }

  $actualBackupHash = Get-BinderUnattendedSha256FileV1 `
    -Path $BackupEvidencePath
  $backupEvidenceFields = @(
    'schema_version',
    'project_ref',
    'backup_kind',
    'verified_at_utc',
    'recoverable_through_utc',
    'evidence_reference',
    'restore_path_reviewed',
    'operator'
  )
  $backupEvidence = Read-BinderUnattendedJsonFileV1 `
    -Path $BackupEvidencePath `
    -RequiredTopLevelNames $backupEvidenceFields `
    -AllowedTopLevelNames $backupEvidenceFields
  Assert-BinderUnattendedConditionV1 (
    $manifest.backup_evidence_path -ceq $BackupEvidencePath -and
    $manifest.backup_evidence_sha256 -ceq $actualBackupHash
  ) 'Preflight manifest does not bind the fresh supervisor backup evidence.'

  $sourceFields = @(
    'Status',
    'PackageId',
    'PackageFingerprintSha256',
    'PackageManifestFileSha256',
    'ProjectRef',
    'SupabaseConfigSha256',
    'GitExecutablePath',
    'GitExecutableSha256',
    'GitVersion',
    'GitExecPath',
    'GitHttpsHelperPath',
    'GitHttpsHelperSha256',
    'GitCommonConfigSha256',
    'GitMetadataCount',
    'GitMetadataSha256',
    'SupabaseCliVersion',
    'SupabaseCliLauncherSha256',
    'SupabaseCliBinarySha256',
    'SupabaseCliShimDescriptorSha256',
    'TrackedMigrationCount',
    'TrackedMigrationSetSha256',
    'MigrationFiles'
  )
  $source = Read-BinderUnattendedJsonFileV1 `
    -Path (Join-Path $PreflightRoot 'source.json') `
    -RequiredTopLevelNames $sourceFields `
    -AllowedTopLevelNames $sourceFields
  Assert-BinderUnattendedConditionV1 (
    $source.TrackedMigrationCount -is [long] -and
    $source.GitMetadataCount -is [long] -and
    $source.MigrationFiles -is [object[]]
  ) 'Preflight source count/array primitive types are not exact.'
  foreach ($name in @(
    $sourceFields |
      Where-Object {
        $_ -notin @(
          'TrackedMigrationCount',
          'GitMetadataCount',
          'MigrationFiles'
        )
      }
  )) {
    Assert-BinderUnattendedConditionV1 (
      $source.PSObject.Properties[$name].Value -is [string]
    ) "Preflight source $name must be a JSON string."
  }
  Assert-BinderUnattendedConditionV1 (
    $source.Status -ceq 'pass' -and
    $source.PackageId -ceq $Authorization.package_id -and
    $source.PackageFingerprintSha256 -ceq
      $Authorization.package_fingerprint_sha256 -and
    $source.PackageManifestFileSha256 -ceq
      $Authorization.package_manifest_sha256 -and
    $source.ProjectRef -ceq $Authorization.project_ref -and
    $source.SupabaseConfigSha256 -ceq
      $Authorization.supabase_config_sha256 -and
    $source.GitExecutablePath -ceq
      $Authorization.git_executable_path -and
    $source.GitExecutableSha256 -ceq
      $Authorization.git_executable_sha256 -and
    $source.GitVersion -ceq $Authorization.git_version -and
    $source.GitExecPath -ceq $Authorization.git_exec_path -and
    $source.GitHttpsHelperPath -ceq
      $Authorization.git_https_helper_path -and
    $source.GitHttpsHelperSha256 -ceq
      $Authorization.git_https_helper_sha256 -and
    $source.GitCommonConfigSha256 -ceq
      $Authorization.git_common_config_sha256 -and
    $source.GitMetadataCount -eq
      $Authorization.git_metadata_count -and
    $source.GitMetadataSha256 -ceq
      $Authorization.git_metadata_sha256 -and
    $source.SupabaseCliVersion -ceq
      $Authorization.supabase_cli_version -and
    $source.SupabaseCliLauncherSha256 -ceq
      $Authorization.supabase_cli_launcher_sha256 -and
    $source.SupabaseCliBinarySha256 -ceq
      $Authorization.supabase_cli_binary_sha256 -and
    $source.SupabaseCliShimDescriptorSha256 -ceq
      $Authorization.supabase_cli_shim_descriptor_sha256 -and
    $source.TrackedMigrationCount -eq
      $Authorization.tracked_migration_count -and
    $source.TrackedMigrationSetSha256 -ceq
      $Authorization.tracked_migration_set_sha256
  ) 'Preflight source artifact differs from authorization.'
  Assert-BinderUnattendedConditionV1 (
    @($source.MigrationFiles).Count -eq @($policy.Migrations).Count
  ) 'Preflight source artifact migration count mismatch.'
  for ($index = 0; $index -lt @($policy.Migrations).Count; $index += 1) {
    $actual = @($source.MigrationFiles)[$index]
    $expected = @($policy.Migrations)[$index]
    Assert-BinderUnattendedObjectPropertySetV1 `
      -Value $actual `
      -ExpectedNames @('version', 'file', 'sha256') `
      -Label "Preflight source MigrationFiles[$index]"
    Assert-BinderUnattendedConditionV1 (
      $actual.version -is [string] -and
      $actual.file -is [string] -and
      $actual.sha256 -is [string] -and
      $actual.version -ceq $expected.version -and
      $actual.file -ceq $expected.file -and
      $actual.sha256 -ceq $expected.sha256
    ) "Preflight source migration mismatch at position $index."
  }

  $repository = Read-BinderUnattendedJsonFileV1 `
    -Path (Join-Path $PreflightRoot 'repository.json') `
    -RequiredTopLevelNames @(
      'HeadSha',
      'OriginMainSha',
      'Branch',
      'Clean',
      'GitCommonConfigSha256',
      'GitMetadataCount',
      'GitMetadataSha256'
    ) `
    -AllowedTopLevelNames @(
      'HeadSha',
      'OriginMainSha',
      'Branch',
      'Clean',
      'GitCommonConfigSha256',
      'GitMetadataCount',
      'GitMetadataSha256'
    )
  Assert-BinderUnattendedConditionV1 (
    $repository.HeadSha -is [string] -and
    $repository.OriginMainSha -is [string] -and
    $repository.Branch -is [string] -and
    $repository.Clean -is [bool] -and
    $repository.GitCommonConfigSha256 -is [string] -and
    $repository.GitMetadataCount -is [long] -and
    $repository.GitMetadataSha256 -is [string] -and
    $repository.HeadSha -ceq $Authorization.reviewed_main_sha -and
    $repository.OriginMainSha -ceq
      $Authorization.reviewed_main_sha -and
    $repository.Branch -ceq 'main' -and
    $repository.Clean -eq $true -and
    $repository.GitCommonConfigSha256 -ceq
      $Authorization.git_common_config_sha256 -and
    $repository.GitMetadataCount -eq
      $Authorization.git_metadata_count -and
    $repository.GitMetadataSha256 -ceq
      $Authorization.git_metadata_sha256
  ) 'Preflight repository artifact differs from authorization.'

  $project = Read-BinderUnattendedJsonFileV1 `
    -Path (Join-Path $PreflightRoot 'project-binding.json') `
    -RequiredTopLevelNames @(
      'ProjectRef',
      'ApiHost',
      'DatabaseHost',
      'Status',
      'LinkedProjectRefSha256',
      'LinkedPoolerUrlSha256',
      'LinkedProjectMetadataSha256'
    ) `
    -AllowedTopLevelNames @(
      'ProjectRef',
      'ApiHost',
      'DatabaseHost',
      'Status',
      'LinkedProjectRefSha256',
      'LinkedPoolerUrlSha256',
      'LinkedProjectMetadataSha256'
    )
  Assert-BinderUnattendedConditionV1 (
    $project.ProjectRef -is [string] -and
    $project.ApiHost -is [string] -and
    $project.DatabaseHost -is [string] -and
    $project.Status -is [string] -and
    $project.LinkedProjectRefSha256 -is [string] -and
    $project.LinkedPoolerUrlSha256 -is [string] -and
    $project.LinkedProjectMetadataSha256 -is [string] -and
    $project.ProjectRef -ceq $Authorization.project_ref -and
    $project.ApiHost -ceq "$($Authorization.project_ref).supabase.co" -and
    $project.DatabaseHost -ceq
      "db.$($Authorization.project_ref).supabase.co" -and
    $project.Status -ceq 'ACTIVE_HEALTHY' -and
    $project.LinkedProjectRefSha256 -ceq
      $Authorization.linked_project_ref_sha256 -and
    $project.LinkedPoolerUrlSha256 -ceq
      $Authorization.linked_pooler_url_sha256 -and
    $project.LinkedProjectMetadataSha256 -ceq
      $Authorization.linked_project_metadata_sha256
  ) 'Preflight project binding artifact is not exact production.'

  $ledger = Read-BinderUnattendedJsonFileV1 `
    -Path (Join-Path $PreflightRoot 'ledger.before.json') `
    -RequiredTopLevelNames @('Rows', 'Shared', 'LocalOnly', 'RemoteOnly') `
    -AllowedTopLevelNames @('Rows', 'Shared', 'LocalOnly', 'RemoteOnly')
  foreach ($collectionName in @(
    'Rows',
    'Shared',
    'LocalOnly',
    'RemoteOnly'
  )) {
    Assert-BinderUnattendedConditionV1 (
      $ledger.($collectionName) -is [object[]]
    ) "Preflight ledger.$collectionName must be a JSON array."
    foreach ($row in @($ledger.($collectionName))) {
      Assert-BinderUnattendedObjectPropertySetV1 `
        -Value $row -ExpectedNames @('Local', 'Remote', 'Time') `
        -Label "Preflight ledger.$collectionName row"
      foreach ($name in @('Local', 'Remote', 'Time')) {
        $value = $row.PSObject.Properties[$name].Value
        Assert-BinderUnattendedConditionV1 (
          $null -eq $value -or $value -is [string]
        ) "Preflight ledger.$collectionName.$name must be null or a string."
      }
    }
  }
  Assert-ExactBinderPendingSetV1 -Ledger $ledger
  $dryRun = Read-BinderUnattendedJsonFileV1 `
    -Path (Join-Path $PreflightRoot 'dry-run.parsed.json') `
    -RequiredTopLevelNames @('MigrationFiles') `
    -AllowedTopLevelNames @('MigrationFiles')
  Assert-BinderUnattendedConditionV1 (
    $dryRun.MigrationFiles -is [object[]]
  ) 'Parsed preflight dry-run MigrationFiles must be a JSON array.'
  Assert-BinderUnattendedArrayEqualV1 `
    -Actual @($dryRun.MigrationFiles) `
    -Expected @($policy.Migrations | ForEach-Object file) `
    -Label 'Parsed preflight dry-run'

  $readback = Read-BinderUnattendedJsonFileV1 `
    -Path (Join-Path $PreflightRoot 'readback.before.json') `
    -RequiredTopLevelNames @(
      'package_id',
      'phase',
      'read_only',
      'ok',
      'checks'
    ) `
    -AllowedTopLevelNames @(
      'package_id',
      'phase',
      'read_only',
      'ok',
      'checks'
    )
  Assert-BinderUnattendedConditionV1 (
    $readback.package_id -is [string] -and
    $readback.phase -is [string] -and
    $readback.read_only -is [bool] -and
    $readback.ok -is [bool] -and
    $readback.checks -is [pscustomobject] -and
    $readback.package_id -ceq $Authorization.package_id -and
    $readback.phase -ceq 'preflight' -and
    $readback.read_only -eq $true -and
    $readback.ok -eq $true
  ) 'Preflight readback status is not exact pass/read-only.'
  $readbackCheckNames = @(
    'applied_package_migration_count',
    'binder_card_event_data_exists',
    'binder_function_count',
    'binder_realtime_object_exists',
    'binder_relation_collision_count',
    'binder_trust_report_data_exists',
    'binder_type_collision_count',
    'card_event_failure_baseline_ok',
    'card_events_feed_body_sha256',
    'card_events_insert_policy',
    'card_events_select_policy',
    'changed_external_function_acl_fingerprint_sha256',
    'changed_external_function_count',
    'changed_external_function_fingerprint_sha256',
    'changed_external_policy_count',
    'changed_external_policy_fingerprint_sha256',
    'changed_external_table_acl_fingerprint_sha256',
    'drifted_functions',
    'execution_role',
    'external_trigger_name_collisions',
    'migration_head',
    'missing_columns',
    'missing_functions',
    'missing_relations',
    'missing_roles',
    'pulse_body_sha256',
    'realtime_publication_config_count',
    'realtime_publication_config_fingerprint_sha256',
    'realtime_publication_exists',
    'required_server_major_version',
    'reviewed_public_default_acl_fingerprint_sha256',
    'reviewed_public_default_acl_row_count',
    'server_major_version',
    'server_major_version_ok',
    'server_version_num',
    'stable_catalog_fingerprint_sha256',
    'trust_insert_policy',
    'trust_surface_constraint',
    'trust_surface_constraint_count',
    'trust_surface_constraint_fingerprint_sha256',
    'unexpected_public_default_acl_grantees',
    'unexpected_schema_create_privileges',
    'wrapped_pulse_function_exists'
  )
  Assert-BinderUnattendedObjectPropertySetV1 `
    -Value $readback.checks `
    -ExpectedNames $readbackCheckNames `
    -Label 'Preflight readback.checks'
  foreach ($name in @(
    'applied_package_migration_count',
    'binder_function_count',
    'binder_relation_collision_count',
    'binder_type_collision_count',
    'changed_external_function_count',
    'changed_external_policy_count',
    'realtime_publication_config_count',
    'required_server_major_version',
    'reviewed_public_default_acl_row_count',
    'server_major_version',
    'server_version_num',
    'trust_surface_constraint_count'
  )) {
    Assert-BinderUnattendedConditionV1 (
      $readback.checks.($name) -is [long]
    ) "Preflight readback $name must be a JSON integer."
  }
  foreach ($name in @(
    'binder_card_event_data_exists',
    'binder_realtime_object_exists',
    'binder_trust_report_data_exists',
    'card_event_failure_baseline_ok',
    'realtime_publication_exists',
    'server_major_version_ok',
    'wrapped_pulse_function_exists'
  )) {
    Assert-BinderUnattendedConditionV1 (
      $readback.checks.($name) -is [bool]
    ) "Preflight readback $name must be a JSON boolean."
  }
  Assert-BinderUnattendedConditionV1 (
    [string]$readback.checks.stable_catalog_fingerprint_sha256 -ceq
      $policy.StableCatalogFingerprintSha256 -and
    [string]$manifest.stable_catalog_fingerprint_sha256 -ceq
      $policy.StableCatalogFingerprintSha256
  ) 'Stable production catalog fingerprint differs from the reviewed value.'
  foreach ($property in $policy.ExpectedPreApply.PSObject.Properties) {
    Assert-BinderUnattendedConditionV1 (
      $readback.checks.($property.Name) -eq $property.Value
    ) "Preflight readback $($property.Name) is not the authorized zero state."
  }
  foreach ($name in @(
    'external_trigger_name_collisions',
    'unexpected_public_default_acl_grantees',
    'unexpected_schema_create_privileges',
    'missing_relations',
    'missing_columns',
    'missing_functions',
    'drifted_functions',
    'missing_roles'
  )) {
    Assert-BinderUnattendedConditionV1 (
      $readback.checks.($name) -is [object[]] -and
      @($readback.checks.($name)).Count -eq 0
    ) "Preflight readback contains unexpected $name."
  }
  $readbackFingerprint = Get-CanonicalSha256V1 -Value $readback
  Assert-BinderUnattendedConditionV1 (
    $readbackFingerprint -ceq $manifest.preapply_readback_sha256
  ) 'Preflight readback canonical hash differs from the manifest.'

  $backupDigestFields = @(
    'Path',
    'Sha256',
    'Kind',
    'VerifiedAtUtc',
    'RecoverableThroughUtc',
    'EvidenceReference',
    'RestorePathReviewed',
    'Operator'
  )
  $backupDigest = Read-BinderUnattendedJsonFileV1 `
    -Path (Join-Path $PreflightRoot 'backup-evidence.digest.json') `
    -RequiredTopLevelNames $backupDigestFields `
    -AllowedTopLevelNames $backupDigestFields
  foreach ($name in @(
    'Path',
    'Sha256',
    'Kind',
    'VerifiedAtUtc',
    'RecoverableThroughUtc',
    'EvidenceReference',
    'Operator'
  )) {
    Assert-BinderUnattendedConditionV1 (
      $backupDigest.PSObject.Properties[$name].Value -is [string]
    ) "Preflight backup digest $name must be a JSON string."
  }
  Assert-BinderUnattendedConditionV1 (
    $backupDigest.RestorePathReviewed -is [bool]
  ) 'Preflight backup digest RestorePathReviewed must be a JSON boolean.'
  Assert-BinderUnattendedConditionV1 (
    $backupEvidence.schema_version -is [long] -and
    $backupEvidence.project_ref -is [string] -and
    $backupEvidence.backup_kind -is [string] -and
    $backupEvidence.verified_at_utc -is [string] -and
    $backupEvidence.recoverable_through_utc -is [string] -and
    $backupEvidence.evidence_reference -is [string] -and
    $backupEvidence.restore_path_reviewed -is [bool] -and
    $backupEvidence.operator -is [string]
  ) 'Supervisor backup evidence primitive types are not exact.'
  $digestVerified = ConvertTo-BinderUnattendedUtcV1 `
    -Value ([string]$backupDigest.VerifiedAtUtc) `
    -Label 'Preflight backup digest verification time'
  $evidenceVerified = ConvertTo-BinderUnattendedUtcV1 `
    -Value ([string]$backupEvidence.verified_at_utc) `
    -Label 'Supervisor backup evidence verification time'
  $digestRecoverable = ConvertTo-BinderUnattendedUtcV1 `
    -Value ([string]$backupDigest.RecoverableThroughUtc) `
    -Label 'Preflight backup digest recovery time'
  $evidenceRecoverable = ConvertTo-BinderUnattendedUtcV1 `
    -Value ([string]$backupEvidence.recoverable_through_utc) `
    -Label 'Supervisor backup evidence recovery time'
  Assert-BinderUnattendedConditionV1 (
    $backupDigest.Path -ceq $BackupEvidencePath -and
    $backupDigest.Sha256 -ceq $actualBackupHash -and
    $backupDigest.Kind -ceq 'supabase_platform_backup' -and
    $digestVerified -eq $evidenceVerified -and
    $digestRecoverable -eq $evidenceRecoverable -and
    $backupDigest.EvidenceReference -ceq
      $backupEvidence.evidence_reference -and
    $backupDigest.RestorePathReviewed -eq
      $Authorization.restore_path_reviewed -and
    $backupDigest.Operator -ceq $Authorization.operator -and
    $backupEvidence.schema_version -eq 1 -and
    $backupEvidence.project_ref -ceq $Authorization.project_ref -and
    $backupEvidence.backup_kind -ceq
      'supabase_platform_backup' -and
    $backupEvidence.restore_path_reviewed -eq
      $Authorization.restore_path_reviewed -and
    $backupEvidence.operator -ceq $Authorization.operator
  ) 'Preflight backup digest differs from the authorized fresh evidence.'

  $approval = Read-BinderUnattendedStrictApprovalV1 `
    -Path (Join-Path $PreflightRoot 'approval.txt') `
    -Manifest $manifest
  return [pscustomobject][ordered]@{
    Status = 'pass'
    ManifestPath = $manifestPath
    ManifestFileSha256 = $manifestFileSha256
    ManifestFingerprintSha256 =
      $manifest.manifest_fingerprint_sha256
    BackupEvidenceSha256 = $actualBackupHash
    ApplyAck = $approval.ApplyAck
    BackupAck = $approval.BackupAck
    ChecksumFileSha256 = $checksum.ChecksumFileSha256
  }
}

function Open-BinderUnattendedFileSealsV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Paths
  )

  $streams = [System.Collections.Generic.List[System.IO.FileStream]]::new()
  $seen = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
  )
  try {
    foreach ($path in $Paths) {
      $fullPath = Assert-BinderUnattendedLocalPathV1 `
        -Path $path -Label 'Sealed rollout input' -RequiredType Leaf
      Assert-BinderUnattendedConditionV1 (
        $seen.Add($fullPath)
      ) 'Sealed rollout input list contains a duplicate path.'
      $streams.Add(
        [System.IO.File]::Open(
          $fullPath,
          [System.IO.FileMode]::Open,
          [System.IO.FileAccess]::Read,
          [System.IO.FileShare]::Read
        )
      )
    }
    return @($streams)
  } catch {
    foreach ($stream in $streams) {
      $stream.Dispose()
    }
    throw
  }
}

function Close-BinderUnattendedFileSealsV1 {
  param(
    [object[]]$Streams = @()
  )

  foreach ($stream in @($Streams)) {
    if ($null -ne $stream) {
      $stream.Dispose()
    }
  }
}

function Open-BinderUnattendedBundleSealsV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,
    [Parameter(Mandatory = $true)]
    [object]$SupabaseExecutable
  )

  $policy = Get-BinderUnattendedPolicyV1
  $paths = @(
    $policy.SupervisorModuleRelativePath,
    $policy.SupervisorEntrypointRelativePath,
    $policy.RolloutModuleRelativePath,
    $policy.PreflightEntrypointRelativePath,
    $policy.ApplyEntrypointRelativePath,
    $policy.PackageManifestRelativePath,
    $policy.PreflightSqlRelativePath,
    $policy.PostApplySqlRelativePath,
    $policy.RestoreProcedureRelativePath
  ) | ForEach-Object {
    [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $_))
  }
  $paths += @(
    $SupabaseExecutable.LauncherPath,
    $SupabaseExecutable.ShimDescriptorPath,
    $SupabaseExecutable.BinaryPath
  )
  $paths += @(
    (Join-Path $RepoRoot 'supabase/config.toml'),
    (Join-Path $RepoRoot 'supabase/.temp/project-ref'),
    (Join-Path $RepoRoot 'supabase/.temp/pooler-url'),
    (Join-Path $RepoRoot 'supabase/.temp/linked-project.json'),
    $policy.GitExecutablePath,
    $policy.GitHttpsHelperPath
  )
  $paths += @(
    Get-ChildItem -LiteralPath (
      Join-Path $RepoRoot 'supabase/migrations'
    ) -File -Filter '*.sql' |
      ForEach-Object FullName
  )
  return Open-BinderUnattendedFileSealsV1 -Paths $paths
}

function Open-BinderUnattendedPreflightArtifactSealsV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PreflightRoot,
    [Parameter(Mandatory = $true)]
    [string]$BackupEvidencePath
  )

  $policy = Get-BinderUnattendedPolicyV1
  $paths = @(
    foreach ($relative in $policy.PreflightArtifacts) {
      Join-Path $PreflightRoot $relative
    }
  )
  $paths += Join-Path $PreflightRoot 'checksums.sha256'
  $paths += $BackupEvidencePath
  return Open-BinderUnattendedFileSealsV1 -Paths $paths
}

function Wait-BinderUnattendedUntilV1 {
  param(
    [Parameter(Mandatory = $true)]
    [datetimeoffset]$TargetUtc,
    [Parameter(Mandatory = $true)]
    [datetimeoffset]$ExpiresUtc
  )

  while ([datetimeoffset]::UtcNow -lt $TargetUtc) {
    $now = [datetimeoffset]::UtcNow
    Assert-BinderUnattendedConditionV1 (
      $now -lt $ExpiresUtc
    ) 'Authorization expired while waiting for its not-before time.'
    $seconds = [math]::Min(
      60,
      [math]::Max(
        1,
        [math]::Ceiling(($TargetUtc - $now).TotalSeconds)
      )
    )
    Start-Sleep -Seconds $seconds
  }
}

function Test-BinderUnattendedLiveSourceV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [object]$Authorization,
    [string]$RepoRoot = (Get-BinderUnattendedRepoRootV1)
  )

  $policy = Get-BinderUnattendedPolicyV1
  [void](Test-BinderUnattendedBundleV1 `
    -Authorization $Authorization -RepoRoot $RepoRoot)
  $modulePath = Join-Path $RepoRoot $policy.RolloutModuleRelativePath
  Import-Module $modulePath -Force
  $source = Test-BinderSourceV1 -RepoRoot $RepoRoot
  Assert-BinderUnattendedConditionV1 (
    $source.Status -ceq 'pass' -and
    $source.PackageId -ceq $Authorization.package_id -and
    $source.PackageFingerprintSha256 -ceq
      $Authorization.package_fingerprint_sha256 -and
    $source.PackageManifestFileSha256 -ceq
      $Authorization.package_manifest_sha256 -and
    $source.ProjectRef -ceq $Authorization.project_ref -and
    $source.SupabaseCliVersion -ceq
      $Authorization.supabase_cli_version -and
    $source.SupabaseCliLauncherSha256 -ceq
      $Authorization.supabase_cli_launcher_sha256 -and
    $source.SupabaseCliBinarySha256 -ceq
      $Authorization.supabase_cli_binary_sha256 -and
    $source.SupabaseCliShimDescriptorSha256 -ceq
      $Authorization.supabase_cli_shim_descriptor_sha256 -and
    $source.TrackedMigrationCount -eq
      $Authorization.tracked_migration_count -and
    $source.TrackedMigrationSetSha256 -ceq
      $Authorization.tracked_migration_set_sha256
  ) 'Live source identity differs from the authorization envelope.'
  $repository = Assert-BinderRepositoryStateV1 `
    -RepoRoot $RepoRoot `
    -ExpectedHeadSha $Authorization.reviewed_main_sha
  Assert-BinderUnattendedConditionV1 (
    $repository.GitCommonConfigSha256 -ceq
      $Authorization.git_common_config_sha256 -and
    $repository.GitMetadataCount -eq
      $Authorization.git_metadata_count -and
    $repository.GitMetadataSha256 -ceq
      $Authorization.git_metadata_sha256
  ) 'Live repository Git metadata differs from signed authorization.'
  foreach ($entry in @(
    @(
      'supabase/.temp/project-ref',
      $Authorization.linked_project_ref_sha256
    ),
    @(
      'supabase/.temp/pooler-url',
      $Authorization.linked_pooler_url_sha256
    ),
    @(
      'supabase/.temp/linked-project.json',
      $Authorization.linked_project_metadata_sha256
    )
  )) {
    $path = [System.IO.Path]::GetFullPath(
      (Join-Path $RepoRoot ([string]$entry[0]))
    )
    [void](Assert-BinderUnattendedLocalPathV1 `
      -Path $path -Label 'Linked Supabase identity' `
      -RequiredType Leaf)
    Assert-BinderUnattendedConditionV1 (
      (Get-BinderUnattendedSha256FileV1 -Path $path) -ceq
        [string]$entry[1]
    ) 'Linked Supabase identity differs from signed authorization.'
  }
  Assert-BinderUnattendedConditionV1 (
    $env:SUPABASE_URL -ceq $Authorization.project_url
  ) 'SUPABASE_URL is not the exact authorized production project origin.'
  return $source
}

function Wait-BinderUnattendedBackupV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [object]$Authorization,
    [Parameter(Mandatory = $true)]
    [datetimeoffset]$PollDeadlineUtc,
    [string]$RepoRoot = (Get-BinderUnattendedRepoRootV1)
  )

  $policy = Get-BinderUnattendedPolicyV1
  $modulePath = Join-Path $RepoRoot $policy.RolloutModuleRelativePath
  Import-Module $modulePath -Force
  $pollCount = 0
  while ([datetimeoffset]::UtcNow -lt $PollDeadlineUtc) {
    $pollCount += 1
    $firstResult = Invoke-BinderPhysicalBackupListV1 `
      -RepoRoot $RepoRoot
    Assert-BinderUnattendedConditionV1 (
      $firstResult.Status -ceq 'pass' -and
      $firstResult.ExitCode -eq 0 -and
      $firstResult.TimedOut -eq $false -and
      $firstResult.ProcessTreeTerminationConfirmed -eq $true -and
      $firstResult.OutputTruncated -eq $false
    ) 'Contained physical-backup listing did not complete exactly.'
    $first = Read-BinderBackupConfirmationV1 `
      -Json $firstResult.StdOut `
      -ProjectRef $Authorization.project_ref `
      -BackupNotBeforeUtc $Authorization.backup_not_before_utc
    if ($first.Status -ceq 'candidate') {
      Assert-BinderUnattendedConditionV1 (
        [datetimeoffset]::UtcNow.AddSeconds(
          $policy.BackupConfirmationSeconds
        ) -lt $PollDeadlineUtc
      ) 'Backup confirmation cannot finish before the polling deadline.'
      Start-Sleep -Seconds $policy.BackupConfirmationSeconds
      $secondResult = Invoke-BinderPhysicalBackupListV1 `
        -RepoRoot $RepoRoot
      Assert-BinderUnattendedConditionV1 (
        $secondResult.Status -ceq 'pass' -and
        $secondResult.ExitCode -eq 0 -and
        $secondResult.TimedOut -eq $false -and
        $secondResult.ProcessTreeTerminationConfirmed -eq $true -and
        $secondResult.OutputTruncated -eq $false
      ) 'Second contained physical-backup listing did not complete exactly.'
      $second = Read-BinderBackupConfirmationV1 `
        -Json $secondResult.StdOut `
        -ProjectRef $Authorization.project_ref `
        -BackupNotBeforeUtc $Authorization.backup_not_before_utc
      Assert-BinderUnattendedConditionV1 (
        [datetimeoffset]::UtcNow -lt $PollDeadlineUtc
      ) (
        'Second physical-backup confirmation completed after the signed ' +
        'polling deadline.'
      ) 'safe_stop_pre_mutation'
      Assert-BinderUnattendedConditionV1 (
        $second.Status -ceq 'candidate' -and
        $second.BackupKey -ceq $first.BackupKey -and
        $second.ResponseFingerprintSha256 -ceq
          $first.ResponseFingerprintSha256
      ) (
        'Physical-backup confirmations were not identical; refusing an ' +
        'ambiguous or changing recovery point.'
      ) 'safe_stop_pre_mutation'
      return [pscustomobject][ordered]@{
        Status = 'confirmed'
        ProjectRef = $Authorization.project_ref
        InsertedAtUtc = $second.InsertedAtUtc
        BackupKey = $second.BackupKey
        ResponseFingerprintSha256 =
          $second.ResponseFingerprintSha256
        Region = $second.Region
        Confirmations = 2
        PollCount = $pollCount + 1
        VerifiedAtUtc = [datetimeoffset]::UtcNow.ToString('o')
      }
    }
    $remaining = (
      $PollDeadlineUtc - [datetimeoffset]::UtcNow
    ).TotalSeconds
    if ($remaining -gt 0) {
      Start-Sleep -Seconds (
        [math]::Min($policy.BackupPollSeconds, [math]::Max(1, $remaining))
      )
    }
  }
  Stop-BinderUnattendedV1 `
    -ExitClass 'safe_stop_pre_mutation' `
    -Message 'No eligible physical backup was confirmed before the signed deadline.'
}

function New-BinderUnattendedBackupEvidenceV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Authorization,
    [Parameter(Mandatory = $true)]
    [object]$BackupConfirmation,
    [Parameter(Mandatory = $true)]
    [string]$SupervisorArtifactRoot
  )

  $evidence = [ordered]@{
    schema_version = 1
    project_ref = $Authorization.project_ref
    backup_kind = 'supabase_platform_backup'
    verified_at_utc = $BackupConfirmation.VerifiedAtUtc
    recoverable_through_utc = $BackupConfirmation.InsertedAtUtc
    evidence_reference = (
      'Supabase CLI 2.90.0 physical backups list; two identical ' +
      'COMPLETED confirmations; backup key ' +
      $BackupConfirmation.BackupKey + '; response sha256 ' +
      $BackupConfirmation.ResponseFingerprintSha256
    )
    restore_path_reviewed = [bool]$Authorization.restore_path_reviewed
    operator = [string]$Authorization.operator
  }
  $json = $evidence | ConvertTo-Json -Depth 8
  $path = Join-Path $SupervisorArtifactRoot 'backup-evidence.json'
  [void](Write-BinderUnattendedCreateNewDurableV1 `
    -Path $path `
    -Bytes (
      [System.Text.UTF8Encoding]::new($false).GetBytes(
        $json + [Environment]::NewLine
      )
    ))
  return [pscustomobject][ordered]@{
    Path = $path
    Sha256 = Get-BinderUnattendedSha256FileV1 -Path $path
    Data = [pscustomobject]$evidence
  }
}

function Assert-BinderUnattendedFinalLiveBackupV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [object]$Authorization,
    [Parameter(Mandatory = $true)]
    [object]$OriginalConfirmation,
    [Parameter(Mandatory = $true)]
    [object]$AuthorizationTimes,
    [string]$RepoRoot = (Get-BinderUnattendedRepoRootV1)
  )

  $policy = Get-BinderUnattendedPolicyV1
  $rolloutModulePath = Join-Path (
    $RepoRoot
  ) $policy.RolloutModuleRelativePath
  Import-Module $rolloutModulePath -Force
  $result = Invoke-BinderPhysicalBackupListV1 -RepoRoot $RepoRoot
  Assert-BinderUnattendedConditionV1 (
    $result.Status -ceq 'pass' -and
    $result.ProjectRef -ceq $Authorization.project_ref -and
    $result.ExitCode -eq 0 -and
    $result.TimedOut -eq $false -and
    $result.ProcessTreeTerminationConfirmed -eq $true -and
    $result.OutputTruncated -eq $false
  ) (
    'Final contained physical-backup listing did not complete exactly.'
  ) 'safe_stop_pre_mutation'
  $observed = Read-BinderBackupConfirmationV1 `
    -Json $result.StdOut `
    -ProjectRef $Authorization.project_ref `
    -BackupNotBeforeUtc $Authorization.backup_not_before_utc
  Assert-BinderUnattendedConditionV1 (
    $observed.Status -ceq 'candidate' -and
    $observed.BackupKey -ceq $OriginalConfirmation.BackupKey -and
    $observed.ResponseFingerprintSha256 -ceq
      $OriginalConfirmation.ResponseFingerprintSha256 -and
    $observed.Region -ceq $policy.BackupExpectedRegion
  ) (
    'The final live backup candidate, response, mode, or region drifted ' +
    'after its two signed-window confirmations.'
  ) 'safe_stop_pre_mutation'
  $now = [datetimeoffset]::UtcNow
  $recoverable = ConvertTo-BinderUnattendedUtcV1 `
    -Value $observed.InsertedAtUtc `
    -Label 'Final live physical backup recovery point'
  $maximumAgeWithReserve = (
    $policy.BackupGuardMaximumAgeMinutes -
    $policy.BackupApplyReserveMinutes
  )
  Assert-BinderUnattendedConditionV1 (
    $now -lt $AuthorizationTimes.MutationDeadlineUtc -and
    $now -lt $AuthorizationTimes.ExpiresAtUtc -and
    $recoverable -le $now -and
    $recoverable -ge $now.AddMinutes(-$maximumAgeWithReserve)
  ) (
    'The final live backup observation exhausted the signed outer ' +
    'apply-launch deadline or five-minute backup reserve.'
  ) 'safe_stop_pre_mutation'
  return [pscustomobject][ordered]@{
    Status = 'pass'
    BackupKey = $observed.BackupKey
    ResponseFingerprintSha256 =
      $observed.ResponseFingerprintSha256
    ObservedAtUtc = $now.ToString('o')
  }
}

function ConvertFrom-BinderUnattendedJsonTextV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Json,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $document = $null
  try {
    $document = [System.Text.Json.JsonDocument]::Parse($Json)
    Assert-BinderUnattendedNoJsonCollisionsV1 `
      -Element $document.RootElement -Label $Label
    return ConvertFrom-BinderUnattendedJsonElementV1 `
      -Element $document.RootElement
  } catch {
    if ($_.Exception.Data.Contains('BinderSupervisorExitClass')) {
      throw
    }
    Stop-BinderUnattendedV1 `
      -ExitClass 'mutation_possible_stop' `
      -Message "$Label is not strict JSON."
  } finally {
    if ($null -ne $document) {
      $document.Dispose()
    }
  }
}

function Test-BinderUnattendedApplyResultV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Result,
    [Parameter(Mandatory = $true)]
    [object]$Authorization
  )

  $fields = @(
    'status',
    'package_id',
    'project_ref',
    'head_sha',
    'package_fingerprint_sha256',
    'completed_at_utc',
    'push_attempted',
    'push_started',
    'push_started_at_utc',
    'push_supervisor_process_id',
    'push_ended_at_utc',
    'push_succeeded',
    'push_timed_out',
    'push_kill_attempted',
    'push_kill_request_succeeded',
    'push_kill_request_error',
    'push_root_exited',
    'push_process_tree_empty',
    'push_termination_confirmed',
    'push_exit_code',
    'push_output_capture_completed',
    'push_stdout_truncated',
    'push_stderr_truncated',
    'mutation_possible',
    'feature_flags_enabled',
    'excluded_flags'
  )
  Assert-BinderUnattendedObjectPropertySetV1 `
    -Value $Result -ExpectedNames $fields `
    -Label 'Guarded apply result'
  foreach ($name in @(
    'push_attempted',
    'push_started',
    'push_succeeded',
    'push_timed_out',
    'push_kill_attempted',
    'push_root_exited',
    'push_process_tree_empty',
    'push_termination_confirmed',
    'push_output_capture_completed',
    'push_stdout_truncated',
    'push_stderr_truncated',
    'mutation_possible'
  )) {
    Assert-BinderUnattendedConditionV1 (
      $Result.($name) -is [bool]
    ) "Guarded apply result $name must be a JSON boolean."
  }
  foreach ($name in @(
    'push_supervisor_process_id',
    'push_exit_code',
    'feature_flags_enabled'
  )) {
    Assert-BinderUnattendedConditionV1 (
      $Result.($name) -is [long]
    ) "Guarded apply result $name must be a JSON integer."
  }
  foreach ($name in @(
    'status',
    'package_id',
    'project_ref',
    'head_sha',
    'package_fingerprint_sha256',
    'completed_at_utc',
    'push_started_at_utc',
    'push_ended_at_utc'
  )) {
    Assert-BinderUnattendedConditionV1 (
      $Result.($name) -is [string] -and
      -not [string]::IsNullOrWhiteSpace($Result.($name))
    ) "Guarded apply result $name must be a nonempty JSON string."
  }
  Assert-BinderUnattendedConditionV1 (
    $null -eq $Result.push_kill_request_succeeded -and
    $null -eq $Result.push_kill_request_error -and
    $Result.excluded_flags -is [object[]]
  ) (
    'Guarded apply result must show no kill request and an exact JSON ' +
    'excluded-flags array.'
  ) 'mutation_possible_stop'
  [void](ConvertTo-BinderUnattendedUtcV1 `
    -Value $Result.completed_at_utc `
    -Label 'Guarded apply completion time')
  [void](ConvertTo-BinderUnattendedUtcV1 `
    -Value $Result.push_started_at_utc `
    -Label 'Guarded apply process start time')
  [void](ConvertTo-BinderUnattendedUtcV1 `
    -Value $Result.push_ended_at_utc `
    -Label 'Guarded apply process end time')
  Assert-BinderUnattendedConditionV1 (
    $Result.status -ceq 'pass' -and
    $Result.package_id -ceq $Authorization.package_id -and
    $Result.project_ref -ceq $Authorization.project_ref -and
    $Result.head_sha -ceq $Authorization.reviewed_main_sha -and
    $Result.package_fingerprint_sha256 -ceq
      $Authorization.package_fingerprint_sha256 -and
    $Result.push_attempted -ceq $true -and
    $Result.push_started -ceq $true -and
    $Result.push_succeeded -ceq $true -and
    $Result.push_timed_out -ceq $false -and
    $Result.push_kill_attempted -ceq $false -and
    $Result.push_root_exited -ceq $true -and
    $Result.push_process_tree_empty -ceq $true -and
    $Result.push_termination_confirmed -ceq $true -and
    $Result.push_exit_code -ceq 0L -and
    $Result.push_output_capture_completed -ceq $true -and
    $Result.push_stdout_truncated -ceq $false -and
    $Result.push_stderr_truncated -ceq $false -and
    $Result.mutation_possible -ceq $true -and
    $Result.feature_flags_enabled -ceq 0L
  ) (
    'Guarded apply did not return exact pass, contained termination, ' +
    'complete output, and zero enabled flags.'
  ) 'mutation_possible_stop'
  Assert-BinderUnattendedArrayEqualV1 `
    -Actual @($Result.excluded_flags) `
    -Expected @((Get-BinderUnattendedPolicyV1).ExcludedFlags) `
    -Label 'Guarded apply excluded flags'
  return $true
}

function Write-BinderUnattendedTerminalV1 {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
      'pass_applied_verified',
      'safe_stop_pre_mutation',
      'local_integrity_stop',
      'mutation_possible_stop'
    )]
    [string]$ExitClass,
    [Parameter(Mandatory = $true)]
    [string]$Phase,
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [Parameter(Mandatory = $true)]
    [object]$Authorization,
    [Parameter(Mandatory = $true)]
    [string]$AuthorizationSha256,
    [Parameter(Mandatory = $true)]
    [string]$StateRoot,
    [Parameter(Mandatory = $true)]
    [string]$SupervisorArtifactRoot,
    [bool]$AttemptClaimWriteStarted,
    [Parameter(Mandatory = $true)]
    [ValidateSet('present', 'absent', 'unknown')]
    [string]$AttemptMarkerState,
    [bool]$MutationClaimWriteStarted,
    [Parameter(Mandatory = $true)]
    [ValidateSet('present', 'absent', 'unknown')]
    [string]$MutationMarkerState,
    [string]$BackupEvidenceSha256 = '',
    [string]$PreflightManifestSha256 = ''
  )

  $terminal = [ordered]@{
    schema_version = 1
    status = if ($ExitClass -ceq 'pass_applied_verified') {
      'pass'
    } else {
      'stop'
    }
    exit_class = $ExitClass
    phase = $Phase
    message = Protect-BinderUnattendedTextV1 -Text $Message
    recorded_at_utc = [datetimeoffset]::UtcNow.ToString('o')
    project_ref = $Authorization.project_ref
    package_id = $Authorization.package_id
    package_fingerprint_sha256 =
      $Authorization.package_fingerprint_sha256
    authorization_id = $Authorization.authorization_id
    authorization_sha256 = $AuthorizationSha256
    reviewed_main_sha = $Authorization.reviewed_main_sha
    attempt_claim_write_started = $AttemptClaimWriteStarted
    attempt_marker_state = $AttemptMarkerState
    attempt_claimed = $AttemptMarkerState -ceq 'present'
    mutation_claim_write_started = $MutationClaimWriteStarted
    mutation_marker_state = $MutationMarkerState
    mutation_launch_committed = $MutationMarkerState -ceq 'present'
    backup_evidence_sha256 = $BackupEvidenceSha256
    preflight_manifest_sha256 = $PreflightManifestSha256
    automatic_retry_permitted = $false
    feature_flag_writes_attempted = $false
    feature_flags_verified_enabled_count =
      if ($ExitClass -ceq 'pass_applied_verified') { 0 } else { $null }
    deployment_performed = $false
  }
  $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes(
    ($terminal | ConvertTo-Json -Compress -Depth 8)
  )
  [void](Write-BinderUnattendedCreateNewDurableV1 `
    -Path (Join-Path $StateRoot 'TERMINAL') `
    -Bytes $bytes)
  [void](Write-BinderUnattendedCreateNewDurableV1 `
    -Path (Join-Path $SupervisorArtifactRoot 'terminal.json') `
    -Bytes $bytes)
  return [pscustomobject]$terminal
}

# The public entry point intentionally accepts no executable, repository,
# command, project, state, artifact, acknowledgement, hook, or passthrough
# parameters. All authority is inside the byte-hash-pinned external envelope.
function Invoke-BinderUnattendedSupervisorV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$AuthorizationPath,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedAuthorizationSha256
  )

  $repoRoot = Get-BinderUnattendedRepoRootV1
  $policy = Get-BinderUnattendedPolicyV1
  $savedEnvironment = $null
  $mutex = $null
  $wakeLock = $false
  $authorizationEnvelope = $null
  $authorization = $null
  $secureRoots = $null
  $supervisorArtifactRoot = $null
  $bundleSeals = @()
  $gitMetadataSeals = @()
  $backupSeals = @()
  $preflightSeals = @()
  $attemptClaimWriteStarted = $false
  $attemptMarkerState = 'absent'
  $mutationCommitted = $false
  $mutationClaimWriteStarted = $false
  $mutationMarkerState = 'absent'
  $backupEvidenceSha256 = ''
  $preflightManifestSha256 = ''
  $supabaseExecutable = $null
  $phase = 'startup'

  try {
    $savedEnvironment =
      Enter-BinderUnattendedSanitizedEnvironmentV1
    $mutex = New-BinderUnattendedMutexV1
    $wakeLock = Enter-BinderUnattendedWakeLockV1
    [void](Assert-BinderUnattendedAcPowerV1)

    $phase = 'authorization'
    $authorizationEnvelope = Open-BinderUnattendedAuthorizationV1 `
      -AuthorizationPath $AuthorizationPath `
      -ExpectedAuthorizationSha256 $ExpectedAuthorizationSha256 `
      -RepoRoot $repoRoot
    $authorization = $authorizationEnvelope.Data
    $issued = ConvertTo-BinderUnattendedUtcV1 `
      -Value $authorization.issued_at_utc `
      -Label 'Authorization issued time'
    $notBefore = ConvertTo-BinderUnattendedUtcV1 `
      -Value $authorization.not_before_utc `
      -Label 'Authorization not-before time'
    $expires = ConvertTo-BinderUnattendedUtcV1 `
      -Value $authorization.expires_at_utc `
      -Label 'Authorization expiry time'
    Assert-BinderUnattendedConditionV1 (
      $issued -le [datetimeoffset]::UtcNow.AddMinutes(5) -and
      [datetimeoffset]::UtcNow -lt $expires
    ) 'Authorization is not valid for unattended waiting.'
    [void](Test-BinderUnattendedAuthorizationV1 `
      -Authorization $authorization `
      -NowUtc $notBefore)

    $phase = 'signed_bundle_bootstrap'
    [void](Test-BinderUnattendedBundleV1 `
      -Authorization $authorization -RepoRoot $repoRoot)
    $supabaseExecutable =
      Get-BinderUnattendedSupabaseExecutableV1 `
        -Authorization $authorization
    $bundleSeals = Open-BinderUnattendedBundleSealsV1 `
      -RepoRoot $repoRoot `
      -SupabaseExecutable $supabaseExecutable
    $sealedSupabaseExecutable =
      Get-BinderUnattendedSupabaseExecutableV1 `
        -Authorization $authorization
    Assert-BinderUnattendedConditionV1 (
      $sealedSupabaseExecutable.LauncherPath -ceq
        $supabaseExecutable.LauncherPath -and
      $sealedSupabaseExecutable.ShimDescriptorPath -ceq
        $supabaseExecutable.ShimDescriptorPath -and
      $sealedSupabaseExecutable.BinaryPath -ceq
        $supabaseExecutable.BinaryPath
    ) 'Supabase CLI path identity changed under retained seals.'
    [void](Test-BinderUnattendedBundleV1 `
      -Authorization $authorization -RepoRoot $repoRoot)
    $rolloutModulePath = Join-Path (
      $repoRoot
    ) $policy.RolloutModuleRelativePath
    Import-Module $rolloutModulePath -Force -ErrorAction Stop
    $gitSeal = Open-BinderGitMetadataSealV1 -RepoRoot $repoRoot
    Assert-BinderUnattendedConditionV1 (
      $gitSeal.Guard.ExecutablePath -ceq
        $authorization.git_executable_path -and
      $gitSeal.Guard.ExecutableSha256 -ceq
        $authorization.git_executable_sha256 -and
      $gitSeal.Guard.Version -ceq $authorization.git_version -and
      $gitSeal.Guard.ExecPath -ceq
        $authorization.git_exec_path -and
      $gitSeal.Guard.HttpsHelperPath -ceq
        $authorization.git_https_helper_path -and
      $gitSeal.Guard.HttpsHelperSha256 -ceq
        $authorization.git_https_helper_sha256 -and
      $gitSeal.Guard.CommonConfigSha256 -ceq
        $authorization.git_common_config_sha256 -and
      $gitSeal.Guard.MetadataCount -eq
        $authorization.git_metadata_count -and
      $gitSeal.Guard.MetadataSha256 -ceq
        $authorization.git_metadata_sha256
    ) 'Sealed Git identity differs from signed authorization.'
    $gitMetadataSeals = @($gitSeal.Streams)
    [void](Assert-BinderUnattendedOutsideEveryWorktreeV1 `
      -Path $authorizationEnvelope.Path `
      -RepoRoot $repoRoot `
      -Label 'AuthorizationPath')

    $phase = 'secure_state_early'
    $secureRoots = Initialize-BinderUnattendedSecureRootsV1 `
      -Authorization $authorization
    Assert-BinderUnattendedStateAvailableV1 `
      -StateRoot $secureRoots.StateRoot
    [void](Assert-BinderUnattendedOutsideEveryWorktreeV1 `
      -Path $secureRoots.StateRoot `
      -RepoRoot $repoRoot `
      -Label 'Stable supervisor state root')
    [void](Assert-BinderUnattendedOutsideEveryWorktreeV1 `
      -Path $secureRoots.ArtifactNamespaceRoot `
      -RepoRoot $repoRoot `
      -Label 'Supervisor artifact namespace')

    $phase = 'not_before_wait'
    Wait-BinderUnattendedUntilV1 `
      -TargetUtc $notBefore `
      -ExpiresUtc $expires
    [void](Test-BinderUnattendedAuthorizationV1 `
      -Authorization $authorization)
    [void](Assert-BinderUnattendedAcPowerV1)

    $phase = 'secure_state_recheck'
    Assert-BinderUnattendedStateAvailableV1 `
      -StateRoot $secureRoots.StateRoot
    [void](New-BinderUnattendedArtifactRunRootV1 `
      -ArtifactRoot $authorization.artifact_root)
    [void](Assert-BinderUnattendedOutsideEveryWorktreeV1 `
      -Path $authorization.artifact_root `
      -RepoRoot $repoRoot `
      -Label 'Supervisor artifact run root')
    $supervisorArtifactRoot =
      New-BinderUnattendedPrivateDirectoryV1 `
        -Path (Join-Path $authorization.artifact_root 'supervisor')

    $phase = 'source_before_backup'
    [void](Test-BinderUnattendedLiveSourceV1 `
      -Authorization $authorization -RepoRoot $repoRoot)

    $phase = 'backup_poll'
    $authorizationTimes = Test-BinderUnattendedAuthorizationV1 `
      -Authorization $authorization
    $backupConfirmation = Wait-BinderUnattendedBackupV1 `
      -Authorization $authorization `
      -PollDeadlineUtc $authorizationTimes.BackupPollDeadlineUtc `
      -RepoRoot $repoRoot
    Assert-BinderUnattendedConditionV1 (
      $backupConfirmation.Confirmations -eq 2
    ) 'Physical backup did not receive exactly two confirmations.'
    $backupEvidence = New-BinderUnattendedBackupEvidenceV1 `
      -Authorization $authorization `
      -BackupConfirmation $backupConfirmation `
      -SupervisorArtifactRoot $supervisorArtifactRoot
    $backupEvidenceSha256 = $backupEvidence.Sha256
    $backupSeals = Open-BinderUnattendedFileSealsV1 `
      -Paths @($backupEvidence.Path)

    $phase = 'preflight_claim'
    [void](Test-BinderUnattendedLiveSourceV1 `
      -Authorization $authorization -RepoRoot $repoRoot)
    $attemptClaimWriteStarted = $true
    [void](New-BinderUnattendedClaimV1 `
      -Kind attempt `
      -Authorization $authorization `
      -AuthorizationSha256 $authorizationEnvelope.Sha256 `
      -StateRoot $secureRoots.StateRoot `
      -PreflightManifestSha256 ('0' * 64))
    $attemptMarkerState = 'present'

    $phase = 'preflight'
    $preflightRoot = Join-Path (
      $authorization.artifact_root
    ) 'preflight'
    $preflightEntrypoint = Join-Path (
      $repoRoot
    ) $policy.PreflightEntrypointRelativePath
    & $preflightEntrypoint `
      -ExpectedHeadSha $authorization.reviewed_main_sha `
      -BackupEvidencePath $backupEvidence.Path `
      -ArtifactRoot $preflightRoot |
      Out-Null

    $phase = 'artifact_review'
    $firstReview = Test-BinderUnattendedPreflightArtifactsV1 `
      -PreflightRoot $preflightRoot `
      -Authorization $authorization `
      -BackupEvidencePath $backupEvidence.Path `
      -RepoRoot $repoRoot
    $preflightSeals =
      Open-BinderUnattendedPreflightArtifactSealsV1 `
        -PreflightRoot $preflightRoot `
        -BackupEvidencePath $backupEvidence.Path
    $secondReview = Test-BinderUnattendedPreflightArtifactsV1 `
      -PreflightRoot $preflightRoot `
      -Authorization $authorization `
      -BackupEvidencePath $backupEvidence.Path `
      -RepoRoot $repoRoot
    Assert-BinderUnattendedConditionV1 (
      $firstReview.ManifestFileSha256 -ceq
        $secondReview.ManifestFileSha256 -and
      $firstReview.ManifestFingerprintSha256 -ceq
        $secondReview.ManifestFingerprintSha256 -and
      $firstReview.ChecksumFileSha256 -ceq
        $secondReview.ChecksumFileSha256 -and
      $firstReview.ApplyAck -ceq $secondReview.ApplyAck -and
      $firstReview.BackupAck -ceq $secondReview.BackupAck
    ) 'Preflight artifacts changed while the retained seals were opening.'
    $preflightManifestSha256 =
      $secondReview.ManifestFileSha256

    $phase = 'pre_apply_gate'
    [void](Test-BinderUnattendedAuthorizationV1 `
      -Authorization $authorization)
    [void](Test-BinderUnattendedLiveSourceV1 `
      -Authorization $authorization -RepoRoot $repoRoot)
    [void](Test-BackupEvidenceV1 `
      -Path $backupEvidence.Path -RepoRoot $repoRoot)
    [void](Assert-BinderUnattendedAcPowerV1)
    $now = [datetimeoffset]::UtcNow
    $recoverable = ConvertTo-BinderUnattendedUtcV1 `
      -Value $backupConfirmation.InsertedAtUtc `
      -Label 'Confirmed physical backup recovery point'
    $maximumAgeWithReserve = (
      $policy.BackupGuardMaximumAgeMinutes -
      $policy.BackupApplyReserveMinutes
    )
    Assert-BinderUnattendedConditionV1 (
      $now -lt $authorizationTimes.MutationDeadlineUtc -and
      $now -lt $authorizationTimes.ExpiresAtUtc -and
      $recoverable -le $now -and
      $recoverable -ge $now.AddMinutes(-$maximumAgeWithReserve)
    ) (
      'The signed outer apply-launch deadline or five-minute backup ' +
      'reserve was exhausted before mutation authorization.'
    ) 'safe_stop_pre_mutation'
    [void](Test-BinderUnattendedLiveSourceV1 `
      -Authorization $authorization -RepoRoot $repoRoot)
    [void](Assert-BinderUnattendedFinalLiveBackupV1 `
      -Authorization $authorization `
      -OriginalConfirmation $backupConfirmation `
      -AuthorizationTimes $authorizationTimes `
      -RepoRoot $repoRoot)
    [void](Assert-BinderUnattendedAcPowerV1)

    $phase = 'mutation_launch_commit'
    # Once mutation-marker creation is attempted, classification is
    # deliberately conservative. CreateNew+Flush(true) can succeed even if
    # a subsequent local validation or return path fails.
    $mutationClaimWriteStarted = $true
    [void](New-BinderUnattendedClaimV1 `
      -Kind mutation `
      -Authorization $authorization `
      -AuthorizationSha256 $authorizationEnvelope.Sha256 `
      -StateRoot $secureRoots.StateRoot `
      -PreflightManifestSha256 $preflightManifestSha256)
    $mutationCommitted = $true
    $mutationMarkerState = 'present'

    $phase = 'guarded_apply'
    $env:GROOKAI_BINDER_PROD_APPLY_ACK = $secondReview.ApplyAck
    $env:GROOKAI_BINDER_PROD_BACKUP_ACK = $secondReview.BackupAck
    $env:GROOKAI_BINDER_PROD_MUTATION_NOT_AFTER_UTC =
      [string]$authorization.mutation_deadline_utc
    $env:GROOKAI_BINDER_PROD_AUTH_EXPIRES_AT_UTC =
      [string]$authorization.expires_at_utc
    try {
      $applyEntrypoint = Join-Path (
        $repoRoot
      ) $policy.ApplyEntrypointRelativePath
      $applyOutput = & $applyEntrypoint `
        -ManifestPath $secondReview.ManifestPath `
        -ConfirmProduction `
        -Confirm:$false
    } finally {
      Remove-Item Env:GROOKAI_BINDER_PROD_APPLY_ACK `
        -ErrorAction SilentlyContinue
      Remove-Item Env:GROOKAI_BINDER_PROD_BACKUP_ACK `
        -ErrorAction SilentlyContinue
      Remove-Item Env:GROOKAI_BINDER_PROD_MUTATION_NOT_AFTER_UTC `
        -ErrorAction SilentlyContinue
      Remove-Item Env:GROOKAI_BINDER_PROD_AUTH_EXPIRES_AT_UTC `
        -ErrorAction SilentlyContinue
    }
    $applyJson = (@($applyOutput) -join [Environment]::NewLine)
    $applyResult = ConvertFrom-BinderUnattendedJsonTextV1 `
      -Json $applyJson -Label 'Guarded apply result'
    [void](Test-BinderUnattendedApplyResultV1 `
      -Result $applyResult `
      -Authorization $authorization)

    $phase = 'terminal_pass'
    $terminal = Write-BinderUnattendedTerminalV1 `
      -ExitClass pass_applied_verified `
      -Phase $phase `
      -Message 'Guarded apply and mandatory post-apply readback passed.' `
      -Authorization $authorization `
      -AuthorizationSha256 $authorizationEnvelope.Sha256 `
      -StateRoot $secureRoots.StateRoot `
      -SupervisorArtifactRoot $supervisorArtifactRoot `
      -AttemptClaimWriteStarted $attemptClaimWriteStarted `
      -AttemptMarkerState $attemptMarkerState `
      -MutationClaimWriteStarted $mutationClaimWriteStarted `
      -MutationMarkerState $mutationMarkerState `
      -BackupEvidenceSha256 $backupEvidenceSha256 `
      -PreflightManifestSha256 $preflightManifestSha256
    return [pscustomobject][ordered]@{
      status = 'pass'
      exit_class = 'pass_applied_verified'
      project_ref = $authorization.project_ref
      package_id = $authorization.package_id
      reviewed_main_sha = $authorization.reviewed_main_sha
      authorization_sha256 = $authorizationEnvelope.Sha256
      artifact_root = $authorization.artifact_root
      terminal_recorded_at_utc = $terminal.recorded_at_utc
      feature_flags_enabled = 0
      automatic_retry_permitted = $false
    }
  } catch {
    $caught = $_
    if ($null -ne $secureRoots) {
      try {
        $attemptMarkerState = if (Test-Path -LiteralPath (
          Join-Path $secureRoots.StateRoot $policy.AttemptClaimFileName
        )) {
          'present'
        } else {
          'absent'
        }
      } catch {
        $attemptMarkerState = 'unknown'
      }
      try {
        $mutationMarkerState = if (Test-Path -LiteralPath (
          Join-Path $secureRoots.StateRoot $policy.MutationClaimFileName
        )) {
          'present'
        } else {
          'absent'
        }
      } catch {
        $mutationMarkerState = 'unknown'
      }
    }
    $exitClass = [string]$caught.Exception.Data[
      'BinderSupervisorExitClass'
    ]
    if (
      $mutationCommitted -or
      $mutationClaimWriteStarted -or
      $mutationMarkerState -ceq 'present'
    ) {
      $exitClass = 'mutation_possible_stop'
    } elseif ([string]::IsNullOrWhiteSpace($exitClass)) {
      $exitClass = 'local_integrity_stop'
    }
    $safeMessage = Protect-BinderUnattendedTextV1 `
      -Text $caught.Exception.Message
    if (
      $null -ne $secureRoots -and
      -not [string]::IsNullOrWhiteSpace($supervisorArtifactRoot) -and
      $null -ne $authorization
    ) {
      try {
        [void](Write-BinderUnattendedTerminalV1 `
          -ExitClass $exitClass `
          -Phase $phase `
          -Message $safeMessage `
          -Authorization $authorization `
          -AuthorizationSha256 $ExpectedAuthorizationSha256 `
          -StateRoot $secureRoots.StateRoot `
          -SupervisorArtifactRoot $supervisorArtifactRoot `
          -AttemptClaimWriteStarted $attemptClaimWriteStarted `
          -AttemptMarkerState $attemptMarkerState `
          -MutationClaimWriteStarted $mutationClaimWriteStarted `
          -MutationMarkerState $mutationMarkerState `
          -BackupEvidenceSha256 $backupEvidenceSha256 `
          -PreflightManifestSha256 $preflightManifestSha256)
      } catch {
      }
    }
    Stop-BinderUnattendedV1 `
      -ExitClass $exitClass `
      -Message $safeMessage
  } finally {
    Remove-Item Env:GROOKAI_BINDER_PROD_APPLY_ACK `
      -ErrorAction SilentlyContinue
    Remove-Item Env:GROOKAI_BINDER_PROD_BACKUP_ACK `
      -ErrorAction SilentlyContinue
    Remove-Item Env:GROOKAI_BINDER_PROD_MUTATION_NOT_AFTER_UTC `
      -ErrorAction SilentlyContinue
    Remove-Item Env:GROOKAI_BINDER_PROD_AUTH_EXPIRES_AT_UTC `
      -ErrorAction SilentlyContinue
    Close-BinderUnattendedFileSealsV1 -Streams $preflightSeals
    Close-BinderUnattendedFileSealsV1 -Streams $backupSeals
    Close-BinderUnattendedFileSealsV1 -Streams $gitMetadataSeals
    Close-BinderUnattendedFileSealsV1 -Streams $bundleSeals
    if ($null -ne $authorizationEnvelope) {
      $authorizationEnvelope.Stream.Dispose()
    }
    if ($wakeLock) {
      Exit-BinderUnattendedWakeLockV1
    }
    if ($null -ne $mutex) {
      try {
        $mutex.ReleaseMutex()
      } catch {
      }
      $mutex.Dispose()
    }
    if ($null -ne $savedEnvironment) {
      Exit-BinderUnattendedSanitizedEnvironmentV1 `
        -Saved $savedEnvironment
    }
  }
}

Export-ModuleMember -Function @(
  'Get-BinderUnattendedPolicyV1',
  'Protect-BinderUnattendedTextV1',
  'Read-BinderUnattendedAuthorizationV1',
  'Read-BinderBackupConfirmationV1',
  'Test-BinderUnattendedAuthorizationV1',
  'Test-BinderUnattendedBundleV1',
  'Test-BinderUnattendedChecksumsV1',
  'Test-BinderUnattendedPreflightArtifactsV1',
  'Invoke-BinderUnattendedSupervisorV1'
)
