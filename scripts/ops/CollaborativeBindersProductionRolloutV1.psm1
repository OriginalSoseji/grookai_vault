Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:PackageFingerprintV1 = '14a235d9ca9bc2172ddd3bfb8e2ba8b8812849079fe0469b73f35d02b6b47fb9'

function Assert-BinderConditionV1 {
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

function Get-BinderRolloutPolicyV1 {
  [CmdletBinding()]
  param()

  return [pscustomobject][ordered]@{
    SchemaVersion = 1
    PackageId = 'COLLABORATIVE-BINDERS-DB-V1'
    PackageFingerprintSha256 = $script:PackageFingerprintV1
    ProjectRef = 'ycdxbpibncqcchqiihfz'
    CanonicalRepository = 'OriginalSoseji/grookai_vault'
    RequiredAncestorSha = '34caa07324587815040957f9adde1f771ebfc85a'
    SupportedSupabaseCliVersion = '2.90.0'
    SupabaseCliLauncherSha256 = '140e3801d8adeda639a21b14e62b93a4c7d26b7a758421f43c82be59753be49b'
    SupabaseCliBinarySha256 = '31c2a25bd590a36ad803a7c669cf76a62eac3cd5aa7112eeb2e1c5f308c8b39c'
    SupabaseCliShimDescriptorSha256 = '0c68f69a367b2b76e61f3e71fb98c9a867143628a361a2e715dd30f33c4b2c3f'
    ManifestRelativePath = 'scripts/ops/collaborative_binders_production_manifest_v1.json'
    PreflightSqlRelativePath = 'scripts/ops/sql/collaborative_binders_production_preflight_v1.sql'
    PostApplySqlRelativePath = 'scripts/ops/sql/collaborative_binders_production_post_apply_v1.sql'
    PreflightSqlSha256 = '268458ed8a4a16dc513b55b6d0e5b3b03c301320e55a9ab4887a135c7652800d'
    PostApplySqlSha256 = '5125b0d89f5b3d36c66f98863f0b69b9c6df55561dfb54303437d47d8731f1a1'
    MigrationVersions = @(
      '20260723100000',
      '20260723101000',
      '20260723102000',
      '20260723103000',
      '20260723104000'
    )
    MigrationFiles = @(
      '20260723100000_collaborative_binders_schema_v1.sql',
      '20260723101000_collaborative_binders_core_rpcs_v1.sql',
      '20260723102000_collaborative_binders_collaboration_rpcs_v1.sql',
      '20260723103000_collaborative_binders_read_rpcs_v1.sql',
      '20260723104000_collaborative_binders_service_rpcs_v1.sql'
    )
    MigrationSha256 = @(
      '7e83ab8bb83e5b938fbec758b21f8cae2b4a71427a6600c54c5f773c974bae33',
      'eb9ca9898bca12b127f4b79aff9df81259efe74fa1029487ea133e94e8a67a7d',
      '680580044161936c8a382e5209e2cc54369943e13f1a3ae2ed41c299532cf3bf',
      '73dab7009f059267dcc571fcb6ec79cffdb23b728fc5bf04cd81397a06bcd6fb',
      '2edbef712d6b228c73b504498a6aa09f5bac440cfef96319d5c75f65e12d2997'
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
    ApplyArguments = @('db', 'push', '--linked', '--yes')
    PreflightTtlHours = 4
    BackupMaxAgeHours = 24
    BackupRecoveryLagMinutes = 15
  }
}

function Get-BinderRepoRootV1 {
  [CmdletBinding()]
  param()

  return [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..\..')
  )
}

function Get-BinderSha256StringV1 {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Value
  )

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
  return [Convert]::ToHexString(
    [System.Security.Cryptography.SHA256]::HashData($bytes)
  ).ToLowerInvariant()
}

function Get-BinderSha256FileV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  Assert-BinderConditionV1 (Test-Path -LiteralPath $Path -PathType Leaf) "File not found: $Path"
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-CanonicalSha256V1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [object]$Value
  )

  $json = $Value | ConvertTo-Json -Depth 32 -Compress
  return Get-BinderSha256StringV1 -Value $json
}

function Get-BinderPackageFingerprintV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Manifest
  )

  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add("schema_version=$($Manifest.schema_version)")
  $lines.Add("package_id=$($Manifest.package_id)")
  $lines.Add("required_ancestor_sha=$($Manifest.required_ancestor_sha)")
  $lines.Add("production_project_ref=$($Manifest.production_project_ref)")
  $lines.Add("canonical_git_repository=$($Manifest.canonical_git_repository)")

  foreach ($migration in @($Manifest.migrations)) {
    $lines.Add(
      'migration={0}|{1}|{2}|{3}|{4}|{5}|{6}' -f @(
        $migration.version,
        $migration.file,
        $migration.sha256,
        $migration.cumulative_tables,
        $migration.cumulative_functions,
        $migration.cumulative_indexes,
        $migration.cumulative_rls_policies
      )
    )
  }

  foreach ($readback in @($Manifest.readback_sql)) {
    $lines.Add(
      'readback={0}|{1}|{2}' -f @(
        $readback.phase,
        $readback.file,
        $readback.sha256
      )
    )
  }

  foreach ($property in $Manifest.final_expected_shape.PSObject.Properties) {
    $value = if ($property.Value -is [System.Array]) {
      @($property.Value) -join ','
    } else {
      [string]$property.Value
    }
    $lines.Add("shape.$($property.Name)=$value")
  }

  foreach ($flag in @($Manifest.feature_flags_must_remain_disabled)) {
    $lines.Add("disabled_flag=$flag")
  }
  foreach ($flag in @($Manifest.excluded_from_rollout)) {
    $lines.Add("excluded_flag=$flag")
  }

  return Get-BinderSha256StringV1 -Value ($lines -join "`n")
}

function Read-BinderPackageManifestV1 {
  [CmdletBinding()]
  param(
    [string]$RepoRoot = (Get-BinderRepoRootV1)
  )

  $policy = Get-BinderRolloutPolicyV1
  $path = Join-Path $RepoRoot $policy.ManifestRelativePath
  Assert-BinderConditionV1 (Test-Path -LiteralPath $path -PathType Leaf) "Package manifest not found: $path"

  $manifest = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $fingerprint = Get-BinderPackageFingerprintV1 -Manifest $manifest

  $expectedManifestProperties = @(
    'schema_version',
    'package_id',
    'package_fingerprint_sha256',
    'required_ancestor_sha',
    'production_project_ref',
    'canonical_git_repository',
    'migrations',
    'readback_sql',
    'final_expected_shape',
    'feature_flags_must_remain_disabled',
    'excluded_from_rollout'
  ) | Sort-Object
  $actualManifestProperties = @(
    $manifest.PSObject.Properties.Name | Sort-Object
  )
  Assert-BinderConditionV1 (
    ($actualManifestProperties -join "`n") -ceq
      ($expectedManifestProperties -join "`n")
  ) 'Package manifest fields are missing or unexpected.'

  Assert-BinderConditionV1 ($manifest.schema_version -eq $policy.SchemaVersion) 'Package manifest schema version mismatch.'
  Assert-BinderConditionV1 ($manifest.package_id -ceq $policy.PackageId) 'Package ID mismatch.'
  Assert-BinderConditionV1 ($manifest.production_project_ref -ceq $policy.ProjectRef) 'Package project ref mismatch.'
  Assert-BinderConditionV1 ($manifest.canonical_git_repository -ceq $policy.CanonicalRepository) 'Package repository mismatch.'
  Assert-BinderConditionV1 ($manifest.required_ancestor_sha -ceq $policy.RequiredAncestorSha) 'Package ancestor mismatch.'
  Assert-BinderConditionV1 ($manifest.package_fingerprint_sha256 -ceq $fingerprint) 'Package manifest fingerprint is stale or invalid.'
  Assert-BinderConditionV1 ($fingerprint -ceq $policy.PackageFingerprintSha256) 'Package fingerprint is not the reviewed V1 fingerprint.'
  Assert-BinderConditionV1 (
    (@($manifest.feature_flags_must_remain_disabled) -join "`n") -ceq
      ($policy.FeatureFlags -join "`n")
  ) 'Disabled feature-flag manifest is not exact.'
  Assert-BinderConditionV1 (
    (@($manifest.excluded_from_rollout) -join "`n") -ceq
      ($policy.ExcludedFlags -join "`n")
  ) 'Excluded feature-flag manifest is not exact.'

  $expectedMigrationProperties = @(
    'version',
    'file',
    'sha256',
    'cumulative_tables',
    'cumulative_functions',
    'cumulative_indexes',
    'cumulative_rls_policies'
  ) | Sort-Object
  foreach ($migration in @($manifest.migrations)) {
    $actualMigrationProperties = @(
      $migration.PSObject.Properties.Name | Sort-Object
    )
    Assert-BinderConditionV1 (
      ($actualMigrationProperties -join "`n") -ceq
        ($expectedMigrationProperties -join "`n")
    ) 'Migration manifest fields are missing or unexpected.'
  }

  $expectedReadbackProperties = @('phase', 'file', 'sha256') | Sort-Object
  foreach ($readback in @($manifest.readback_sql)) {
    $actualReadbackProperties = @(
      $readback.PSObject.Properties.Name | Sort-Object
    )
    Assert-BinderConditionV1 (
      ($actualReadbackProperties -join "`n") -ceq
        ($expectedReadbackProperties -join "`n")
    ) 'Readback SQL manifest fields are missing or unexpected.'
  }

  return [pscustomobject]@{
    Path = $path
    Data = $manifest
    FingerprintSha256 = $fingerprint
    FileSha256 = Get-BinderSha256FileV1 -Path $path
  }
}

function Remove-AnsiV1 {
  [CmdletBinding()]
  param(
    [AllowEmptyString()]
    [string]$Text = ''
  )

  return [regex]::Replace($Text, "`e\[[0-?]*[ -/]*[@-~]", '')
}

function Protect-BinderTranscriptV1 {
  param(
    [AllowEmptyString()]
    [string]$Text = ''
  )

  $safe = Remove-AnsiV1 -Text $Text
  $safe = [regex]::Replace(
    $safe,
    '(?i)\bpostgres(?:ql)?://[^\s''"]+',
    '[REDACTED_DATABASE_URL]'
  )
  $safe = [regex]::Replace(
    $safe,
    '(?i)\bBearer\s+[A-Za-z0-9._~+/-]+=*',
    'Bearer [REDACTED]'
  )
  $safe = [regex]::Replace(
    $safe,
    '\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b',
    '[REDACTED_JWT]'
  )
  $safe = [regex]::Replace(
    $safe,
    '\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b',
    '[REDACTED_SUPABASE_KEY]'
  )
  $safe = [regex]::Replace(
    $safe,
    '\bsbp_[A-Za-z0-9_-]+\b',
    '[REDACTED_SUPABASE_ACCESS_TOKEN]'
  )
  $safe = [regex]::Replace(
    $safe,
    '(?i)\b(access_token|apikey|password)=([^&\s]+)',
    '$1=[REDACTED]'
  )
  return $safe
}

function Test-BinderRoutingEnvironmentNameV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  return $Name -match (
    '(?i)^(?:' +
    'PG.*|' +
    'DATABASE_URL|' +
    'DIRECT_URL|' +
    'DB_URL|' +
    'PRISMA_DATABASE_URL|' +
    'POSTGRES(?:QL)?_URL.*|' +
    'SUPABASE_DB_.*|' +
    'SUPABASE_API_(?:HOST|URL)|' +
    'SUPABASE_INTERNAL_.*|' +
    'SUPABASE_PROJECT_(?:ID|REF)|' +
    'SUPABASE_CA_SKIP_VERIFY' +
    ')$'
  )
}

function Initialize-BinderProcessContainmentTypesV1 {
  [CmdletBinding()]
  param()

  Assert-BinderConditionV1 $IsWindows (
    'The production rollout process containment guard requires Windows.'
  )
  if ($null -ne ('Grookai.Vault.RolloutV1.BinderJob' -as [type])) {
    return
  }

  Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Win32.SafeHandles;

namespace Grookai.Vault.RolloutV1
{
    internal sealed class SafeJobHandle : SafeHandleZeroOrMinusOneIsInvalid
    {
        internal SafeJobHandle(IntPtr handle) : base(true)
        {
            SetHandle(handle);
        }

        protected override bool ReleaseHandle()
        {
            return NativeMethods.CloseHandle(handle);
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct JobObjectBasicLimitInformation
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct IoCounters
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct JobObjectExtendedLimitInformation
    {
        public JobObjectBasicLimitInformation BasicLimitInformation;
        public IoCounters IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct JobObjectBasicAccountingInformation
    {
        public long TotalUserTime;
        public long TotalKernelTime;
        public long ThisPeriodTotalUserTime;
        public long ThisPeriodTotalKernelTime;
        public uint TotalPageFaultCount;
        public uint TotalProcesses;
        public uint ActiveProcesses;
        public uint TotalTerminatedProcesses;
    }

    internal static class NativeMethods
    {
        internal const uint JobObjectLimitKillOnJobClose = 0x00002000;
        internal const int JobObjectBasicAccountingInformationClass = 1;
        internal const int JobObjectExtendedLimitInformationClass = 9;

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        internal static extern IntPtr CreateJobObject(
            IntPtr jobAttributes,
            string name);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool SetInformationJobObject(
            SafeJobHandle job,
            int informationClass,
            ref JobObjectExtendedLimitInformation information,
            uint informationLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool QueryInformationJobObject(
            SafeJobHandle job,
            int informationClass,
            out JobObjectBasicAccountingInformation information,
            uint informationLength,
            IntPtr returnLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool AssignProcessToJobObject(
            SafeJobHandle job,
            IntPtr process);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool TerminateJobObject(
            SafeJobHandle job,
            uint exitCode);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool CloseHandle(IntPtr handle);
    }

    public sealed class BinderJob : IDisposable
    {
        private SafeJobHandle _handle;

        public BinderJob()
        {
            IntPtr rawHandle = NativeMethods.CreateJobObject(
                IntPtr.Zero,
                null);
            if (rawHandle == IntPtr.Zero)
            {
                throw new Win32Exception(
                    Marshal.GetLastWin32Error(),
                    "CreateJobObject failed.");
            }

            _handle = new SafeJobHandle(rawHandle);
            try
            {
                var information =
                    new JobObjectExtendedLimitInformation();
                information.BasicLimitInformation.LimitFlags =
                    NativeMethods.JobObjectLimitKillOnJobClose;
                uint size = checked((uint)Marshal.SizeOf(
                    typeof(JobObjectExtendedLimitInformation)));
                if (!NativeMethods.SetInformationJobObject(
                    _handle,
                    NativeMethods.JobObjectExtendedLimitInformationClass,
                    ref information,
                    size))
                {
                    throw new Win32Exception(
                        Marshal.GetLastWin32Error(),
                        "SetInformationJobObject failed.");
                }
            }
            catch
            {
                _handle.Dispose();
                _handle = null;
                throw;
            }
        }

        private SafeJobHandle Handle
        {
            get
            {
                if (_handle == null || _handle.IsClosed)
                {
                    throw new ObjectDisposedException(
                        nameof(BinderJob));
                }
                return _handle;
            }
        }

        public void Assign(Process process)
        {
            if (process == null)
            {
                throw new ArgumentNullException(nameof(process));
            }
            if (!NativeMethods.AssignProcessToJobObject(
                Handle,
                process.Handle))
            {
                throw new Win32Exception(
                    Marshal.GetLastWin32Error(),
                    "AssignProcessToJobObject failed.");
            }
        }

        public int GetActiveProcessCount()
        {
            JobObjectBasicAccountingInformation information;
            uint size = checked((uint)Marshal.SizeOf(
                typeof(JobObjectBasicAccountingInformation)));
            if (!NativeMethods.QueryInformationJobObject(
                Handle,
                NativeMethods.JobObjectBasicAccountingInformationClass,
                out information,
                size,
                IntPtr.Zero))
            {
                throw new Win32Exception(
                    Marshal.GetLastWin32Error(),
                    "QueryInformationJobObject failed.");
            }
            return checked((int)information.ActiveProcesses);
        }

        public void Terminate(uint exitCode)
        {
            if (!NativeMethods.TerminateJobObject(
                Handle,
                exitCode))
            {
                throw new Win32Exception(
                    Marshal.GetLastWin32Error(),
                    "TerminateJobObject failed.");
            }
        }

        public void Dispose()
        {
            if (_handle != null)
            {
                _handle.Dispose();
                _handle = null;
            }
        }
    }

    public sealed class BinderBoundedTextCapture
    {
        private readonly object _sync = new object();
        private readonly StringBuilder _text = new StringBuilder();
        private readonly int _maximumCharacters;
        private readonly Task _completion;
        private long _charactersObserved;
        private bool _truncated;
        private string _error;

        public BinderBoundedTextCapture(
            TextReader reader,
            int maximumCharacters)
        {
            if (reader == null)
            {
                throw new ArgumentNullException(nameof(reader));
            }
            if (maximumCharacters < 1)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(maximumCharacters));
            }
            _maximumCharacters = maximumCharacters;
            _completion = CaptureAsync(reader);
        }

        private async Task CaptureAsync(TextReader reader)
        {
            var buffer = new char[4096];
            try
            {
                while (true)
                {
                    int read = await reader.ReadAsync(
                        buffer,
                        0,
                        buffer.Length).ConfigureAwait(false);
                    if (read == 0)
                    {
                        break;
                    }

                    lock (_sync)
                    {
                        _charactersObserved += read;
                        int remaining =
                            _maximumCharacters - _text.Length;
                        if (remaining > 0)
                        {
                            _text.Append(
                                buffer,
                                0,
                                Math.Min(remaining, read));
                        }
                        if (read > remaining)
                        {
                            _truncated = true;
                        }
                    }
                }
            }
            catch (Exception exception)
            {
                lock (_sync)
                {
                    _error =
                        exception.GetType().Name +
                        ": " +
                        exception.Message;
                }
            }
        }

        public bool WaitForCompletion(int timeoutMilliseconds)
        {
            if (timeoutMilliseconds < 0)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(timeoutMilliseconds));
            }
            try
            {
                return _completion.Wait(timeoutMilliseconds);
            }
            catch
            {
                return true;
            }
        }

        public bool Completed
        {
            get { return _completion.IsCompleted; }
        }

        public bool CompletedSuccessfully
        {
            get
            {
                lock (_sync)
                {
                    return
                        _completion.IsCompleted &&
                        String.IsNullOrEmpty(_error);
                }
            }
        }

        public string Text
        {
            get
            {
                lock (_sync)
                {
                    return _text.ToString();
                }
            }
        }

        public long CharactersObserved
        {
            get
            {
                lock (_sync)
                {
                    return _charactersObserved;
                }
            }
        }

        public bool Truncated
        {
            get
            {
                lock (_sync)
                {
                    return _truncated;
                }
            }
        }

        public string Error
        {
            get
            {
                lock (_sync)
                {
                    return _error;
                }
            }
        }
    }
}
'@
}

function Set-BinderProcessLifecycleFieldV1 {
  param(
    [object]$Lifecycle,

    [Parameter(Mandatory = $true)]
    [string]$Name,

    [AllowNull()]
    [object]$Value
  )

  if ($null -eq $Lifecycle) {
    return
  }
  if ($Lifecycle -is [System.Collections.IDictionary]) {
    $Lifecycle[$Name] = $Value
    return
  }

  $property = $Lifecycle.PSObject.Properties[$Name]
  if ($null -eq $property) {
    Add-Member `
      -InputObject $Lifecycle `
      -MemberType NoteProperty `
      -Name $Name `
      -Value $Value
  } else {
    $property.Value = $Value
  }
}

function Set-BinderProcessLifecycleV1 {
  param(
    [object]$Lifecycle,

    [Parameter(Mandatory = $true)]
    [System.Collections.IDictionary]$Values
  )

  foreach ($entry in $Values.GetEnumerator()) {
    Set-BinderProcessLifecycleFieldV1 `
      -Lifecycle $Lifecycle `
      -Name ([string]$entry.Key) `
      -Value $entry.Value
  }
}

function Get-BinderSupervisorEncodedCommandV1 {
  [CmdletBinding()]
  param()

  $supervisor = @'
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$payloadName = 'GROOKAI_BINDER_SUPERVISOR_PAYLOAD_V1'
$gate = $null
$child = $null
$exitCode = 250
try {
  $encodedPayload = [Environment]::GetEnvironmentVariable(
    $payloadName,
    [EnvironmentVariableTarget]::Process
  )
  if ([string]::IsNullOrWhiteSpace($encodedPayload)) {
    throw 'Supervisor payload is missing.'
  }
  [Environment]::SetEnvironmentVariable(
    $payloadName,
    $null,
    [EnvironmentVariableTarget]::Process
  )
  $payloadJson = [Text.Encoding]::UTF8.GetString(
    [Convert]::FromBase64String($encodedPayload)
  )
  $payload = $payloadJson | ConvertFrom-Json
  $gate = [Threading.EventWaitHandle]::OpenExisting(
    [string]$payload.GateName
  )
  if (-not $gate.WaitOne(600000)) {
    throw 'Supervisor gate was not released within ten minutes.'
  }

  $start = [Diagnostics.ProcessStartInfo]::new()
  $start.FileName = [string]$payload.FilePath
  $start.WorkingDirectory = [string]$payload.WorkingDirectory
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  foreach ($argument in @($payload.Arguments)) {
    [void]$start.ArgumentList.Add([string]$argument)
  }

  $child = [Diagnostics.Process]::new()
  $child.StartInfo = $start
  if (-not $child.Start()) {
    throw 'Supervisor could not start the reviewed executable.'
  }
  $stdoutCopy = $child.StandardOutput.BaseStream.CopyToAsync(
    [Console]::OpenStandardOutput()
  )
  $stderrCopy = $child.StandardError.BaseStream.CopyToAsync(
    [Console]::OpenStandardError()
  )
  $child.WaitForExit()
  $exitCode = $child.ExitCode
  $copies = [Threading.Tasks.Task]::WhenAll(
    [Threading.Tasks.Task[]]@($stdoutCopy, $stderrCopy)
  )
  $copies.GetAwaiter().GetResult()
} catch {
  $exitCode = 250
  [Console]::Error.WriteLine(
    'Contained supervisor failure: ' + $_.Exception.Message
  )
} finally {
  if ($null -ne $child) {
    $child.Dispose()
  }
  if ($null -ne $gate) {
    $gate.Dispose()
  }
}
[Environment]::Exit($exitCode)
'@

  return [Convert]::ToBase64String(
    [Text.Encoding]::Unicode.GetBytes($supervisor)
  )
}

function Wait-BinderContainedTreeV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Diagnostics.Process]$RootProcess,

    [Parameter(Mandatory = $true)]
    [object]$Job,

    [Parameter(Mandatory = $true)]
    [int]$TimeoutMilliseconds
  )

  Assert-BinderConditionV1 (
    $TimeoutMilliseconds -ge 0
  ) 'Containment wait timeout cannot be negative.'
  $stopwatch = [Diagnostics.Stopwatch]::StartNew()
  $rootExited = $false
  $processTreeEmpty = $false
  $queryError = $null

  while ($true) {
    try {
      $rootExited = $RootProcess.HasExited
    } catch {
      $rootExited = $false
    }
    try {
      $processTreeEmpty = ($Job.GetActiveProcessCount() -eq 0)
      $queryError = $null
    } catch {
      $processTreeEmpty = $false
      $queryError = $_.Exception.Message
    }

    if ($rootExited -and $processTreeEmpty) {
      break
    }
    $remaining = $TimeoutMilliseconds - [int]$stopwatch.ElapsedMilliseconds
    if ($remaining -le 0) {
      break
    }
    $slice = [Math]::Min(100, $remaining)
    if (-not $rootExited) {
      try {
        [void]$RootProcess.WaitForExit($slice)
      } catch {
        [Threading.Thread]::Sleep($slice)
      }
    } else {
      [Threading.Thread]::Sleep($slice)
    }
  }

  return [pscustomobject][ordered]@{
    RootExited = [bool]$rootExited
    ProcessTreeEmpty = [bool]$processTreeEmpty
    TerminationConfirmed = (
      [bool]$rootExited -and
      [bool]$processTreeEmpty
    )
    QueryError = $queryError
  }
}

function Stop-BinderContainedTreeV1 {
  param(
    [Parameter(Mandatory = $true)]
    [System.Diagnostics.Process]$RootProcess,

    [Parameter(Mandatory = $true)]
    [object]$Job,

    [int]$ConfirmationTimeoutMilliseconds = 15000
  )

  $killSucceeded = $false
  $killError = $null
  try {
    $Job.Terminate(1)
    $killSucceeded = $true
  } catch {
    $killError = $_.Exception.Message
  }
  $confirmation = Wait-BinderContainedTreeV1 `
    -RootProcess $RootProcess `
    -Job $Job `
    -TimeoutMilliseconds $ConfirmationTimeoutMilliseconds

  return [pscustomobject][ordered]@{
    KillAttempted = $true
    KillRequestSucceeded = [bool]$killSucceeded
    KillRequestError = $killError
    RootExited = [bool]$confirmation.RootExited
    ProcessTreeEmpty = [bool]$confirmation.ProcessTreeEmpty
    TerminationConfirmed = [bool]$confirmation.TerminationConfirmed
    QueryError = $confirmation.QueryError
  }
}

function ConvertTo-BinderBoundedTranscriptV1 {
  param(
    [AllowEmptyString()]
    [string]$Text = '',

    [Parameter(Mandatory = $true)]
    [int]$MaximumCharacters,

    [Parameter(Mandatory = $true)]
    [bool]$AlreadyTruncated
  )

  $protected = Protect-BinderTranscriptV1 -Text $Text
  $truncated = (
    $AlreadyTruncated -or
    $protected.Length -gt $MaximumCharacters
  )
  if (-not $truncated) {
    return [pscustomobject]@{
      Text = $protected
      Truncated = $false
    }
  }

  $marker = "`n[output truncated by rollout guard]"
  $available = [Math]::Max(0, $MaximumCharacters - $marker.Length)
  $bounded = if ($protected.Length -gt $available) {
    $protected.Substring(0, $available)
  } else {
    $protected
  }
  return [pscustomobject]@{
    Text = $bounded + $marker
    Truncated = $true
  }
}

function Complete-BinderProcessOutputV1 {
  param(
    [object]$StdOutCapture,

    [object]$StdErrCapture,

    [int]$MaximumCharacters = 262144,

    [int]$WaitMilliseconds = 5000
  )

  $stdoutWaited = if ($null -ne $StdOutCapture) {
    $StdOutCapture.WaitForCompletion($WaitMilliseconds)
  } else {
    $false
  }
  $stderrWaited = if ($null -ne $StdErrCapture) {
    $StdErrCapture.WaitForCompletion($WaitMilliseconds)
  } else {
    $false
  }
  $stdoutComplete = (
    $stdoutWaited -and
    $null -ne $StdOutCapture -and
    $StdOutCapture.CompletedSuccessfully
  )
  $stderrComplete = (
    $stderrWaited -and
    $null -ne $StdErrCapture -and
    $StdErrCapture.CompletedSuccessfully
  )
  $stdoutRaw = if ($null -ne $StdOutCapture) {
    [string]$StdOutCapture.Text
  } else {
    ''
  }
  $stderrRaw = if ($null -ne $StdErrCapture) {
    [string]$StdErrCapture.Text
  } else {
    ''
  }
  $stdout = ConvertTo-BinderBoundedTranscriptV1 `
    -Text $stdoutRaw `
    -MaximumCharacters $MaximumCharacters `
    -AlreadyTruncated (
      $null -ne $StdOutCapture -and
      $StdOutCapture.Truncated
    )
  $stderr = ConvertTo-BinderBoundedTranscriptV1 `
    -Text $stderrRaw `
    -MaximumCharacters $MaximumCharacters `
    -AlreadyTruncated (
      $null -ne $StdErrCapture -and
      $StdErrCapture.Truncated
    )

  return [pscustomobject][ordered]@{
    StdOut = $stdout.Text
    StdErr = $stderr.Text
    StdOutCaptureCompleted = [bool]$stdoutComplete
    StdErrCaptureCompleted = [bool]$stderrComplete
    OutputCaptureCompleted = (
      [bool]$stdoutComplete -and
      [bool]$stderrComplete
    )
    StdOutTruncated = [bool]$stdout.Truncated
    StdErrTruncated = [bool]$stderr.Truncated
    OutputTruncated = (
      [bool]$stdout.Truncated -or
      [bool]$stderr.Truncated
    )
    StdOutCharactersObserved = if ($null -ne $StdOutCapture) {
      [long]$StdOutCapture.CharactersObserved
    } else {
      0L
    }
    StdErrCharactersObserved = if ($null -ne $StdErrCapture) {
      [long]$StdErrCapture.CharactersObserved
    } else {
      0L
    }
    StdOutCaptureError = if ($null -ne $StdOutCapture) {
      [string]$StdOutCapture.Error
    } else {
      'capture_not_started'
    }
    StdErrCaptureError = if ($null -ne $StdErrCapture) {
      [string]$StdErrCapture.Error
    } else {
      'capture_not_started'
    }
  }
}

function Invoke-BinderProcessV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,

    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,

    [int]$TimeoutSeconds = 120,

    [switch]$SanitizeDatabaseEnvironment,

    [object]$ProcessLifecycle
  )

  Assert-BinderConditionV1 (
    $TimeoutSeconds -gt 0
  ) 'Process timeout must be positive.'
  Initialize-BinderProcessContainmentTypesV1

  $maximumOutputCharacters = 262144
  $resolvedFilePath = [IO.Path]::GetFullPath($FilePath)
  $resolvedWorkingDirectory = [IO.Path]::GetFullPath(
    $WorkingDirectory
  )
  Assert-BinderConditionV1 (
    Test-Path -LiteralPath $resolvedFilePath -PathType Leaf
  ) "Unable to start command because its executable was not found: $resolvedFilePath"
  Assert-BinderConditionV1 (
    Test-Path -LiteralPath $resolvedWorkingDirectory -PathType Container
  ) "Command working directory was not found: $resolvedWorkingDirectory"

  $state = [ordered]@{
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
    StdOutCaptureCompleted = $false
    StdErrCaptureCompleted = $false
    OutputCaptureCompleted = $false
    StdOutTruncated = $false
    StdErrTruncated = $false
    OutputTruncated = $false
    StdOutCharactersObserved = 0L
    StdErrCharactersObserved = 0L
    StdOutCaptureError = $null
    StdErrCaptureError = $null
    StdOut = ''
    StdErr = ''
  }
  Set-BinderProcessLifecycleV1 `
    -Lifecycle $ProcessLifecycle `
    -Values $state

  $gate = $null
  $job = $null
  $process = $null
  $stdoutCapture = $null
  $stderrCapture = $null
  $supervisorStarted = $false
  $jobAssigned = $false
  $output = $null

  try {
    $gateName = (
      'Local\GrookaiBinderRolloutV1-' +
      [guid]::NewGuid().ToString('N')
    )
    $createdNew = $false
    $gate = [Threading.EventWaitHandle]::new(
      $false,
      [Threading.EventResetMode]::ManualReset,
      $gateName,
      [ref]$createdNew
    )
    Assert-BinderConditionV1 $createdNew (
      'A unique rollout supervisor gate could not be created.'
    )
    $job = [Grookai.Vault.RolloutV1.BinderJob]::new()

    $payload = [ordered]@{
      GateName = $gateName
      FilePath = $resolvedFilePath
      WorkingDirectory = $resolvedWorkingDirectory
      Arguments = @($Arguments)
    }
    $payloadJson = $payload | ConvertTo-Json -Depth 4 -Compress
    $payloadBase64 = [Convert]::ToBase64String(
      [Text.Encoding]::UTF8.GetBytes($payloadJson)
    )
    Assert-BinderConditionV1 (
      $payloadBase64.Length -le 24000
    ) 'Contained command payload is too large.'

    $start = [System.Diagnostics.ProcessStartInfo]::new()
    $start.FileName = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
    $start.WorkingDirectory = $resolvedWorkingDirectory
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.RedirectStandardInput = $true
    foreach ($argument in @(
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      (Get-BinderSupervisorEncodedCommandV1)
    )) {
      [void]$start.ArgumentList.Add($argument)
    }
    if ($SanitizeDatabaseEnvironment) {
      foreach ($name in @($start.Environment.Keys)) {
        if (Test-BinderRoutingEnvironmentNameV1 -Name $name) {
          [void]$start.Environment.Remove($name)
        }
      }
    }
    $start.Environment[
      'GROOKAI_BINDER_SUPERVISOR_PAYLOAD_V1'
    ] = $payloadBase64

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $start
    Assert-BinderConditionV1 (
      $process.Start()
    ) "Unable to start contained supervisor for: $resolvedFilePath"
    $supervisorStarted = $true
    $state.SupervisorProcessId = $process.Id
    Set-BinderProcessLifecycleV1 `
      -Lifecycle $ProcessLifecycle `
      -Values $state
    $process.StandardInput.Close()
    $stdoutCapture = [Grookai.Vault.RolloutV1.BinderBoundedTextCapture]::new(
      $process.StandardOutput,
      $maximumOutputCharacters
    )
    $stderrCapture = [Grookai.Vault.RolloutV1.BinderBoundedTextCapture]::new(
      $process.StandardError,
      $maximumOutputCharacters
    )

    $job.Assign($process)
    $jobAssigned = $true
    $startedAtUtc = [datetime]::UtcNow.ToString('o')
    $state.Started = $true
    $state.StartedAtUtc = $startedAtUtc
    Set-BinderProcessLifecycleV1 `
      -Lifecycle $ProcessLifecycle `
      -Values $state
    Assert-BinderConditionV1 ($gate.Set()) (
      'Contained supervisor gate could not be released.'
    )

    $normalWait = Wait-BinderContainedTreeV1 `
      -RootProcess $process `
      -Job $job `
      -TimeoutMilliseconds ($TimeoutSeconds * 1000)
    $state.RootExited = [bool]$normalWait.RootExited
    $state.ProcessTreeEmpty = [bool]$normalWait.ProcessTreeEmpty
    $state.TerminationConfirmed = [bool]$normalWait.TerminationConfirmed

    if (-not $state.TerminationConfirmed) {
      $state.TimedOut = $true
      $termination = Stop-BinderContainedTreeV1 `
        -RootProcess $process `
        -Job $job
      $state.KillAttempted = $termination.KillAttempted
      $state.KillRequestSucceeded =
        $termination.KillRequestSucceeded
      $state.KillRequestError = $termination.KillRequestError
      $state.RootExited = $termination.RootExited
      $state.ProcessTreeEmpty = $termination.ProcessTreeEmpty
      $state.TerminationConfirmed =
        $termination.TerminationConfirmed
      if (-not $state.TerminationConfirmed) {
        Set-BinderProcessLifecycleV1 `
          -Lifecycle $ProcessLifecycle `
          -Values $state
        [Environment]::FailFast(
          'Rollout process-tree termination could not be confirmed; ' +
          'the kill-on-close Job Object handle is intentionally still open.'
        )
      }
    }

    if ($state.RootExited) {
      $state.ExitCode = $process.ExitCode
    }
    $state.EndedAtUtc = [datetime]::UtcNow.ToString('o')
    $output = Complete-BinderProcessOutputV1 `
      -StdOutCapture $stdoutCapture `
      -StdErrCapture $stderrCapture `
      -MaximumCharacters $maximumOutputCharacters
    foreach ($property in $output.PSObject.Properties) {
      $state[$property.Name] = $property.Value
    }
    Set-BinderProcessLifecycleV1 `
      -Lifecycle $ProcessLifecycle `
      -Values $state

    return [pscustomobject][ordered]@{
      ExitCode = $state.ExitCode
      TimedOut = [bool]$state.TimedOut
      KillAttempted = [bool]$state.KillAttempted
      KillRequestSucceeded = $state.KillRequestSucceeded
      KillRequestError = $state.KillRequestError
      RootExited = [bool]$state.RootExited
      ProcessTreeEmpty = [bool]$state.ProcessTreeEmpty
      TerminationConfirmed = [bool]$state.TerminationConfirmed
      StdOut = $state.StdOut
      StdErr = $state.StdErr
      StdOutCaptureCompleted =
        [bool]$state.StdOutCaptureCompleted
      StdErrCaptureCompleted =
        [bool]$state.StdErrCaptureCompleted
      OutputCaptureCompleted =
        [bool]$state.OutputCaptureCompleted
      StdOutTruncated = [bool]$state.StdOutTruncated
      StdErrTruncated = [bool]$state.StdErrTruncated
      OutputTruncated = [bool]$state.OutputTruncated
      StdOutCharactersObserved =
        [long]$state.StdOutCharactersObserved
      StdErrCharactersObserved =
        [long]$state.StdErrCharactersObserved
      StdOutCaptureError = $state.StdOutCaptureError
      StdErrCaptureError = $state.StdErrCaptureError
      Arguments = @($Arguments)
      Started = $true
      StartedAtUtc = $startedAtUtc
      SupervisorProcessId = $state.SupervisorProcessId
      EndedAtUtc = $state.EndedAtUtc
    }
  } catch {
    $originalError = $_
    if ($supervisorStarted) {
      if ($jobAssigned) {
        $termination = Stop-BinderContainedTreeV1 `
          -RootProcess $process `
          -Job $job
        $state.KillAttempted = $termination.KillAttempted
        $state.KillRequestSucceeded =
          $termination.KillRequestSucceeded
        $state.KillRequestError = $termination.KillRequestError
        $state.RootExited = $termination.RootExited
        $state.ProcessTreeEmpty = $termination.ProcessTreeEmpty
        $state.TerminationConfirmed =
          $termination.TerminationConfirmed
        if (-not $state.TerminationConfirmed) {
          Set-BinderProcessLifecycleV1 `
            -Lifecycle $ProcessLifecycle `
            -Values $state
          [Environment]::FailFast(
            'Exceptional rollout process-tree termination could not be ' +
            'confirmed; the kill-on-close Job Object handle is ' +
            'intentionally still open.'
          )
        }
      } else {
        $state.KillAttempted = $true
        try {
          if ($process.HasExited) {
            $state.KillRequestSucceeded = $true
          } else {
            $process.Kill($true)
            $state.KillRequestSucceeded = $true
          }
        } catch {
          $state.KillRequestSucceeded = $false
          $state.KillRequestError = $_.Exception.Message
        }
        $confirmation = Wait-BinderContainedTreeV1 `
          -RootProcess $process `
          -Job $job `
          -TimeoutMilliseconds 5000
        $state.RootExited = $confirmation.RootExited
        $state.ProcessTreeEmpty =
          $confirmation.ProcessTreeEmpty
        $state.TerminationConfirmed =
          $confirmation.TerminationConfirmed
        if (-not $state.TerminationConfirmed) {
          [Environment]::FailFast(
            'The gated rollout supervisor could not be terminated ' +
            'before Job Object assignment.'
          )
        }
      }
    }
    if ($null -ne $process) {
      try {
        if ($process.HasExited) {
          $state.ExitCode = $process.ExitCode
        }
      } catch {
      }
    }
    if ($state.TerminationConfirmed) {
      $state.EndedAtUtc = [datetime]::UtcNow.ToString('o')
    }
    $output = Complete-BinderProcessOutputV1 `
      -StdOutCapture $stdoutCapture `
      -StdErrCapture $stderrCapture `
      -MaximumCharacters $maximumOutputCharacters
    foreach ($property in $output.PSObject.Properties) {
      $state[$property.Name] = $property.Value
    }
    Set-BinderProcessLifecycleV1 `
      -Lifecycle $ProcessLifecycle `
      -Values $state
    throw $originalError
  } finally {
    if ($null -ne $process) {
      $process.Dispose()
    }
    if ($null -ne $job) {
      $job.Dispose()
    }
    if ($null -ne $gate) {
      $gate.Dispose()
    }
  }
}

function Get-BinderCommandPathV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  Assert-BinderConditionV1 ($null -ne $command) "Required command is unavailable: $Name"
  return $command.Source
}

function Get-BinderSupabaseExecutableV1 {
  $launcherPath = Get-BinderCommandPathV1 -Name 'supabase'
  $binaryPath = $launcherPath
  $shimDescriptorPath = $null
  $shimDescriptor = [System.IO.Path]::ChangeExtension(
    $launcherPath,
    '.shim'
  )

  if (Test-Path -LiteralPath $shimDescriptor -PathType Leaf) {
    $shimDescriptorPath = [System.IO.Path]::GetFullPath($shimDescriptor)
    $shimDescriptorItem = Get-Item -LiteralPath $shimDescriptorPath
    Assert-BinderConditionV1 (
      -not $shimDescriptorItem.Attributes.HasFlag(
        [System.IO.FileAttributes]::ReparsePoint
      )
    ) 'Supabase shim descriptor must not be a reparse point.'
    $descriptor = Get-Content -LiteralPath $shimDescriptor -Raw
    $pathMatch = [regex]::Match(
      $descriptor,
      '(?m)^\s*path\s*=\s*"(?<path>[^"]+)"\s*$'
    )
    Assert-BinderConditionV1 $pathMatch.Success 'Supabase shim target could not be resolved.'
    $candidate = [System.IO.Path]::GetFullPath(
      $pathMatch.Groups['path'].Value
    )
    $candidateParent = Get-Item -LiteralPath (
      Split-Path -Parent $candidate
    )
    if ($candidateParent.Attributes.HasFlag(
      [System.IO.FileAttributes]::ReparsePoint
    )) {
      $resolvedParent = $candidateParent.ResolveLinkTarget($true)
      Assert-BinderConditionV1 ($null -ne $resolvedParent) 'Supabase binary parent link could not be resolved.'
      $candidate = Join-Path $resolvedParent.FullName (
        Split-Path -Leaf $candidate
      )
    }
    Assert-BinderConditionV1 (Test-Path -LiteralPath $candidate -PathType Leaf) 'Resolved Supabase binary does not exist.'
    $binaryPath = $candidate
  }

  return [pscustomobject]@{
    LauncherPath = $launcherPath
    BinaryPath = $binaryPath
    ShimDescriptorPath = $shimDescriptorPath
  }
}

function Invoke-BinderGitV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [int]$TimeoutSeconds = 60
  )

  return Invoke-BinderProcessV1 `
    -FilePath (Get-BinderCommandPathV1 -Name 'git') `
    -Arguments $Arguments `
    -WorkingDirectory $RepoRoot `
    -TimeoutSeconds $TimeoutSeconds
}

function Invoke-BinderSupabaseV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [int]$TimeoutSeconds = 120,

    [object]$ProcessLifecycle,

    [string]$ExecutablePath
  )

  $resolvedExecutablePath = if (
    [string]::IsNullOrWhiteSpace($ExecutablePath)
  ) {
    (Get-BinderSupabaseExecutableV1).BinaryPath
  } else {
    [System.IO.Path]::GetFullPath($ExecutablePath)
  }
  Assert-BinderConditionV1 (
    Test-Path -LiteralPath $resolvedExecutablePath -PathType Leaf
  ) 'Resolved Supabase executable is missing.'
  return Invoke-BinderProcessV1 `
    -FilePath $resolvedExecutablePath `
    -Arguments $Arguments `
    -WorkingDirectory $RepoRoot `
    -TimeoutSeconds $TimeoutSeconds `
    -SanitizeDatabaseEnvironment `
    -ProcessLifecycle $ProcessLifecycle
}

function Assert-BinderCommandSucceededV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Result,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $terminationConfirmed = (
    $null -ne $Result.PSObject.Properties['TerminationConfirmed'] -and
    $Result.TerminationConfirmed -eq $true
  )
  $outputCaptureCompleted = (
    $null -ne $Result.PSObject.Properties['OutputCaptureCompleted'] -and
    $Result.OutputCaptureCompleted -eq $true
  )
  if (
    -not $terminationConfirmed -or
    -not $outputCaptureCompleted -or
    $Result.TimedOut -or
    $Result.ExitCode -ne 0
  ) {
    $detail = ($Result.StdErr + "`n" + $Result.StdOut).Trim()
    if (-not $terminationConfirmed) {
      throw "$Label did not confirm root exit and an empty process tree. $detail"
    }
    if (-not $outputCaptureCompleted) {
      throw "$Label output capture did not complete. $detail"
    }
    if ($Result.TimedOut) {
      throw "$Label timed out; exit code $($Result.ExitCode). $detail"
    }
    throw "$Label failed with exit code $($Result.ExitCode). $detail"
  }
}

function ConvertFrom-SupabaseMigrationListV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text
  )

  $clean = Remove-AnsiV1 -Text $Text
  $rows = [System.Collections.Generic.List[object]]::new()
  foreach ($line in ($clean -split "`r?`n")) {
    $match = [regex]::Match(
      $line,
      '^\s*(?<local>\d{8,14})?\s*\|\s*(?<remote>\d{8,14})?\s*\|\s*(?<time>.+?)\s*$'
    )
    if (-not $match.Success) {
      continue
    }
    $local = $match.Groups['local'].Value
    $remote = $match.Groups['remote'].Value
    if ([string]::IsNullOrWhiteSpace($local) -and [string]::IsNullOrWhiteSpace($remote)) {
      continue
    }
    $rows.Add([pscustomobject]@{
      Local = $local
      Remote = $remote
      Time = $match.Groups['time'].Value.Trim()
    })
  }

  Assert-BinderConditionV1 ($rows.Count -gt 0) 'Linked migration ledger contained no parseable rows.'

  $shared = @($rows | Where-Object { $_.Local -and $_.Remote })
  $localOnly = @($rows | Where-Object { $_.Local -and -not $_.Remote })
  $remoteOnly = @($rows | Where-Object { -not $_.Local -and $_.Remote })

  return [pscustomobject]@{
    Rows = @($rows)
    Shared = $shared
    LocalOnly = $localOnly
    RemoteOnly = $remoteOnly
  }
}

function Assert-BinderLedgerV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Ledger,

    [ValidateSet('PreApply', 'PostApply')]
    [string]$ExpectedState
  )

  $policy = Get-BinderRolloutPolicyV1
  foreach ($row in @($Ledger.Shared)) {
    Assert-BinderConditionV1 ($row.Local -ceq $row.Remote) "Linked ledger mismatch: $($row.Local) != $($row.Remote)."
  }

  $allLocal = @($Ledger.Rows | Where-Object Local | ForEach-Object Local)
  $allRemote = @($Ledger.Rows | Where-Object Remote | ForEach-Object Remote)
  Assert-BinderConditionV1 ((@($allLocal | Sort-Object -Unique).Count) -eq $allLocal.Count) 'Duplicate local migration IDs detected.'
  Assert-BinderConditionV1 ((@($allRemote | Sort-Object -Unique).Count) -eq $allRemote.Count) 'Duplicate remote migration IDs detected.'
  Assert-BinderConditionV1 ($Ledger.RemoteOnly.Count -eq 0) 'Remote-only migrations detected; stop without repair.'

  if ($ExpectedState -eq 'PreApply') {
    $actual = @($Ledger.LocalOnly | ForEach-Object Local)
    Assert-BinderConditionV1 ($actual.Count -eq $policy.MigrationVersions.Count) 'Pending migration count is not exactly five.'
    for ($index = 0; $index -lt $policy.MigrationVersions.Count; $index += 1) {
      Assert-BinderConditionV1 ($actual[$index] -ceq $policy.MigrationVersions[$index]) "Pending migration order mismatch at position $index."
    }
    return
  }

  Assert-BinderConditionV1 ($Ledger.LocalOnly.Count -eq 0) 'Local-only migrations remain after apply.'
  $sharedIds = @($Ledger.Shared | ForEach-Object Local)
  foreach ($version in $policy.MigrationVersions) {
    Assert-BinderConditionV1 ($sharedIds -contains $version) "Applied Binder migration missing from linked ledger: $version"
  }
}

function Assert-ExactBinderPendingSetV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [object]$Ledger
  )

  Assert-BinderLedgerV1 -Ledger $Ledger -ExpectedState PreApply
}

function Assert-ExactBinderLedgerDeltaV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Before,

    [Parameter(Mandatory = $true)]
    [object]$After
  )

  $policy = Get-BinderRolloutPolicyV1
  $beforeRemote = @(
    $Before.Rows |
      Where-Object Remote |
      ForEach-Object Remote
  )
  $afterRemote = @(
    $After.Rows |
      Where-Object Remote |
      ForEach-Object Remote
  )
  $beforeSet = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
  )
  foreach ($version in $beforeRemote) {
    [void]$beforeSet.Add($version)
  }
  $afterSet = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
  )
  foreach ($version in $afterRemote) {
    [void]$afterSet.Add($version)
  }

  foreach ($version in $beforeRemote) {
    Assert-BinderConditionV1 (
      $afterSet.Contains($version)
    ) "Remote migration disappeared during apply: $version"
  }
  $delta = @(
    $afterRemote |
      Where-Object { -not $beforeSet.Contains($_) }
  )
  Assert-BinderConditionV1 (
    $delta.Count -eq $policy.MigrationVersions.Count
  ) 'Remote migration delta is not exactly five.'
  for ($index = 0; $index -lt $policy.MigrationVersions.Count; $index += 1) {
    Assert-BinderConditionV1 (
      $delta[$index] -ceq $policy.MigrationVersions[$index]
    ) "Remote migration delta mismatch at position $index."
  }
  Assert-BinderConditionV1 (
    $afterRemote.Count -eq
      ($beforeRemote.Count + $policy.MigrationVersions.Count)
  ) 'Remote migration ledger changed outside the exact Binder delta.'
}

function ConvertFrom-SupabaseDryRunV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text
  )

  $clean = Remove-AnsiV1 -Text $Text
  $lower = $clean.ToLowerInvariant()
  Assert-BinderConditionV1 (-not $lower.Contains('remote database is up to date')) 'Dry-run unexpectedly reported no pending migrations.'
  Assert-BinderConditionV1 (-not [regex]::IsMatch($lower, '\b(error|failed|repair)\b')) 'Dry-run output contained a failure or repair marker.'

  $ordered = [System.Collections.Generic.List[string]]::new()
  $seen = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
  )
  foreach ($match in [regex]::Matches(
    $clean,
    '\b\d{14}_[A-Za-z0-9_.-]+\.sql\b'
  )) {
    if ($seen.Add($match.Value)) {
      $ordered.Add($match.Value)
    }
  }

  $policy = Get-BinderRolloutPolicyV1
  Assert-BinderConditionV1 ($ordered.Count -eq $policy.MigrationFiles.Count) 'Dry-run did not identify exactly five migration files.'
  for ($index = 0; $index -lt $policy.MigrationFiles.Count; $index += 1) {
    Assert-BinderConditionV1 ($ordered[$index] -ceq $policy.MigrationFiles[$index]) "Dry-run migration order mismatch at position $index."
  }

  return [pscustomobject]@{
    MigrationFiles = @($ordered)
  }
}

function Assert-BinderSqlReadOnlyV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $sql = Get-Content -LiteralPath $Path -Raw
  $withoutStringLiterals = [regex]::Replace(
    $sql,
    "'(?:''|[^'])*'",
    "''"
  )
  $withoutComments = [regex]::Replace(
    $withoutStringLiterals,
    '(?ms)--.*?$|/\*.*?\*/',
    ''
  )
  Assert-BinderConditionV1 ($withoutComments.TrimStart() -match '^(?i:with)\b') "Readback SQL must be one CTE SELECT statement: $Path"
  Assert-BinderConditionV1 (-not $withoutComments.Contains(';')) "Readback SQL must contain exactly one prepared statement and no semicolon: $Path"
  Assert-BinderConditionV1 (
    -not [regex]::IsMatch(
      $withoutComments,
      '(?i)\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do|vacuum|analyze|refresh)\b'
    )
  ) "Mutation-capable SQL keyword detected in readback file: $Path"
}

function Get-BinderTrackedMigrationSetV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $migrationRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $RepoRoot 'supabase/migrations')
  )
  Assert-BinderConditionV1 (
    Test-Path -LiteralPath $migrationRoot -PathType Container
  ) 'Supabase migration directory was not found.'
  $migrationRootItem = Get-Item -LiteralPath $migrationRoot
  Assert-BinderConditionV1 (
    -not $migrationRootItem.Attributes.HasFlag(
      [System.IO.FileAttributes]::ReparsePoint
    )
  ) 'Supabase migration directory must not be a reparse point.'

  $trackedResult = Invoke-BinderGitV1 `
    -Arguments @(
      'ls-files',
      '--stage',
      '--',
      ':(top,glob)supabase/migrations/*.sql'
    ) `
    -RepoRoot $RepoRoot
  Assert-BinderCommandSucceededV1 `
    -Result $trackedResult `
    -Label 'tracked migration inventory'

  $trackedRows = [System.Collections.Generic.List[object]]::new()
  foreach ($line in ($trackedResult.StdOut -split "`r?`n")) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    $match = [regex]::Match(
      $line,
      '^(?<mode>\d{6}) (?<blob>[0-9a-f]{40,64}) (?<stage>\d+)\t(?<path>.+)$'
    )
    Assert-BinderConditionV1 $match.Success "Unparseable tracked migration row: $line"
    Assert-BinderConditionV1 (
      $match.Groups['mode'].Value -ceq '100644'
    ) "Tracked migration is not a regular non-executable file: $line"
    Assert-BinderConditionV1 (
      $match.Groups['stage'].Value -ceq '0'
    ) "Tracked migration has an unresolved index stage: $line"

    $relativePath = $match.Groups['path'].Value.Replace('\', '/')
    Assert-BinderConditionV1 (
      $relativePath -cmatch
        '^supabase/migrations/\d{8,14}_[A-Za-z0-9_.-]+\.sql$'
    ) "Tracked top-level migration has an invalid path: $relativePath"
    $trackedRows.Add([pscustomobject][ordered]@{
      RelativePath = $relativePath
      GitBlobSha = $match.Groups['blob'].Value
    })
  }
  Assert-BinderConditionV1 (
    $trackedRows.Count -gt 0
  ) 'No tracked top-level Supabase migrations were found.'

  $trackedRows = @(
    $trackedRows |
      Sort-Object -Property RelativePath -CaseSensitive
  )
  $workingRows = @(
    Get-ChildItem -LiteralPath $migrationRoot -File -Filter '*.sql' -Force |
      ForEach-Object {
        $relativePath = (
          'supabase/migrations/' + $_.Name
        ).Replace('\', '/')
        [pscustomobject][ordered]@{
          RelativePath = $relativePath
          FullPath = $_.FullName
          Item = $_
        }
      } |
      Sort-Object -Property RelativePath -CaseSensitive
  )
  Assert-BinderConditionV1 (
    $workingRows.Count -eq $trackedRows.Count
  ) 'Working migration set does not exactly match the tracked top-level SQL set.'
  for ($index = 0; $index -lt $trackedRows.Count; $index += 1) {
    Assert-BinderConditionV1 (
      $workingRows[$index].RelativePath -ceq
        $trackedRows[$index].RelativePath
    ) "Working migration set drift at position $index."
    Assert-BinderConditionV1 (
      -not $workingRows[$index].Item.Attributes.HasFlag(
        [System.IO.FileAttributes]::ReparsePoint
      )
    ) "Tracked migration must not be a reparse point: $($workingRows[$index].RelativePath)"
  }

  $entries = @(
    for ($index = 0; $index -lt $trackedRows.Count; $index += 1) {
      [pscustomobject][ordered]@{
        RelativePath = $trackedRows[$index].RelativePath
        FullPath = $workingRows[$index].FullPath
        GitBlobSha = $trackedRows[$index].GitBlobSha
        Sha256 = Get-BinderSha256FileV1 -Path $workingRows[$index].FullPath
      }
    }
  )
  $setFingerprint = Get-BinderSha256StringV1 -Value (
    @(
      $entries | ForEach-Object {
        "$($_.RelativePath)|$($_.Sha256)"
      }
    ) -join "`n"
  )

  return [pscustomobject][ordered]@{
    Count = $entries.Count
    Sha256 = $setFingerprint
    Entries = $entries
  }
}

function Test-BinderSourceV1 {
  [CmdletBinding()]
  param(
    [string]$RepoRoot = (Get-BinderRepoRootV1)
  )

  $policy = Get-BinderRolloutPolicyV1
  $package = Read-BinderPackageManifestV1 -RepoRoot $RepoRoot
  $trackedMigrationSet = Get-BinderTrackedMigrationSetV1 -RepoRoot $RepoRoot

  Assert-BinderConditionV1 (@($package.Data.migrations).Count -eq 5) 'Package manifest must contain exactly five migrations.'
  for ($index = 0; $index -lt $policy.MigrationFiles.Count; $index += 1) {
    $entry = @($package.Data.migrations)[$index]
    Assert-BinderConditionV1 ($entry.version -ceq $policy.MigrationVersions[$index]) "Manifest migration version mismatch at position $index."
    Assert-BinderConditionV1 ($entry.file -ceq $policy.MigrationFiles[$index]) "Manifest migration filename mismatch at position $index."
    Assert-BinderConditionV1 ($entry.sha256 -ceq $policy.MigrationSha256[$index]) "Manifest migration hash mismatch at position $index."

    $path = Join-Path $RepoRoot "supabase/migrations/$($entry.file)"
    $actualHash = Get-BinderSha256FileV1 -Path $path
    Assert-BinderConditionV1 ($actualHash -ceq $entry.sha256) "Migration bytes have drifted: $($entry.file)"
  }

  $preflightSql = Join-Path $RepoRoot $policy.PreflightSqlRelativePath
  $postApplySql = Join-Path $RepoRoot $policy.PostApplySqlRelativePath
  $expectedReadbacks = @(
    [pscustomobject]@{
      Phase = 'pre_apply'
      File = $policy.PreflightSqlRelativePath.Replace('\', '/')
    },
    [pscustomobject]@{
      Phase = 'post_apply'
      File = $policy.PostApplySqlRelativePath.Replace('\', '/')
    }
  )
  Assert-BinderConditionV1 (@($package.Data.readback_sql).Count -eq 2) 'Package manifest must contain exactly two readback SQL files.'
  for ($index = 0; $index -lt $expectedReadbacks.Count; $index += 1) {
    $entry = @($package.Data.readback_sql)[$index]
    Assert-BinderConditionV1 ($entry.phase -ceq $expectedReadbacks[$index].Phase) "Readback SQL phase mismatch at position $index."
    Assert-BinderConditionV1 ($entry.file.Replace('\', '/') -ceq $expectedReadbacks[$index].File) "Readback SQL path mismatch at position $index."
    $actualReadbackHash = Get-BinderSha256FileV1 -Path (
      Join-Path $RepoRoot $entry.file
    )
    Assert-BinderConditionV1 ($actualReadbackHash -ceq $entry.sha256) "Readback SQL bytes have drifted: $($entry.file)"
  }
  Assert-BinderSqlReadOnlyV1 -Path $preflightSql
  Assert-BinderSqlReadOnlyV1 -Path $postApplySql

  $configPath = Join-Path $RepoRoot 'supabase/config.toml'
  $config = Get-Content -LiteralPath $configPath -Raw
  $projectMatch = [regex]::Match(
    $config,
    '(?m)^\s*project_id\s*=\s*"(?<ref>[^"]+)"\s*$'
  )
  Assert-BinderConditionV1 ($projectMatch.Success) 'supabase/config.toml has no project_id.'
  Assert-BinderConditionV1 ($projectMatch.Groups['ref'].Value -ceq $policy.ProjectRef) 'supabase/config.toml project_id is not production.'

  $originResult = Invoke-BinderGitV1 -Arguments @('remote', 'get-url', 'origin') -RepoRoot $RepoRoot
  Assert-BinderCommandSucceededV1 -Result $originResult -Label 'git remote get-url origin'
  $origin = $originResult.StdOut.Trim()
  $normalizedOrigin = $origin `
    -replace '^https://github\.com/', '' `
    -replace '^git@github\.com:', '' `
    -replace '\.git$', ''
  Assert-BinderConditionV1 ($normalizedOrigin -ceq $policy.CanonicalRepository) 'Git origin is not the canonical Grookai Vault repository.'

  $ancestorResult = Invoke-BinderGitV1 `
    -Arguments @('cat-file', '-e', "$($policy.RequiredAncestorSha)^{commit}") `
    -RepoRoot $RepoRoot
  Assert-BinderCommandSucceededV1 -Result $ancestorResult -Label 'required ancestor lookup'

  $supabaseExecutable = Get-BinderSupabaseExecutableV1
  $versionResult = Invoke-BinderProcessV1 `
    -FilePath $supabaseExecutable.BinaryPath `
    -Arguments @('--version') `
    -WorkingDirectory $RepoRoot `
    -TimeoutSeconds 30
  Assert-BinderCommandSucceededV1 -Result $versionResult -Label 'supabase --version'
  $version = $versionResult.StdOut.Trim()
  Assert-BinderConditionV1 ($version -ceq $policy.SupportedSupabaseCliVersion) "Supabase CLI must be exactly $($policy.SupportedSupabaseCliVersion); found $version."
  $launcherSha256 = Get-BinderSha256FileV1 -Path $supabaseExecutable.LauncherPath
  $binarySha256 = Get-BinderSha256FileV1 -Path $supabaseExecutable.BinaryPath
  Assert-BinderConditionV1 (
    -not [string]::IsNullOrWhiteSpace(
      [string]$supabaseExecutable.ShimDescriptorPath
    )
  ) 'The reviewed Supabase Scoop shim descriptor is missing.'
  $shimDescriptorSha256 = Get-BinderSha256FileV1 `
    -Path $supabaseExecutable.ShimDescriptorPath
  Assert-BinderConditionV1 (
    $launcherSha256 -ceq $policy.SupabaseCliLauncherSha256
  ) 'Supabase CLI launcher is not the reviewed binary.'
  Assert-BinderConditionV1 (
    $binarySha256 -ceq $policy.SupabaseCliBinarySha256
  ) 'Supabase CLI binary is not the reviewed binary.'
  Assert-BinderConditionV1 (
    $shimDescriptorSha256 -ceq
      $policy.SupabaseCliShimDescriptorSha256
  ) 'Supabase CLI shim descriptor is not the reviewed descriptor.'

  return [pscustomobject][ordered]@{
    Status = 'pass'
    PackageId = $policy.PackageId
    PackageFingerprintSha256 = $package.FingerprintSha256
    PackageManifestFileSha256 = $package.FileSha256
    ProjectRef = $policy.ProjectRef
    SupabaseCliVersion = $version
    SupabaseCliLauncherSha256 = $launcherSha256
    SupabaseCliBinarySha256 = $binarySha256
    SupabaseCliShimDescriptorSha256 = $shimDescriptorSha256
    TrackedMigrationCount = $trackedMigrationSet.Count
    TrackedMigrationSetSha256 = $trackedMigrationSet.Sha256
    MigrationFiles = @(
      for ($index = 0; $index -lt $policy.MigrationFiles.Count; $index += 1) {
        [pscustomobject][ordered]@{
          version = $policy.MigrationVersions[$index]
          file = $policy.MigrationFiles[$index]
          sha256 = $policy.MigrationSha256[$index]
        }
      }
    )
  }
}

function Assert-BinderRepositoryStateV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedHeadSha
  )

  $policy = Get-BinderRolloutPolicyV1
  Assert-BinderConditionV1 ($ExpectedHeadSha -cmatch '^[0-9a-f]{40}$') 'ExpectedHeadSha must be a lowercase 40-character commit SHA.'

  $status = Invoke-BinderGitV1 `
    -Arguments @('status', '--porcelain=v1', '--untracked-files=all') `
    -RepoRoot $RepoRoot
  Assert-BinderCommandSucceededV1 -Result $status -Label 'git status'
  Assert-BinderConditionV1 ([string]::IsNullOrWhiteSpace($status.StdOut)) 'Production rollout requires a completely clean worktree.'

  $head = Invoke-BinderGitV1 -Arguments @('rev-parse', 'HEAD') -RepoRoot $RepoRoot
  Assert-BinderCommandSucceededV1 -Result $head -Label 'git rev-parse HEAD'
  Assert-BinderConditionV1 ($head.StdOut.Trim() -ceq $ExpectedHeadSha) 'Current HEAD does not match the reviewed rollout SHA.'

  $branch = Invoke-BinderGitV1 -Arguments @('branch', '--show-current') -RepoRoot $RepoRoot
  Assert-BinderCommandSucceededV1 -Result $branch -Label 'git branch --show-current'
  Assert-BinderConditionV1 ($branch.StdOut.Trim() -ceq 'main') 'Production rollout must run from the main branch.'

  $remote = Invoke-BinderGitV1 `
    -Arguments @('ls-remote', 'origin', 'refs/heads/main') `
    -RepoRoot $RepoRoot `
    -TimeoutSeconds 60
  Assert-BinderCommandSucceededV1 -Result $remote -Label 'git ls-remote origin main'
  $remoteSha = (($remote.StdOut.Trim() -split '\s+')[0])
  Assert-BinderConditionV1 ($remoteSha -ceq $ExpectedHeadSha) 'origin/main does not match the reviewed rollout SHA.'

  $ancestor = Invoke-BinderGitV1 `
    -Arguments @('merge-base', '--is-ancestor', $policy.RequiredAncestorSha, $ExpectedHeadSha) `
    -RepoRoot $RepoRoot
  Assert-BinderCommandSucceededV1 -Result $ancestor -Label 'Binder required ancestor check'

  return [pscustomobject][ordered]@{
    HeadSha = $ExpectedHeadSha
    OriginMainSha = $remoteSha
    Branch = 'main'
    Clean = $true
  }
}

function Assert-BinderNoRoutingOverridesV1 {
  $present = @(
    foreach ($entry in Get-ChildItem Env:) {
      if (Test-BinderRoutingEnvironmentNameV1 -Name $entry.Name) {
        $entry.Name
      }
    }
  )
  Assert-BinderConditionV1 ($present.Count -eq 0) "Database routing overrides are forbidden for this rollout: $($present -join ', ')"
}

function Assert-ProjectBindingV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $policy = Get-BinderRolloutPolicyV1
  Assert-BinderNoRoutingOverridesV1

  $linkedRefPath = Join-Path $RepoRoot 'supabase/.temp/project-ref'
  Assert-BinderConditionV1 (Test-Path -LiteralPath $linkedRefPath -PathType Leaf) 'This worktree is not explicitly linked; refusing to link automatically.'
  $linkedRef = (Get-Content -LiteralPath $linkedRefPath -Raw).Trim()
  Assert-BinderConditionV1 ($linkedRef -ceq $policy.ProjectRef) 'Linked Supabase project ref is not production.'

  Assert-BinderConditionV1 (-not [string]::IsNullOrWhiteSpace($env:SUPABASE_URL)) 'SUPABASE_URL is required for independent project binding.'
  try {
    $supabaseUri = [uri]$env:SUPABASE_URL
  } catch {
    throw 'SUPABASE_URL is not a valid absolute URL.'
  }
  Assert-BinderConditionV1 ($supabaseUri.Scheme -ceq 'https') 'SUPABASE_URL must use HTTPS.'
  Assert-BinderConditionV1 ($supabaseUri.Host -ceq "$($policy.ProjectRef).supabase.co") 'SUPABASE_URL host is not the production project.'
  Assert-BinderConditionV1 ($supabaseUri.IsDefaultPort -or $supabaseUri.Port -eq 443) 'SUPABASE_URL must use the standard HTTPS port.'
  Assert-BinderConditionV1 ([string]::IsNullOrWhiteSpace($supabaseUri.UserInfo)) 'SUPABASE_URL must not contain credentials.'
  Assert-BinderConditionV1 ($supabaseUri.AbsolutePath -ceq '/') 'SUPABASE_URL must be the exact project origin without a path.'
  Assert-BinderConditionV1 ([string]::IsNullOrWhiteSpace($supabaseUri.Query)) 'SUPABASE_URL must not contain a query.'
  Assert-BinderConditionV1 ([string]::IsNullOrWhiteSpace($supabaseUri.Fragment)) 'SUPABASE_URL must not contain a fragment.'

  $projectsResult = Invoke-BinderSupabaseV1 `
    -Arguments @('projects', 'list', '--output', 'json', '--agent', 'no') `
    -RepoRoot $RepoRoot `
    -TimeoutSeconds 60
  Assert-BinderCommandSucceededV1 -Result $projectsResult -Label 'supabase projects list'
  $projects = @($projectsResult.StdOut | ConvertFrom-Json)
  $matches = @($projects | Where-Object {
    ($_.ref -ceq $policy.ProjectRef -or $_.id -ceq $policy.ProjectRef) -and
    $_.status -ceq 'ACTIVE_HEALTHY'
  })
  Assert-BinderConditionV1 ($matches.Count -eq 1) 'Production project was not identified exactly once as ACTIVE_HEALTHY.'
  $databaseHost = [string]$matches[0].database.host
  Assert-BinderConditionV1 ($databaseHost -ceq "db.$($policy.ProjectRef).supabase.co") 'Project database host does not match production.'

  return [pscustomobject][ordered]@{
    ProjectRef = $policy.ProjectRef
    ApiHost = $supabaseUri.Host
    DatabaseHost = $databaseHost
    Status = [string]$matches[0].status
  }
}

function Test-BackupEvidenceV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [datetime]$NowUtc = [datetime]::UtcNow
  )

  $policy = Get-BinderRolloutPolicyV1
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $rootPath = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/')
  Assert-BinderConditionV1 (-not $fullPath.StartsWith("$rootPath\", [System.StringComparison]::OrdinalIgnoreCase)) 'Backup evidence must be outside the repository.'
  Assert-BinderConditionV1 (Test-Path -LiteralPath $fullPath -PathType Leaf) 'Backup evidence file does not exist.'

  $evidence = Get-Content -LiteralPath $fullPath -Raw | ConvertFrom-Json
  $allowedProperties = @(
    'schema_version',
    'project_ref',
    'backup_kind',
    'verified_at_utc',
    'recoverable_through_utc',
    'evidence_reference',
    'restore_path_reviewed',
    'operator'
  )
  $actualProperties = @($evidence.PSObject.Properties.Name | Sort-Object)
  $expectedProperties = @($allowedProperties | Sort-Object)
  Assert-BinderConditionV1 (($actualProperties -join "`n") -ceq ($expectedProperties -join "`n")) 'Backup evidence fields are missing or unexpected.'
  Assert-BinderConditionV1 ($evidence.schema_version -eq 1) 'Backup evidence schema version mismatch.'
  Assert-BinderConditionV1 ($evidence.project_ref -ceq $policy.ProjectRef) 'Backup evidence project mismatch.'
  Assert-BinderConditionV1 (@('supabase_pitr', 'supabase_platform_backup', 'verified_logical_backup') -ccontains $evidence.backup_kind) 'Unsupported backup evidence kind.'
  Assert-BinderConditionV1 ($evidence.restore_path_reviewed -eq $true) 'Backup restore path has not been reviewed.'
  Assert-BinderConditionV1 (-not [string]::IsNullOrWhiteSpace($evidence.evidence_reference)) 'Backup evidence reference is blank.'
  Assert-BinderConditionV1 (-not [string]::IsNullOrWhiteSpace($evidence.operator)) 'Backup evidence operator is blank.'

  $verifiedAt = [datetime]::Parse(
    [string]$evidence.verified_at_utc,
    [cultureinfo]::InvariantCulture,
    [System.Globalization.DateTimeStyles]::AdjustToUniversal
  )
  $recoverableThrough = [datetime]::Parse(
    [string]$evidence.recoverable_through_utc,
    [cultureinfo]::InvariantCulture,
    [System.Globalization.DateTimeStyles]::AdjustToUniversal
  )
  Assert-BinderConditionV1 ($verifiedAt -le $NowUtc.AddMinutes(5)) 'Backup verification time is in the future.'
  Assert-BinderConditionV1 ($verifiedAt -ge $NowUtc.AddHours(-$policy.BackupMaxAgeHours)) 'Backup verification is stale.'
  Assert-BinderConditionV1 ($recoverableThrough -le $NowUtc.AddMinutes(5)) 'Backup recovery horizon is in the future.'
  Assert-BinderConditionV1 ($recoverableThrough -ge $NowUtc.AddMinutes(-$policy.BackupRecoveryLagMinutes)) 'Backup recovery horizon is too old.'

  return [pscustomobject][ordered]@{
    Path = $fullPath
    Sha256 = Get-BinderSha256FileV1 -Path $fullPath
    Kind = [string]$evidence.backup_kind
    VerifiedAtUtc = $verifiedAt.ToString('o')
    RecoverableThroughUtc = $recoverableThrough.ToString('o')
    EvidenceReference = [string]$evidence.evidence_reference
    RestorePathReviewed = $true
    Operator = [string]$evidence.operator
  }
}

function Get-BinderWorktreePathsV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $result = Invoke-BinderGitV1 -Arguments @('worktree', 'list', '--porcelain') -RepoRoot $RepoRoot
  Assert-BinderCommandSucceededV1 -Result $result -Label 'git worktree list'
  return @(
    foreach ($line in ($result.StdOut -split "`r?`n")) {
      if ($line.StartsWith('worktree ')) {
        [System.IO.Path]::GetFullPath($line.Substring(9).Trim()).TrimEnd('\', '/')
      }
    }
  )
}

function Assert-BinderArtifactRootV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [bool]$MustExist
  )

  Assert-BinderConditionV1 ([System.IO.Path]::IsPathFullyQualified($Path)) 'ArtifactRoot must be an absolute path.'
  $fullPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
  if ($MustExist) {
    Assert-BinderConditionV1 (Test-Path -LiteralPath $fullPath -PathType Container) 'ArtifactRoot does not exist.'
  } else {
    Assert-BinderConditionV1 (-not (Test-Path -LiteralPath $fullPath)) 'ArtifactRoot must not already exist.'
  }

  foreach ($worktree in (Get-BinderWorktreePathsV1 -RepoRoot $RepoRoot)) {
    $insideWorktree = (
      $fullPath.Equals(
        $worktree,
        [System.StringComparison]::OrdinalIgnoreCase
      ) -or
      $fullPath.StartsWith(
        "$worktree\",
        [System.StringComparison]::OrdinalIgnoreCase
      )
    )
    Assert-BinderConditionV1 (-not $insideWorktree) "ArtifactRoot must be outside every Git worktree: $worktree"
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
  while ($cursor -and (Test-Path -LiteralPath $cursor)) {
    $item = Get-Item -LiteralPath $cursor
    Assert-BinderConditionV1 (
      -not $item.Attributes.HasFlag(
        [System.IO.FileAttributes]::ReparsePoint
      )
    ) "ArtifactRoot path contains a reparse point: $cursor"
    $parent = Split-Path -Parent $cursor
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -ceq $cursor) {
      break
    }
    $cursor = $parent
  }

  return $fullPath
}

function New-BinderArtifactRootV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $fullPath = Assert-BinderArtifactRootV1 `
    -Path $Path `
    -RepoRoot $RepoRoot `
    -MustExist $false
  [void][System.IO.Directory]::CreateDirectory($fullPath)
  [void](Assert-BinderArtifactRootV1 `
    -Path $fullPath `
    -RepoRoot $RepoRoot `
    -MustExist $true)
  return $fullPath
}

function Write-BinderAtomicTextV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Value
  )

  $fullPath = [System.IO.Path]::GetFullPath($Path)
  Assert-BinderConditionV1 (-not (Test-Path -LiteralPath $fullPath)) "Evidence file already exists: $fullPath"
  $directory = Split-Path -Parent $fullPath
  Assert-BinderConditionV1 (Test-Path -LiteralPath $directory -PathType Container) "Evidence directory does not exist: $directory"
  $temporaryPath = Join-Path $directory (
    '.binder-rollout-' + [guid]::NewGuid().ToString('N') + '.tmp'
  )
  try {
    [System.IO.File]::WriteAllText(
      $temporaryPath,
      $Value,
      [System.Text.UTF8Encoding]::new($false)
    )
    [System.IO.File]::Move(
      $temporaryPath,
      $fullPath,
      $false
    )
  } finally {
    if (Test-Path -LiteralPath $temporaryPath) {
      Remove-Item -LiteralPath $temporaryPath -Force
    }
  }
}

function Write-BinderJsonV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [object]$Value
  )

  $json = $Value | ConvertTo-Json -Depth 32
  Write-BinderAtomicTextV1 `
    -Path $Path `
    -Value ($json + [Environment]::NewLine)
}

function Write-BinderTextV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [AllowEmptyString()]
    [string]$Value = ''
  )

  Write-BinderAtomicTextV1 -Path $Path -Value $Value
}

function Write-BinderChecksumsV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root
  )

  $checksumPath = Join-Path $Root 'checksums.sha256'
  Assert-BinderConditionV1 (-not (Test-Path -LiteralPath $checksumPath)) 'Checksum bundle already exists.'
  $lines = @(
    Get-ChildItem -LiteralPath $Root -File -Recurse |
      Where-Object { $_.FullName -cne $checksumPath } |
      Sort-Object FullName |
      ForEach-Object {
        $relative = [System.IO.Path]::GetRelativePath(
          $Root,
          $_.FullName
        ).Replace('\', '/')
        "$(Get-BinderSha256FileV1 -Path $_.FullName)  $relative"
      }
  )
  Write-BinderTextV1 `
    -Path $checksumPath `
    -Value (($lines -join "`n") + "`n")
}

function Assert-BinderSafeStageRootV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [bool]$MustExist
  )

  $fullPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
  $temporaryRoot = [System.IO.Path]::GetFullPath(
    [System.IO.Path]::GetTempPath()
  ).TrimEnd('\', '/')
  Assert-BinderConditionV1 (
    (Split-Path -Parent $fullPath).Equals(
      $temporaryRoot,
      [System.StringComparison]::OrdinalIgnoreCase
    )
  ) 'Staged Supabase root must be a direct child of the OS temporary directory.'
  Assert-BinderConditionV1 (
    (Split-Path -Leaf $fullPath) -cmatch
      '^grookai-binder-rollout-v1-[0-9a-f]{32}$'
  ) 'Staged Supabase root name is invalid.'
  $temporaryRootItem = Get-Item -LiteralPath $temporaryRoot
  Assert-BinderConditionV1 (
    -not $temporaryRootItem.Attributes.HasFlag(
      [System.IO.FileAttributes]::ReparsePoint
    )
  ) 'OS temporary directory must not be a reparse point.'
  if ($MustExist) {
    Assert-BinderConditionV1 (
      Test-Path -LiteralPath $fullPath -PathType Container
    ) 'Staged Supabase root no longer exists.'
    $item = Get-Item -LiteralPath $fullPath
    Assert-BinderConditionV1 (
      -not $item.Attributes.HasFlag(
        [System.IO.FileAttributes]::ReparsePoint
      )
    ) 'Staged Supabase root must not be a reparse point.'
  } else {
    Assert-BinderConditionV1 (
      -not (Test-Path -LiteralPath $fullPath)
    ) 'Staged Supabase root already exists.'
  }
  return $fullPath
}

function Restore-BinderDirectoryAclV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$Sddl
  )

  $acl = Get-Acl -LiteralPath $Path
  $acl.SetSecurityDescriptorSddlForm($Sddl)
  Set-Acl -LiteralPath $Path -AclObject $acl
}

function Protect-BinderStagedMigrationDirectoryV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  Assert-BinderConditionV1 $IsWindows 'Production staging requires Windows ACL enforcement.'
  $acl = Get-Acl -LiteralPath $Path
  $originalSddl = $acl.Sddl
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
  Assert-BinderConditionV1 (
    $null -ne $identity
  ) 'Current Windows identity SID could not be resolved.'
  $rights = (
    [System.Security.AccessControl.FileSystemRights]::CreateFiles -bor
    [System.Security.AccessControl.FileSystemRights]::CreateDirectories -bor
    [System.Security.AccessControl.FileSystemRights]::WriteData -bor
    [System.Security.AccessControl.FileSystemRights]::AppendData -bor
    [System.Security.AccessControl.FileSystemRights]::WriteAttributes -bor
    [System.Security.AccessControl.FileSystemRights]::WriteExtendedAttributes -bor
    [System.Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor
    [System.Security.AccessControl.FileSystemRights]::Delete
  )
  $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
    $identity,
    $rights,
    (
      [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor
      [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
    ),
    [System.Security.AccessControl.PropagationFlags]::None,
    [System.Security.AccessControl.AccessControlType]::Deny
  )
  $probePath = Join-Path $Path (
    '.write-denial-probe-' + [guid]::NewGuid().ToString('N') + '.sql'
  )
  try {
    [void]$acl.AddAccessRule($rule)
    Set-Acl -LiteralPath $Path -AclObject $acl

    $creationDenied = $false
    try {
      $probe = [System.IO.File]::Open(
        $probePath,
        [System.IO.FileMode]::CreateNew,
        [System.IO.FileAccess]::Write,
        [System.IO.FileShare]::None
      )
      $probe.Dispose()
    } catch {
      $exception = $_.Exception
      $creationDenied = (
        $exception -is [System.UnauthorizedAccessException] -or
        $exception.InnerException -is [System.UnauthorizedAccessException]
      )
      if (-not $creationDenied) {
        throw
      }
    }
    Assert-BinderConditionV1 $creationDenied 'Staged migration directory still permits file creation.'
    Assert-BinderConditionV1 (
      -not (Test-Path -LiteralPath $probePath)
    ) 'Staged migration ACL probe unexpectedly created a file.'
    return $originalSddl
  } catch {
    try {
      Restore-BinderDirectoryAclV1 -Path $Path -Sddl $originalSddl
    } catch {
    }
    if (Test-Path -LiteralPath $probePath) {
      Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue
    }
    throw
  }
}

function Get-BinderSealedStageManifestV1 {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Stage
  )

  [void](Assert-BinderSafeStageRootV1 -Path $Stage.Root -MustExist $true)
  $expectedEntries = @(
    $Stage.MigrationEntries |
      Sort-Object -Property RelativePath -CaseSensitive
  )
  $actualFiles = @(
    Get-ChildItem `
      -LiteralPath $Stage.MigrationDirectory `
      -File `
      -Filter '*.sql' `
      -Force |
      Sort-Object -Property Name -CaseSensitive
  )
  Assert-BinderConditionV1 (
    $actualFiles.Count -eq $expectedEntries.Count
  ) 'Sealed staged migration file count is not exact.'

  $sealedEntries = @(
    for ($index = 0; $index -lt $expectedEntries.Count; $index += 1) {
      $expected = $expectedEntries[$index]
      $actual = $actualFiles[$index]
      $expectedLeaf = Split-Path -Leaf ([string]$expected.RelativePath)
      Assert-BinderConditionV1 (
        $actual.Name -ceq $expectedLeaf
      ) "Sealed staged migration set drift at position $index."
      Assert-BinderConditionV1 (
        -not $actual.Attributes.HasFlag(
          [System.IO.FileAttributes]::ReparsePoint
        )
      ) "Sealed staged migration is a reparse point: $($actual.Name)"
      $actualHash = Get-BinderSha256FileV1 -Path $actual.FullName
      Assert-BinderConditionV1 (
        $actualHash -ceq [string]$expected.Sha256
      ) "Sealed staged migration hash mismatch: $($actual.Name)"
      [pscustomobject][ordered]@{
        file = $actual.Name
        sha256 = $actualHash
      }
    }
  )
  $setFingerprint = Get-BinderSha256StringV1 -Value (
    @(
      $sealedEntries | ForEach-Object {
        "supabase/migrations/$($_.file)|$($_.sha256)"
      }
    ) -join "`n"
  )
  Assert-BinderConditionV1 (
    $setFingerprint -ceq [string]$Stage.MigrationSetSha256
  ) 'Sealed staged migration-set fingerprint mismatch.'

  $configHash = Get-BinderSha256FileV1 -Path $Stage.ConfigPath
  Assert-BinderConditionV1 (
    $configHash -ceq [string]$Stage.ExpectedConfigSha256
  ) 'Sealed staged Supabase config hash mismatch.'
  $projectRef = (
    Get-Content -LiteralPath $Stage.ProjectRefPath -Raw
  ).Trim()
  $policy = Get-BinderRolloutPolicyV1
  Assert-BinderConditionV1 (
    $projectRef -ceq $policy.ProjectRef
  ) 'Sealed staged project ref changed.'

  return [pscustomobject][ordered]@{
    schema_version = 1
    migration_count = $sealedEntries.Count
    migration_set_sha256 = $setFingerprint
    config_sha256 = $configHash
    project_ref = $projectRef
    migrations = $sealedEntries
  }
}

function Close-BinderSupabaseStageV1 {
  param(
    [object]$Stage
  )

  if ($null -eq $Stage) {
    return [pscustomobject][ordered]@{
      Succeeded = $true
      Root = $null
      Message = ''
    }
  }

  $messages = [System.Collections.Generic.List[string]]::new()
  foreach ($stream in @($Stage.Streams)) {
    if ($null -ne $stream) {
      try {
        $stream.Dispose()
      } catch {
        $messages.Add($_.Exception.Message)
      }
    }
  }
  if (-not (Test-Path -LiteralPath $Stage.Root)) {
    try {
      [void](Assert-BinderSafeStageRootV1 `
        -Path $Stage.Root `
        -MustExist $false)
    } catch {
      $messages.Add($_.Exception.Message)
    }
    return [pscustomobject][ordered]@{
      Succeeded = ($messages.Count -eq 0)
      Root = [string]$Stage.Root
      Message = ($messages -join ' | ')
    }
  }
  try {
    $safeRoot = Assert-BinderSafeStageRootV1 `
      -Path $Stage.Root `
      -MustExist $true
    foreach ($entry in @($Stage.OriginalMigrationFileAcls)) {
      if (Test-Path -LiteralPath $entry.Path -PathType Leaf) {
        Restore-BinderDirectoryAclV1 `
          -Path $entry.Path `
          -Sddl $entry.Sddl
      }
    }
    if (-not [string]::IsNullOrWhiteSpace(
      [string]$Stage.OriginalMigrationAclSddl
    )) {
      Restore-BinderDirectoryAclV1 `
        -Path $Stage.MigrationDirectory `
        -Sddl $Stage.OriginalMigrationAclSddl
    }
    Remove-Item -LiteralPath $safeRoot -Recurse -Force
    Assert-BinderConditionV1 (
      -not (Test-Path -LiteralPath $safeRoot)
    ) 'Staged Supabase root was not removed.'
  } catch {
    $messages.Add($_.Exception.Message)
  }

  return [pscustomobject][ordered]@{
    Succeeded = ($messages.Count -eq 0)
    Root = [string]$Stage.Root
    Message = ($messages -join ' | ')
  }
}

function New-BinderSupabaseStageV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [object]$TrackedMigrationSet,

    [object]$StageLifecycle
  )

  $policy = Get-BinderRolloutPolicyV1
  $stageRoot = Join-Path (
    [System.IO.Path]::GetTempPath()
  ) (
    'grookai-binder-rollout-v1-' + [guid]::NewGuid().ToString('N')
  )
  $stageRoot = Assert-BinderSafeStageRootV1 `
    -Path $stageRoot `
    -MustExist $false
  $migrationDirectory = Join-Path $stageRoot 'supabase/migrations'
  $tempDirectory = Join-Path $stageRoot 'supabase/.temp'
  $stage = [pscustomobject][ordered]@{
    Root = $stageRoot
    MigrationDirectory = $migrationDirectory
    OriginalMigrationAclSddl = $null
    OriginalMigrationFileAcls = @()
    Streams = @()
    MigrationCount = 0
    MigrationSetSha256 = ''
    MigrationEntries = @()
    ConfigPath = ''
    ProjectRefPath = ''
    ExpectedConfigSha256 = ''
    SealedManifest = $null
  }
  if ($null -ne $StageLifecycle) {
    $StageLifecycle.CreatedRoot = $stageRoot
    $StageLifecycle.CleanupAttempted = $false
    $StageLifecycle.CleanupSucceeded = $null
    $StageLifecycle.CleanupMessage = ''
  }

  try {
    [void][System.IO.Directory]::CreateDirectory($migrationDirectory)
    [void][System.IO.Directory]::CreateDirectory($tempDirectory)
    [void](Assert-BinderSafeStageRootV1 -Path $stageRoot -MustExist $true)

    $sourceConfig = Join-Path $RepoRoot 'supabase/config.toml'
    $sourceProjectRef = Join-Path $RepoRoot 'supabase/.temp/project-ref'
    Assert-BinderConditionV1 (
      Test-Path -LiteralPath $sourceConfig -PathType Leaf
    ) 'Supabase config is missing while staging.'
    Assert-BinderConditionV1 (
      Test-Path -LiteralPath $sourceProjectRef -PathType Leaf
    ) 'Linked project ref is missing while staging.'
    $stagedConfig = Join-Path $stageRoot 'supabase/config.toml'
    $stagedProjectRef = Join-Path $tempDirectory 'project-ref'
    [System.IO.File]::Copy($sourceConfig, $stagedConfig, $false)
    [System.IO.File]::Copy($sourceProjectRef, $stagedProjectRef, $false)
    $sourceConfigHash = Get-BinderSha256FileV1 -Path $sourceConfig
    Assert-BinderConditionV1 (
      (Get-BinderSha256FileV1 -Path $stagedConfig) -ceq
        $sourceConfigHash
    ) 'Staged Supabase config hash mismatch.'
    Assert-BinderConditionV1 (
      (Get-Content -LiteralPath $stagedProjectRef -Raw).Trim() -ceq
        $policy.ProjectRef
    ) 'Staged project ref is not production.'

    $stagedEntries = [System.Collections.Generic.List[object]]::new()
    foreach ($entry in @($TrackedMigrationSet.Entries)) {
      $leaf = Split-Path -Leaf ([string]$entry.RelativePath)
      Assert-BinderConditionV1 (
        $leaf -cmatch '^\d{8,14}_[A-Za-z0-9_.-]+\.sql$'
      ) "Invalid migration entry supplied to staging: $($entry.RelativePath)"
      $destination = Join-Path $migrationDirectory $leaf
      [System.IO.File]::Copy(
        [string]$entry.FullPath,
        $destination,
        $false
      )
      $actualHash = Get-BinderSha256FileV1 -Path $destination
      Assert-BinderConditionV1 (
        $actualHash -ceq [string]$entry.Sha256
      ) "Staged migration hash mismatch: $leaf"
      $stagedEntries.Add([pscustomobject][ordered]@{
        RelativePath = "supabase/migrations/$leaf"
        Sha256 = $actualHash
        FullPath = $destination
      })
    }
    $stagedEntries = @(
      $stagedEntries |
        Sort-Object -Property RelativePath -CaseSensitive
    )
    $stagedFiles = @(
      Get-ChildItem -LiteralPath $migrationDirectory -File -Filter '*.sql' -Force |
        Sort-Object -Property Name -CaseSensitive
    )
    Assert-BinderConditionV1 (
      $stagedFiles.Count -eq @($TrackedMigrationSet.Entries).Count
    ) 'Staged migration file count is not exact.'
    $stageFingerprint = Get-BinderSha256StringV1 -Value (
      @(
        $stagedEntries | ForEach-Object {
          "$($_.RelativePath)|$($_.Sha256)"
        }
      ) -join "`n"
    )
    Assert-BinderConditionV1 (
      $stageFingerprint -ceq [string]$TrackedMigrationSet.Sha256
    ) 'Staged migration-set fingerprint mismatch.'

    $stage.OriginalMigrationFileAcls = @(
      $stagedEntries | ForEach-Object {
        [pscustomobject][ordered]@{
          Path = $_.FullPath
          Sddl = (Get-Acl -LiteralPath $_.FullPath).Sddl
        }
      }
    )
    $stage.OriginalMigrationAclSddl =
      Protect-BinderStagedMigrationDirectoryV1 -Path $migrationDirectory
    $streams = [System.Collections.Generic.List[System.IO.FileStream]]::new()
    $stage.Streams = $streams
    foreach ($path in @(
      @($stagedEntries | ForEach-Object FullPath) +
      @($stagedConfig, $stagedProjectRef)
    )) {
      $item = Get-Item -LiteralPath $path
      Assert-BinderConditionV1 (
        -not $item.Attributes.HasFlag(
          [System.IO.FileAttributes]::ReparsePoint
        )
      ) "Staged source file must not be a reparse point: $path"
      $streams.Add([System.IO.File]::Open(
        $path,
        [System.IO.FileMode]::Open,
        [System.IO.FileAccess]::Read,
        [System.IO.FileShare]::Read
      ))
    }
    $stage.Streams = @($streams)
    $stage.MigrationCount = $stagedEntries.Count
    $stage.MigrationSetSha256 = $stageFingerprint
    $stage.MigrationEntries = $stagedEntries
    $stage.ConfigPath = $stagedConfig
    $stage.ProjectRefPath = $stagedProjectRef
    $stage.ExpectedConfigSha256 = $sourceConfigHash
    $stage.SealedManifest = Get-BinderSealedStageManifestV1 -Stage $stage
    return $stage
  } catch {
    $originalMessage = $_.Exception.Message
    $cleanup = Close-BinderSupabaseStageV1 -Stage $stage
    if ($null -ne $StageLifecycle) {
      $StageLifecycle.CleanupAttempted = $true
      $StageLifecycle.CleanupSucceeded = [bool]$cleanup.Succeeded
      $StageLifecycle.CleanupMessage = [string]$cleanup.Message
    }
    if (-not $cleanup.Succeeded) {
      throw (
        "$originalMessage Staged source cleanup also failed at " +
        "$($cleanup.Root): $($cleanup.Message)"
      )
    }
    throw
  }
}

function Get-BinderLedgerV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [ValidateSet('PreApply', 'PostApply')]
    [string]$ExpectedState,

    [string]$ExecutablePath
  )

  $result = Invoke-BinderSupabaseV1 `
    -Arguments @('migration', 'list', '--linked', '--agent', 'no') `
    -RepoRoot $RepoRoot `
    -TimeoutSeconds 90 `
    -ExecutablePath $ExecutablePath
  Assert-BinderCommandSucceededV1 -Result $result -Label 'linked migration ledger'
  $ledger = ConvertFrom-SupabaseMigrationListV1 -Text $result.StdOut
  Assert-BinderLedgerV1 -Ledger $ledger -ExpectedState $ExpectedState
  return [pscustomobject]@{
    Command = $result
    Ledger = $ledger
  }
}

function Invoke-BinderReadbackV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [ValidateSet('PreApply', 'PostApply')]
    [string]$ExpectedState,

    [string]$ExecutablePath
  )

  $policy = Get-BinderRolloutPolicyV1
  $relativePath = if ($ExpectedState -eq 'PreApply') {
    $policy.PreflightSqlRelativePath
  } else {
    $policy.PostApplySqlRelativePath
  }
  $expectedSqlSha256 = if ($ExpectedState -eq 'PreApply') {
    $policy.PreflightSqlSha256
  } else {
    $policy.PostApplySqlSha256
  }
  $sqlPath = Join-Path $RepoRoot $relativePath
  $sqlItem = Get-Item -LiteralPath $sqlPath
  Assert-BinderConditionV1 (
    -not $sqlItem.Attributes.HasFlag(
      [System.IO.FileAttributes]::ReparsePoint
    )
  ) "$ExpectedState readback SQL must not be a reparse point."
  $sqlSeal = [System.IO.File]::Open(
    $sqlPath,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::Read
  )
  try {
    Assert-BinderConditionV1 (
      (Get-BinderSha256FileV1 -Path $sqlPath) -ceq $expectedSqlSha256
    ) "$ExpectedState readback SQL bytes are not the reviewed bytes."
    Assert-BinderSqlReadOnlyV1 -Path $sqlPath

    $result = Invoke-BinderSupabaseV1 `
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
      -TimeoutSeconds 45 `
      -ExecutablePath $ExecutablePath
    Assert-BinderCommandSucceededV1 -Result $result -Label "$ExpectedState linked catalog readback"

    $rows = @($result.StdOut | ConvertFrom-Json)
    Assert-BinderConditionV1 ($rows.Count -eq 1) "$ExpectedState readback must return exactly one row."
    Assert-BinderConditionV1 ($null -ne $rows[0].rollout_readback) "$ExpectedState readback payload is missing."
    $report = $rows[0].rollout_readback
    Assert-BinderConditionV1 ($report.read_only -eq $true) "$ExpectedState readback did not identify itself as read-only."
    Assert-BinderConditionV1 ($report.ok -eq $true) "$ExpectedState readback failed its catalog contract."

    return [pscustomobject]@{
      Command = $result
      Report = $report
      ReportSha256 = Get-CanonicalSha256V1 -Value $report
    }
  } finally {
    $sqlSeal.Dispose()
  }
}

function Get-BinderDryRunV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $result = Invoke-BinderSupabaseV1 `
    -Arguments @('db', 'push', '--dry-run', '--linked', '--agent', 'no') `
    -RepoRoot $RepoRoot `
    -TimeoutSeconds 120
  Assert-BinderCommandSucceededV1 -Result $result -Label 'linked migration dry-run'
  $parsed = ConvertFrom-SupabaseDryRunV1 -Text ($result.StdOut + "`n" + $result.StdErr)
  return [pscustomobject]@{
    Command = $result
    Parsed = $parsed
  }
}

function New-BinderPreflightCommandPlanV1 {
  [CmdletBinding()]
  param()

  return @(
    [pscustomobject]@{ Tool = 'supabase'; Arguments = @('projects', 'list', '--output', 'json', '--agent', 'no'); MutatesRemote = $false },
    [pscustomobject]@{ Tool = 'supabase'; Arguments = @('migration', 'list', '--linked', '--agent', 'no'); MutatesRemote = $false },
    [pscustomobject]@{ Tool = 'supabase'; Arguments = @('db', 'query', '--linked', '--file', '<reviewed-preflight-sql>', '--output', 'json', '--agent', 'no'); MutatesRemote = $false },
    [pscustomobject]@{ Tool = 'supabase'; Arguments = @('db', 'push', '--dry-run', '--linked', '--agent', 'no'); MutatesRemote = $false }
  )
}

function New-BinderApplyCommandPlanV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [bool]$AuthorizationValidated
  )

  Assert-BinderConditionV1 $AuthorizationValidated 'Apply command plan cannot be constructed before authorization validation.'
  $policy = Get-BinderRolloutPolicyV1
  return @(
    [pscustomobject]@{
      Tool = 'supabase'
      Arguments = @($policy.ApplyArguments)
      MutatesRemote = $true
    }
  )
}

function Invoke-BinderProductionPreflightV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$ExpectedHeadSha,

    [Parameter(Mandatory = $true)]
    [string]$BackupEvidencePath,

    [Parameter(Mandatory = $true)]
    [string]$ArtifactRoot,

    [string]$RepoRoot = (Get-BinderRepoRootV1)
  )

  $policy = Get-BinderRolloutPolicyV1
  $source = Test-BinderSourceV1 -RepoRoot $RepoRoot
  $repository = Assert-BinderRepositoryStateV1 -RepoRoot $RepoRoot -ExpectedHeadSha $ExpectedHeadSha
  $project = Assert-ProjectBindingV1 -RepoRoot $RepoRoot
  $backup = Test-BackupEvidenceV1 -Path $BackupEvidencePath -RepoRoot $RepoRoot
  $evidenceRoot = New-BinderArtifactRootV1 -Path $ArtifactRoot -RepoRoot $RepoRoot

  try {
    $ledger = Get-BinderLedgerV1 -RepoRoot $RepoRoot -ExpectedState PreApply
    $readback = Invoke-BinderReadbackV1 -RepoRoot $RepoRoot -ExpectedState PreApply
    $dryRun = Get-BinderDryRunV1 -RepoRoot $RepoRoot

    Write-BinderJsonV1 -Path (Join-Path $evidenceRoot 'source.json') -Value $source
    Write-BinderJsonV1 -Path (Join-Path $evidenceRoot 'repository.json') -Value $repository
    Write-BinderJsonV1 -Path (Join-Path $evidenceRoot 'project-binding.json') -Value $project
    Write-BinderJsonV1 -Path (Join-Path $evidenceRoot 'backup-evidence.digest.json') -Value $backup
    Write-BinderTextV1 -Path (Join-Path $evidenceRoot 'ledger.before.txt') -Value $ledger.Command.StdOut
    Write-BinderJsonV1 -Path (Join-Path $evidenceRoot 'ledger.before.json') -Value $ledger.Ledger
    Write-BinderJsonV1 -Path (Join-Path $evidenceRoot 'readback.before.json') -Value $readback.Report
    Write-BinderTextV1 -Path (Join-Path $evidenceRoot 'dry-run.stdout.txt') -Value $dryRun.Command.StdOut
    Write-BinderTextV1 -Path (Join-Path $evidenceRoot 'dry-run.stderr.txt') -Value $dryRun.Command.StdErr
    Write-BinderJsonV1 -Path (Join-Path $evidenceRoot 'dry-run.parsed.json') -Value $dryRun.Parsed

    $created = [datetime]::UtcNow
    $manifestCore = [ordered]@{
      schema_version = 1
      package_id = $policy.PackageId
      status = 'pass'
      created_at_utc = $created.ToString('o')
      expires_at_utc = $created.AddHours($policy.PreflightTtlHours).ToString('o')
      project_ref = $policy.ProjectRef
      package_fingerprint_sha256 = $policy.PackageFingerprintSha256
      package_manifest_file_sha256 = $source.PackageManifestFileSha256
      head_sha = $repository.HeadSha
      origin_main_sha = $repository.OriginMainSha
      supabase_cli_version = $source.SupabaseCliVersion
      supabase_cli_launcher_sha256 = $source.SupabaseCliLauncherSha256
      supabase_cli_binary_sha256 = $source.SupabaseCliBinarySha256
      supabase_cli_shim_descriptor_sha256 =
        $source.SupabaseCliShimDescriptorSha256
      tracked_migration_count = $source.TrackedMigrationCount
      tracked_migration_set_sha256 = $source.TrackedMigrationSetSha256
      migration_files = $source.MigrationFiles
      pending_versions = @($ledger.Ledger.LocalOnly | ForEach-Object Local)
      dry_run_files = @($dryRun.Parsed.MigrationFiles)
      preapply_readback_sha256 = $readback.ReportSha256
      stable_catalog_fingerprint_sha256 = [string]$readback.Report.checks.stable_catalog_fingerprint_sha256
      backup_evidence_path = $backup.Path
      backup_evidence_sha256 = $backup.Sha256
      apply_argv = @($policy.ApplyArguments)
    }
    $manifestFingerprint = Get-CanonicalSha256V1 -Value $manifestCore
    $preflightManifest = [ordered]@{}
    foreach ($entry in $manifestCore.GetEnumerator()) {
      $preflightManifest[$entry.Key] = $entry.Value
    }
    $preflightManifest['manifest_fingerprint_sha256'] = $manifestFingerprint

    $manifestPath = Join-Path $evidenceRoot 'preflight-manifest.json'
    Write-BinderJsonV1 -Path $manifestPath -Value $preflightManifest
    $manifestFileSha = Get-BinderSha256FileV1 -Path $manifestPath
    Write-BinderTextV1 -Path (Join-Path $evidenceRoot 'preflight-manifest.sha256') -Value ($manifestFileSha + [Environment]::NewLine)

    $approval = "APPLY-COLLABORATIVE-BINDERS-V1::$($policy.ProjectRef)::$ExpectedHeadSha::$manifestFingerprint"
    $backupApproval = "BACKUP-VERIFIED::$($policy.ProjectRef)::$($backup.Sha256)"
    Write-BinderTextV1 -Path (Join-Path $evidenceRoot 'approval.txt') -Value (
      "GROOKAI_BINDER_PROD_APPLY_ACK=$approval`n" +
      "GROOKAI_BINDER_PROD_BACKUP_ACK=$backupApproval`n"
    )
    Write-BinderChecksumsV1 -Root $evidenceRoot

    return [pscustomobject][ordered]@{
      Status = 'pass'
      ArtifactRoot = $evidenceRoot
      ManifestPath = $manifestPath
      ManifestFingerprintSha256 = $manifestFingerprint
      ExpiresAtUtc = $preflightManifest.expires_at_utc
    }
  } catch {
    Write-BinderJsonV1 -Path (Join-Path $evidenceRoot 'STOP-incident.json') -Value ([ordered]@{
      status = 'stop'
      phase = 'preflight'
      recorded_at_utc = [datetime]::UtcNow.ToString('o')
      message = $_.Exception.Message
    })
    try {
      Write-BinderChecksumsV1 -Root $evidenceRoot
    } catch {
    }
    throw
  }
}

function Read-BinderPreflightManifestV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $fullPath = [System.IO.Path]::GetFullPath($Path)
  Assert-BinderConditionV1 (Test-Path -LiteralPath $fullPath -PathType Leaf) 'Preflight manifest was not found.'
  $sidecar = Join-Path (Split-Path -Parent $fullPath) 'preflight-manifest.sha256'
  Assert-BinderConditionV1 (Test-Path -LiteralPath $sidecar -PathType Leaf) 'Preflight manifest hash sidecar was not found.'
  $expectedFileHash = (Get-Content -LiteralPath $sidecar -Raw).Trim()
  Assert-BinderConditionV1 ($expectedFileHash -cmatch '^[0-9a-f]{64}$') 'Preflight manifest hash sidecar is invalid.'
  Assert-BinderConditionV1 ((Get-BinderSha256FileV1 -Path $fullPath) -ceq $expectedFileHash) 'Preflight manifest file hash mismatch.'

  $manifest = Get-Content -LiteralPath $fullPath -Raw | ConvertFrom-Json
  $core = [ordered]@{}
  foreach ($property in $manifest.PSObject.Properties) {
    if ($property.Name -cne 'manifest_fingerprint_sha256') {
      $core[$property.Name] = $property.Value
    }
  }
  $fingerprint = Get-CanonicalSha256V1 -Value $core
  Assert-BinderConditionV1 ($fingerprint -ceq $manifest.manifest_fingerprint_sha256) 'Preflight manifest fingerprint mismatch.'

  return [pscustomobject]@{
    Path = $fullPath
    Data = $manifest
    FingerprintSha256 = $fingerprint
  }
}

function Test-PreflightManifestV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [datetime]$NowUtc = [datetime]::UtcNow
  )

  $policy = Get-BinderRolloutPolicyV1
  $manifest = Read-BinderPreflightManifestV1 -Path $Path
  $data = $manifest.Data

  Assert-BinderConditionV1 ($data.schema_version -eq 1) 'Preflight manifest schema mismatch.'
  Assert-BinderConditionV1 ($data.package_id -ceq $policy.PackageId) 'Preflight package mismatch.'
  Assert-BinderConditionV1 ($data.status -ceq 'pass') 'Preflight status is not pass.'
  Assert-BinderConditionV1 ($data.project_ref -ceq $policy.ProjectRef) 'Preflight project mismatch.'
  Assert-BinderConditionV1 ($data.package_fingerprint_sha256 -ceq $policy.PackageFingerprintSha256) 'Preflight package fingerprint mismatch.'
  Assert-BinderConditionV1 ($data.head_sha -cmatch '^[0-9a-f]{40}$') 'Preflight HEAD is invalid.'
  Assert-BinderConditionV1 ($data.head_sha -ceq $data.origin_main_sha) 'Preflight HEAD and origin/main differ.'
  Assert-BinderConditionV1 ($data.supabase_cli_version -ceq $policy.SupportedSupabaseCliVersion) 'Preflight CLI version mismatch.'
  Assert-BinderConditionV1 ($data.supabase_cli_launcher_sha256 -ceq $policy.SupabaseCliLauncherSha256) 'Preflight CLI launcher hash mismatch.'
  Assert-BinderConditionV1 ($data.supabase_cli_binary_sha256 -ceq $policy.SupabaseCliBinarySha256) 'Preflight CLI binary hash mismatch.'
  Assert-BinderConditionV1 ($data.supabase_cli_shim_descriptor_sha256 -ceq $policy.SupabaseCliShimDescriptorSha256) 'Preflight CLI shim descriptor hash mismatch.'
  Assert-BinderConditionV1 ((@($data.apply_argv) -join "`n") -ceq ($policy.ApplyArguments -join "`n")) 'Preflight apply argv drifted.'
  Assert-BinderConditionV1 ($data.stable_catalog_fingerprint_sha256 -cmatch '^[0-9a-f]{64}$') 'Stable catalog fingerprint is missing or invalid.'
  Assert-BinderConditionV1 ($data.tracked_migration_count -gt 0) 'Tracked migration count is invalid.'
  Assert-BinderConditionV1 ($data.tracked_migration_set_sha256 -cmatch '^[0-9a-f]{64}$') 'Tracked migration-set fingerprint is invalid.'

  $created = [datetime]::Parse([string]$data.created_at_utc).ToUniversalTime()
  $expires = [datetime]::Parse([string]$data.expires_at_utc).ToUniversalTime()
  Assert-BinderConditionV1 ($created -le $NowUtc.AddMinutes(5)) 'Preflight creation time is in the future.'
  Assert-BinderConditionV1 ($expires -gt $NowUtc) 'Preflight manifest has expired.'
  Assert-BinderConditionV1 ($expires -le $created.AddHours($policy.PreflightTtlHours)) 'Preflight validity exceeds four hours.'

  return $manifest
}

function Assert-BinderApplyAuthorizationV1 {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [object]$PreflightManifest,

    [Parameter(Mandatory = $true)]
    [bool]$ConfirmProduction
  )

  $policy = Get-BinderRolloutPolicyV1
  Assert-BinderConditionV1 $ConfirmProduction 'Apply requires -ConfirmProduction.'
  $expectedApply = "APPLY-COLLABORATIVE-BINDERS-V1::$($policy.ProjectRef)::$($PreflightManifest.head_sha)::$($PreflightManifest.manifest_fingerprint_sha256)"
  $expectedBackup = "BACKUP-VERIFIED::$($policy.ProjectRef)::$($PreflightManifest.backup_evidence_sha256)"
  Assert-BinderConditionV1 ($env:GROOKAI_BINDER_PROD_APPLY_ACK -ceq $expectedApply) 'Production apply acknowledgement is missing or not exact.'
  Assert-BinderConditionV1 ($env:GROOKAI_BINDER_PROD_BACKUP_ACK -ceq $expectedBackup) 'Production backup acknowledgement is missing or not exact.'
  return $true
}

function Open-BinderApplySealV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [object]$PreflightManifestEnvelope,

    [Parameter(Mandatory = $true)]
    [object]$PreflightManifest,

    [Parameter(Mandatory = $true)]
    [object]$TrackedMigrationSet,

    [Parameter(Mandatory = $true)]
    [object]$SupabaseExecutable
  )

  $policy = Get-BinderRolloutPolicyV1
  $paths = [System.Collections.Generic.List[string]]::new()
  Assert-BinderConditionV1 (
    $TrackedMigrationSet.Count -eq $PreflightManifest.tracked_migration_count
  ) 'Tracked migration count changed before the apply seal.'
  Assert-BinderConditionV1 (
    $TrackedMigrationSet.Sha256 -ceq
      $PreflightManifest.tracked_migration_set_sha256
  ) 'Tracked migration-set fingerprint changed before the apply seal.'
  foreach ($migration in @($TrackedMigrationSet.Entries)) {
    $paths.Add([string]$migration.FullPath)
  }
  foreach ($path in @(
    (Join-Path $RepoRoot 'supabase/config.toml'),
    (Join-Path $RepoRoot 'supabase/.temp/project-ref'),
    (Join-Path $RepoRoot $policy.ManifestRelativePath),
    (Join-Path $RepoRoot $policy.PreflightSqlRelativePath),
    (Join-Path $RepoRoot $policy.PostApplySqlRelativePath),
    $SupabaseExecutable.LauncherPath,
    $SupabaseExecutable.BinaryPath,
    $PreflightManifestEnvelope.Path,
    (Join-Path (
      Split-Path -Parent $PreflightManifestEnvelope.Path
    ) 'preflight-manifest.sha256'),
    [string]$PreflightManifest.backup_evidence_path
  )) {
    $paths.Add([System.IO.Path]::GetFullPath($path))
  }
  if (-not [string]::IsNullOrWhiteSpace(
    [string]$SupabaseExecutable.ShimDescriptorPath
  )) {
    $paths.Add(
      [System.IO.Path]::GetFullPath(
        [string]$SupabaseExecutable.ShimDescriptorPath
      )
    )
  }

  $streams = [System.Collections.Generic.List[System.IO.FileStream]]::new()
  try {
    foreach ($path in @($paths | Sort-Object -Unique)) {
      Assert-BinderConditionV1 (Test-Path -LiteralPath $path -PathType Leaf) "Apply seal file is missing: $path"
      $item = Get-Item -LiteralPath $path
      Assert-BinderConditionV1 (
        -not $item.Attributes.HasFlag(
          [System.IO.FileAttributes]::ReparsePoint
        )
      ) "Apply seal refuses a reparse-point file: $path"
      $stream = [System.IO.File]::Open(
        $path,
        [System.IO.FileMode]::Open,
        [System.IO.FileAccess]::Read,
        [System.IO.FileShare]::Read
      )
      $streams.Add($stream)
    }
    return @($streams)
  } catch {
    foreach ($stream in $streams) {
      $stream.Dispose()
    }
    throw
  }
}

function Close-BinderApplySealV1 {
  param(
    [object[]]$Streams
  )

  foreach ($stream in @($Streams)) {
    if ($null -ne $stream) {
      $stream.Dispose()
    }
  }
}

function Assert-BinderFinalLocalSealV1 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [object]$PreflightManifest
  )

  $policy = Get-BinderRolloutPolicyV1
  $source = Test-BinderSourceV1 -RepoRoot $RepoRoot
  Assert-BinderConditionV1 ($source.PackageManifestFileSha256 -ceq $PreflightManifest.package_manifest_file_sha256) 'Package manifest changed at the final apply seal.'
  Assert-BinderConditionV1 ($source.SupabaseCliLauncherSha256 -ceq $PreflightManifest.supabase_cli_launcher_sha256) 'Supabase launcher changed at the final apply seal.'
  Assert-BinderConditionV1 ($source.SupabaseCliBinarySha256 -ceq $PreflightManifest.supabase_cli_binary_sha256) 'Supabase binary changed at the final apply seal.'
  Assert-BinderConditionV1 ($source.SupabaseCliShimDescriptorSha256 -ceq $PreflightManifest.supabase_cli_shim_descriptor_sha256) 'Supabase shim descriptor changed at the final apply seal.'
  Assert-BinderConditionV1 ($source.TrackedMigrationCount -eq $PreflightManifest.tracked_migration_count) 'Tracked migration count changed at the final apply seal.'
  Assert-BinderConditionV1 ($source.TrackedMigrationSetSha256 -ceq $PreflightManifest.tracked_migration_set_sha256) 'Tracked migration-set fingerprint changed at the final apply seal.'

  $status = Invoke-BinderGitV1 `
    -Arguments @('status', '--porcelain=v1', '--untracked-files=all') `
    -RepoRoot $RepoRoot
  Assert-BinderCommandSucceededV1 -Result $status -Label 'final sealed git status'
  Assert-BinderConditionV1 ([string]::IsNullOrWhiteSpace($status.StdOut)) 'Worktree changed before the production push.'

  $head = Invoke-BinderGitV1 -Arguments @('rev-parse', 'HEAD') -RepoRoot $RepoRoot
  Assert-BinderCommandSucceededV1 -Result $head -Label 'final sealed HEAD'
  Assert-BinderConditionV1 ($head.StdOut.Trim() -ceq $PreflightManifest.head_sha) 'HEAD changed before the production push.'

  $linkedRef = (
    Get-Content -LiteralPath (
      Join-Path $RepoRoot 'supabase/.temp/project-ref'
    ) -Raw
  ).Trim()
  Assert-BinderConditionV1 ($linkedRef -ceq $policy.ProjectRef) 'Linked project changed before the production push.'

  $manifestFileHash = Get-BinderSha256FileV1 -Path $PreflightManifest.backup_evidence_path
  Assert-BinderConditionV1 ($manifestFileHash -ceq $PreflightManifest.backup_evidence_sha256) 'Backup evidence changed before the production push.'
}

function Invoke-BinderProductionApplyV1 {
  [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
  param(
    [Parameter(Mandatory = $true)]
    [string]$ManifestPath,

    [Parameter(Mandatory = $true)]
    [bool]$ConfirmProduction,

    [string]$RepoRoot = (Get-BinderRepoRootV1)
  )

  $policy = Get-BinderRolloutPolicyV1
  $manifestEnvelope = Test-PreflightManifestV1 -Path $ManifestPath
  $manifest = $manifestEnvelope.Data
  if (-not $PSCmdlet.ShouldProcess(
    "Supabase production project $($policy.ProjectRef)",
    'apply the exact Collaborative Binders V1 migration package'
  )) {
    return [pscustomobject][ordered]@{
      status = 'not_applied'
      package_id = $policy.PackageId
      project_ref = $policy.ProjectRef
      mutation_possible = $false
    }
  }
  $artifactRoot = Assert-BinderArtifactRootV1 `
    -Path (Split-Path -Parent $manifestEnvelope.Path) `
    -RepoRoot $RepoRoot `
    -MustExist $true
  $applyRoot = Join-Path $artifactRoot (
    'apply-' + [datetime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
  )
  Assert-BinderConditionV1 (-not (Test-Path -LiteralPath $applyRoot)) 'Apply evidence directory already exists.'
  [void][System.IO.Directory]::CreateDirectory($applyRoot)
  $pushAttempted = $false
  $push = $null
  $pushLifecycle = [pscustomobject][ordered]@{
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
    StdOutCaptureCompleted = $false
    StdErrCaptureCompleted = $false
    OutputCaptureCompleted = $false
    StdOutTruncated = $false
    StdErrTruncated = $false
    OutputTruncated = $false
    StdOutCharactersObserved = 0L
    StdErrCharactersObserved = 0L
    StdOutCaptureError = $null
    StdErrCaptureError = $null
    StdOut = ''
    StdErr = ''
  }
  $pushSucceeded = $false
  $sealStreams = @()
  $supabaseExecutable = $null
  $stage = $null
  $stageCleanup = $null
  $stageLifecycle = [pscustomobject][ordered]@{
    CreatedRoot = $null
    CleanupAttempted = $false
    CleanupSucceeded = $null
    CleanupMessage = ''
  }

  try {
    $source = Test-BinderSourceV1 -RepoRoot $RepoRoot
    Assert-BinderConditionV1 ($source.PackageManifestFileSha256 -ceq $manifest.package_manifest_file_sha256) 'Package manifest bytes changed after preflight.'
    Assert-BinderConditionV1 ($source.SupabaseCliLauncherSha256 -ceq $manifest.supabase_cli_launcher_sha256) 'Supabase CLI launcher changed after preflight.'
    Assert-BinderConditionV1 ($source.SupabaseCliBinarySha256 -ceq $manifest.supabase_cli_binary_sha256) 'Supabase CLI binary changed after preflight.'
    Assert-BinderConditionV1 ($source.SupabaseCliShimDescriptorSha256 -ceq $manifest.supabase_cli_shim_descriptor_sha256) 'Supabase CLI shim descriptor changed after preflight.'
    Assert-BinderConditionV1 ($source.TrackedMigrationCount -eq $manifest.tracked_migration_count) 'Tracked migration count changed after preflight.'
    Assert-BinderConditionV1 ($source.TrackedMigrationSetSha256 -ceq $manifest.tracked_migration_set_sha256) 'Tracked migration-set fingerprint changed after preflight.'
    [void](Assert-BinderRepositoryStateV1 -RepoRoot $RepoRoot -ExpectedHeadSha $manifest.head_sha)
    [void](Assert-ProjectBindingV1 -RepoRoot $RepoRoot)

    $backup = Test-BackupEvidenceV1 -Path $manifest.backup_evidence_path -RepoRoot $RepoRoot
    Assert-BinderConditionV1 ($backup.Sha256 -ceq $manifest.backup_evidence_sha256) 'Backup evidence changed after preflight.'

    $ledgerBefore = Get-BinderLedgerV1 -RepoRoot $RepoRoot -ExpectedState PreApply
    Write-BinderTextV1 `
      -Path (Join-Path $applyRoot 'ledger.before.txt') `
      -Value $ledgerBefore.Command.StdOut
    Write-BinderJsonV1 `
      -Path (Join-Path $applyRoot 'ledger.before.json') `
      -Value $ledgerBefore.Ledger
    $readbackBefore = Invoke-BinderReadbackV1 -RepoRoot $RepoRoot -ExpectedState PreApply
    Assert-BinderConditionV1 ($readbackBefore.ReportSha256 -ceq $manifest.preapply_readback_sha256) 'Production pre-apply catalog changed after preflight.'
    $dryRun = Get-BinderDryRunV1 -RepoRoot $RepoRoot
    Assert-BinderConditionV1 (
      (@($dryRun.Parsed.MigrationFiles) -join "`n") -ceq (@($manifest.dry_run_files) -join "`n")
    ) 'Migration dry-run changed after preflight.'

    $authorized = Assert-BinderApplyAuthorizationV1 `
      -PreflightManifest $manifest `
      -ConfirmProduction $ConfirmProduction
    $trackedMigrationSet = Get-BinderTrackedMigrationSetV1 -RepoRoot $RepoRoot
    $supabaseExecutable = Get-BinderSupabaseExecutableV1
    $sealStreams = Open-BinderApplySealV1 `
      -RepoRoot $RepoRoot `
      -PreflightManifestEnvelope $manifestEnvelope `
      -PreflightManifest $manifest `
      -TrackedMigrationSet $trackedMigrationSet `
      -SupabaseExecutable $supabaseExecutable
    Assert-BinderFinalLocalSealV1 `
      -RepoRoot $RepoRoot `
      -PreflightManifest $manifest
    $plan = New-BinderApplyCommandPlanV1 -AuthorizationValidated $authorized
    Assert-BinderConditionV1 ($plan.Count -eq 1) 'Apply plan must contain exactly one command.'

    $stage = New-BinderSupabaseStageV1 `
      -RepoRoot $RepoRoot `
      -TrackedMigrationSet $trackedMigrationSet `
      -StageLifecycle $stageLifecycle
    try {
      Assert-BinderConditionV1 (
        $stage.MigrationSetSha256 -ceq
          $manifest.tracked_migration_set_sha256
      ) 'Immutable staged migration-set fingerprint mismatch.'
      Write-BinderJsonV1 `
        -Path (Join-Path $applyRoot 'sealed-source-manifest.json') `
        -Value $stage.SealedManifest
      $pushAttempted = $true
      $push = Invoke-BinderSupabaseV1 `
        -Arguments @($plan[0].Arguments) `
        -RepoRoot $stage.Root `
        -TimeoutSeconds 900 `
        -ProcessLifecycle $pushLifecycle `
        -ExecutablePath $supabaseExecutable.BinaryPath
      $pushSucceeded = (
        $push.Started -eq $true -and
        $push.TerminationConfirmed -eq $true -and
        -not $push.TimedOut -and
        $push.ExitCode -eq 0
      )
    } finally {
      if (
        $pushLifecycle.Started -and
        -not $pushLifecycle.TerminationConfirmed
      ) {
        [Environment]::FailFast(
          'Staged-source cleanup was blocked because rollout ' +
          'process-tree termination was not confirmed.'
        )
      }
      if ($null -ne $stage) {
        $stageCleanup = Close-BinderSupabaseStageV1 -Stage $stage
        $stageLifecycle.CleanupAttempted = $true
        $stageLifecycle.CleanupSucceeded =
          [bool]$stageCleanup.Succeeded
        $stageLifecycle.CleanupMessage =
          [string]$stageCleanup.Message
        $stage = $null
      }
    }
    if ($null -ne $push) {
      Write-BinderTextV1 -Path (Join-Path $applyRoot 'db-push.stdout.txt') -Value $push.StdOut
      Write-BinderTextV1 -Path (Join-Path $applyRoot 'db-push.stderr.txt') -Value $push.StdErr
    }
    Assert-BinderConditionV1 (
      $null -ne $stageCleanup -and $stageCleanup.Succeeded
    ) "Immutable staged Supabase source cleanup failed: $($stageCleanup.Message)"
    Assert-BinderConditionV1 ($null -ne $push) 'Production push did not return a process result.'
    Assert-BinderCommandSucceededV1 -Result $push -Label 'production Binder migration push'

    $ledgerAfter = Get-BinderLedgerV1 `
      -RepoRoot $RepoRoot `
      -ExpectedState PostApply `
      -ExecutablePath $supabaseExecutable.BinaryPath
    Assert-ExactBinderLedgerDeltaV1 `
      -Before $ledgerBefore.Ledger `
      -After $ledgerAfter.Ledger
    $readbackAfter = Invoke-BinderReadbackV1 `
      -RepoRoot $RepoRoot `
      -ExpectedState PostApply `
      -ExecutablePath $supabaseExecutable.BinaryPath
    Assert-BinderConditionV1 (
      [string]$readbackAfter.Report.checks.stable_catalog_fingerprint_sha256 -ceq
        [string]$manifest.stable_catalog_fingerprint_sha256
    ) 'Stable Trust/Vault/Pulse/card-event catalog changed outside the reviewed delta.'
    Write-BinderTextV1 -Path (Join-Path $applyRoot 'ledger.after.txt') -Value $ledgerAfter.Command.StdOut
    Write-BinderJsonV1 -Path (Join-Path $applyRoot 'ledger.after.json') -Value $ledgerAfter.Ledger
    Write-BinderJsonV1 -Path (Join-Path $applyRoot 'readback.after.json') -Value $readbackAfter.Report

    $result = [ordered]@{
      status = 'pass'
      package_id = $policy.PackageId
      project_ref = $policy.ProjectRef
      head_sha = $manifest.head_sha
      package_fingerprint_sha256 = $policy.PackageFingerprintSha256
      completed_at_utc = [datetime]::UtcNow.ToString('o')
      push_attempted = $pushAttempted
      push_started = [bool]$pushLifecycle.Started
      push_started_at_utc = $pushLifecycle.StartedAtUtc
      push_supervisor_process_id =
        $pushLifecycle.SupervisorProcessId
      push_ended_at_utc = $pushLifecycle.EndedAtUtc
      push_succeeded = $pushSucceeded
      push_timed_out = [bool]$pushLifecycle.TimedOut
      push_kill_attempted = [bool]$pushLifecycle.KillAttempted
      push_kill_request_succeeded =
        $pushLifecycle.KillRequestSucceeded
      push_kill_request_error = $pushLifecycle.KillRequestError
      push_root_exited = [bool]$pushLifecycle.RootExited
      push_process_tree_empty =
        [bool]$pushLifecycle.ProcessTreeEmpty
      push_termination_confirmed =
        [bool]$pushLifecycle.TerminationConfirmed
      push_exit_code = $pushLifecycle.ExitCode
      push_output_capture_completed =
        [bool]$pushLifecycle.OutputCaptureCompleted
      push_stdout_truncated =
        [bool]$pushLifecycle.StdOutTruncated
      push_stderr_truncated =
        [bool]$pushLifecycle.StdErrTruncated
      mutation_possible = [bool]$pushLifecycle.Started
      feature_flags_enabled = 0
      excluded_flags = @($policy.ExcludedFlags)
    }
    Write-BinderJsonV1 -Path (Join-Path $applyRoot 'apply-result.json') -Value $result
    Write-BinderChecksumsV1 -Root $applyRoot
    return [pscustomobject]$result
  } catch {
    if (
      $pushLifecycle.Started -and
      -not $pushLifecycle.TerminationConfirmed
    ) {
      [Environment]::FailFast(
        'Rollout incident handling was blocked because process-tree ' +
        'termination was not confirmed.'
      )
    }
    $diagnostic = [ordered]@{
      status = 'stop'
      package_id = $policy.PackageId
      project_ref = $policy.ProjectRef
      recorded_at_utc = [datetime]::UtcNow.ToString('o')
      message = $_.Exception.Message
      push_attempted = $pushAttempted
      push_started = [bool]$pushLifecycle.Started
      push_started_at_utc = $pushLifecycle.StartedAtUtc
      push_supervisor_process_id =
        $pushLifecycle.SupervisorProcessId
      push_ended_at_utc = $pushLifecycle.EndedAtUtc
      push_succeeded = if ($null -ne $push) {
        [bool]$pushSucceeded
      } elseif ($pushLifecycle.Started) {
        $null
      } else {
        $false
      }
      push_exit_code = $pushLifecycle.ExitCode
      push_timed_out = [bool]$pushLifecycle.TimedOut
      push_kill_attempted = [bool]$pushLifecycle.KillAttempted
      push_kill_request_succeeded =
        $pushLifecycle.KillRequestSucceeded
      push_kill_request_error = $pushLifecycle.KillRequestError
      push_root_exited = [bool]$pushLifecycle.RootExited
      push_process_tree_empty =
        [bool]$pushLifecycle.ProcessTreeEmpty
      push_termination_confirmed =
        [bool]$pushLifecycle.TerminationConfirmed
      push_output_capture_completed =
        [bool]$pushLifecycle.OutputCaptureCompleted
      push_stdout_truncated =
        [bool]$pushLifecycle.StdOutTruncated
      push_stderr_truncated =
        [bool]$pushLifecycle.StdErrTruncated
      mutation_possible = [bool]$pushLifecycle.Started
      staged_source_cleanup_succeeded = if ($null -ne $stageCleanup) {
        [bool]$stageCleanup.Succeeded
      } elseif ($stageLifecycle.CleanupAttempted) {
        [bool]$stageLifecycle.CleanupSucceeded
      } elseif ($null -eq $stageLifecycle.CreatedRoot) {
        $true
      } else {
        $false
      }
      staged_source_cleanup_message = if ($null -ne $stageCleanup) {
        [string]$stageCleanup.Message
      } else {
        [string]$stageLifecycle.CleanupMessage
      }
      staged_source_cleanup_root = if (
        (
          $null -ne $stageCleanup -and
          -not $stageCleanup.Succeeded
        ) -or (
          $stageLifecycle.CleanupAttempted -and
          -not $stageLifecycle.CleanupSucceeded
        )
      ) {
        [string]$stageLifecycle.CreatedRoot
      } else {
        $null
      }
      automatic_retry = $false
      automatic_repair = $false
      feature_flags_state = if ($pushLifecycle.Started) {
        'unknown_until_diagnostic_readback'
      } else {
        'unchanged_by_rollout_guard'
      }
    }
    if (
      $pushLifecycle.Started -and
      $pushLifecycle.TerminationConfirmed
    ) {
      if ($null -eq $push) {
        Write-BinderTextV1 `
          -Path (Join-Path $applyRoot 'db-push.stdout.txt') `
          -Value ([string]$pushLifecycle.StdOut)
        Write-BinderTextV1 `
          -Path (Join-Path $applyRoot 'db-push.stderr.txt') `
          -Value ([string]$pushLifecycle.StdErr)
      }
      try {
        $diagnosticLedger = Invoke-BinderSupabaseV1 `
          -Arguments @('migration', 'list', '--linked', '--agent', 'no') `
          -RepoRoot $RepoRoot `
          -TimeoutSeconds 90 `
          -ExecutablePath $supabaseExecutable.BinaryPath
        Write-BinderTextV1 -Path (Join-Path $applyRoot 'diagnostic-ledger.txt') -Value $diagnosticLedger.StdOut
        if ($diagnosticLedger.ExitCode -eq 0 -and -not $diagnosticLedger.TimedOut) {
          $parsedDiagnosticLedger = ConvertFrom-SupabaseMigrationListV1 -Text $diagnosticLedger.StdOut
          Write-BinderJsonV1 -Path (Join-Path $applyRoot 'diagnostic-ledger.json') -Value $parsedDiagnosticLedger
        }
      } catch {
      }
      try {
        $diagnosticSqlPath = Join-Path $RepoRoot $policy.PostApplySqlRelativePath
        Assert-BinderConditionV1 (
          (Get-BinderSha256FileV1 -Path $diagnosticSqlPath) -ceq
            $policy.PostApplySqlSha256
        ) 'Diagnostic readback SQL bytes are not the reviewed bytes.'
        Assert-BinderSqlReadOnlyV1 -Path $diagnosticSqlPath
        $diagnosticReadback = Invoke-BinderSupabaseV1 `
          -Arguments @(
            'db',
            'query',
            '--linked',
            '--file',
            $diagnosticSqlPath,
            '--output',
            'json',
            '--agent',
            'no'
          ) `
          -RepoRoot $RepoRoot `
          -TimeoutSeconds 45 `
          -ExecutablePath $supabaseExecutable.BinaryPath
        Write-BinderTextV1 -Path (Join-Path $applyRoot 'diagnostic-readback.stdout.txt') -Value $diagnosticReadback.StdOut
        Write-BinderTextV1 -Path (Join-Path $applyRoot 'diagnostic-readback.stderr.txt') -Value $diagnosticReadback.StdErr
      } catch {
      }
    }
    Write-BinderJsonV1 -Path (Join-Path $applyRoot 'STOP-incident.json') -Value $diagnostic
    try {
      Write-BinderChecksumsV1 -Root $applyRoot
    } catch {
    }
    throw
  } finally {
    if (
      $pushLifecycle.Started -and
      -not $pushLifecycle.TerminationConfirmed
    ) {
      [Environment]::FailFast(
        'Apply-seal cleanup was blocked because rollout process-tree ' +
        'termination was not confirmed.'
      )
    }
    Close-BinderApplySealV1 -Streams $sealStreams
  }
}

Export-ModuleMember -Function @(
  'Get-BinderRolloutPolicyV1',
  'Get-CanonicalSha256V1',
  'Remove-AnsiV1',
  'ConvertFrom-SupabaseMigrationListV1',
  'ConvertFrom-SupabaseDryRunV1',
  'Assert-ExactBinderPendingSetV1',
  'Assert-ProjectBindingV1',
  'Test-BackupEvidenceV1',
  'Test-PreflightManifestV1',
  'Assert-BinderApplyAuthorizationV1',
  'Test-BinderSourceV1',
  'Invoke-BinderReadbackV1',
  'Invoke-BinderProductionPreflightV1',
  'Invoke-BinderProductionApplyV1'
)
