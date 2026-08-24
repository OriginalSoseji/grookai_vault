param(
  [Parameter(Mandatory = $true)]
  [string]$Path
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$allowedPaths = @(
  '^/v1/projects/[a-z0-9]{20}$',
  '^/v1/projects/[a-z0-9]{20}/billing/addons$',
  '^/v1/projects/[a-z0-9]{20}/config/disk$',
  '^/v1/projects/[a-z0-9]{20}/config/disk/util$',
  '^/v1/projects/[a-z0-9]{20}/config/disk/autoscale$',
  '^/v1/projects/[a-z0-9]{20}/readonly$',
  '^/v1/projects/[a-z0-9]{20}/database/backups$',
  '^/v1/organizations/[a-z0-9]{20}/entitlements$'
)

if (-not ($allowedPaths | Where-Object { $Path -match $_ })) {
  throw "Management API path is not allowlisted: $Path"
}

$token = $env:SUPABASE_ACCESS_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
  if ($env:OS -ne 'Windows_NT') {
    throw 'SUPABASE_ACCESS_TOKEN is required outside Windows.'
  }

  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class GrookaiCredentialReader {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public UInt32 Flags;
    public UInt32 Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize;
    public IntPtr CredentialBlob;
    public UInt32 Persist;
    public UInt32 AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }

  [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredRead(string target, UInt32 type, UInt32 flags, out IntPtr credentialPtr);

  [DllImport("Advapi32.dll", SetLastError = true)]
  public static extern void CredFree(IntPtr credentialPtr);
}
'@

  $credentialPtr = [IntPtr]::Zero
  $target = 'Supabase CLI:supabase'
  if (-not [GrookaiCredentialReader]::CredRead($target, 1, 0, [ref]$credentialPtr)) {
    throw "Unable to read the authenticated Supabase CLI credential from Windows Credential Manager."
  }
  try {
    $credential = [Runtime.InteropServices.Marshal]::PtrToStructure(
      $credentialPtr,
      [type][GrookaiCredentialReader+CREDENTIAL]
    )
    $bytes = New-Object byte[] $credential.CredentialBlobSize
    [Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob, $bytes, 0, $credential.CredentialBlobSize)
    $token = [Text.Encoding]::UTF8.GetString($bytes).Trim([char]0).Trim()
  }
  finally {
    [GrookaiCredentialReader]::CredFree($credentialPtr)
  }
}

if ($token -notmatch '^sbp_') {
  throw 'The resolved Supabase Management API token is invalid.'
}

$headers = @{
  Authorization = "Bearer $token"
  Accept = 'application/json'
  'User-Agent' = 'grookai-production-readiness-v1'
}

$response = Invoke-RestMethod `
  -Method Get `
  -Uri "https://api.supabase.com$Path" `
  -Headers $headers `
  -TimeoutSec 45

$response | ConvertTo-Json -Depth 30 -Compress
