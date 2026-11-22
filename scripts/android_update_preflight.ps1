param(
    [Parameter(Mandatory = $true)]
    [string] $ApkPath,
    [string] $AdbPath,
    [string] $AndroidBuildToolsPath,
    [string] $JavaHome
)

$ErrorActionPreference = 'Stop'

function Resolve-Tool([string] $Name, [string] $Override) {
    if ($Override) {
        if (-not (Test-Path -LiteralPath $Override -PathType Leaf)) {
            throw "$Name was not found at the requested path."
        }
        return (Resolve-Path -LiteralPath $Override).Path
    }
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    throw "$Name is required. Add Android platform-tools/build-tools to PATH or pass its path."
}

function Invoke-Captured([string] $Tool, [string[]] $Arguments) {
    $output = & $Tool @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed ($LASTEXITCODE): $([IO.Path]::GetFileName($Tool))"
    }
    return ($output | Out-String)
}

function Read-ApkIdentity([string] $Path, [string] $Aapt, [string] $ApkSigner, [string] $Java, [string] $ApkSigJar, [string] $LineageProbe) {
    $badging = Invoke-Captured $Aapt @('dump', 'badging', $Path)
    $packageMatch = [regex]::Match($badging, "(?m)^package: name='([^']+)' versionCode='([0-9]+)' versionName='([^']*)'")
    if (-not $packageMatch.Success) { throw 'Could not read APK package and version metadata.' }
    $signature = Invoke-Captured $ApkSigner @('verify', '--print-certs', $Path)
    $signerMatch = [regex]::Match($signature, '(?im)^Signer #1 certificate SHA-256 digest: ([0-9a-f:]+)\s*$')
    if (-not $signerMatch.Success) { throw 'Could not read the APK signer SHA-256 fingerprint.' }
    $lineageOutput = Invoke-Captured $Java @('-cp', $ApkSigJar, $LineageProbe, $Path)
    try { $lineageIdentity = $lineageOutput | ConvertFrom-Json -ErrorAction Stop }
    catch { throw 'Could not read the APK signing certificate lineage.' }
    if (-not $lineageIdentity.verified) { throw 'The APK signing certificate lineage did not verify.' }
    $signerSha256 = ($signerMatch.Groups[1].Value -replace ':', '').ToLowerInvariant()
    if ($lineageIdentity.signerSha256 -ne $signerSha256) {
        throw 'apksigner and the lineage verifier disagree about the APK signer.'
    }
    return [pscustomobject]@{
        Package = $packageMatch.Groups[1].Value
        VersionCode = [long]$packageMatch.Groups[2].Value
        VersionName = $packageMatch.Groups[3].Value
        SignerSha256 = $signerSha256
        Lineage = @($lineageIdentity.lineage)
    }
}

if (-not (Test-Path -LiteralPath $ApkPath -PathType Leaf)) { throw 'Candidate APK does not exist.' }
$apk = (Resolve-Path -LiteralPath $ApkPath).Path
if (-not $env:ANDROID_SDK_ROOT -and -not $env:ANDROID_HOME) {
    $env:ANDROID_SDK_ROOT = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}
if (-not $AdbPath) {
    $adbFromSdk = Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe'
    if (Test-Path -LiteralPath $adbFromSdk) { $AdbPath = $adbFromSdk }
}
$adb = Resolve-Tool 'adb' $AdbPath

if (-not $AndroidBuildToolsPath) {
    $sdkRoot = $env:ANDROID_SDK_ROOT
    if (-not $sdkRoot) { $sdkRoot = $env:ANDROID_HOME }
    if (-not $sdkRoot) { $sdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
    $buildToolsRoot = Join-Path $sdkRoot 'build-tools'
    if (Test-Path -LiteralPath $buildToolsRoot) {
        $AndroidBuildToolsPath = (Get-ChildItem -LiteralPath $buildToolsRoot -Directory |
            Sort-Object { try { [version]$_.Name } catch { [version]'0.0' } } -Descending |
            Select-Object -First 1 -ExpandProperty FullName)
    }
}
if (-not $AndroidBuildToolsPath) { throw 'Android build-tools directory is required.' }
$aapt = Join-Path $AndroidBuildToolsPath 'aapt.exe'
$apksigner = Join-Path $AndroidBuildToolsPath 'apksigner.bat'
$apksigJar = Join-Path $AndroidBuildToolsPath 'lib\apksigner.jar'
$lineageProbe = Join-Path $PSScriptRoot 'android\AndroidSigningLineageProbe.java'
if (-not (Test-Path -LiteralPath $aapt) -or -not (Test-Path -LiteralPath $apksigner)) {
    throw 'Android build-tools must contain aapt.exe and apksigner.bat.'
}
if (-not (Test-Path -LiteralPath $apksigJar) -or -not (Test-Path -LiteralPath $lineageProbe)) {
    throw 'Android build-tools apksigner.jar and the signing-lineage probe are required.'
}

if ($JavaHome) { $env:JAVA_HOME = $JavaHome }
if (-not $env:JAVA_HOME -and (Test-Path 'C:\Program Files\Android\Android Studio\jbr\bin\java.exe')) {
    $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
}
if ($env:JAVA_HOME) { $env:PATH = "$env:JAVA_HOME\bin;$env:PATH" }
$java = Resolve-Tool 'java' ''

$deviceState = Invoke-Captured $adb @('get-state')
if ($deviceState.Trim() -ne 'device') { throw 'Exactly one authorized Android device must be connected and ready.' }
$installedDetails = Invoke-Captured $adb @('shell', 'dumpsys', 'package', 'com.grookai.vault')
$installedVersionMatch = [regex]::Match($installedDetails, '(?m)^\s*versionCode=([0-9]+)')
if (-not $installedVersionMatch.Success) { throw 'The installed Grookai Vault version could not be read.' }
$installedPathOutput = Invoke-Captured $adb @('shell', 'pm', 'path', 'com.grookai.vault')
$installedBaseMatch = [regex]::Match($installedPathOutput, '(?m)^package:(.+/base\.apk)\s*$')
if (-not $installedBaseMatch.Success) { throw 'Could not locate the installed base APK.' }
$installedApk = Join-Path ([IO.Path]::GetTempPath()) ("grookai-installed-" + [guid]::NewGuid().ToString('N') + '.apk')
try {
    Invoke-Captured $adb @('pull', $installedBaseMatch.Groups[1].Value, $installedApk) | Out-Null
    $candidate = Read-ApkIdentity $apk $aapt $apksigner $java $apksigJar $lineageProbe
    $installed = Read-ApkIdentity $installedApk $aapt $apksigner $java $apksigJar $lineageProbe
    $installedCode = [long]$installedVersionMatch.Groups[1].Value

    if ($installed.VersionCode -ne $installedCode) {
        throw 'Installed APK version and package-manager version do not agree; stop and inspect the device state.'
    }
    if ($candidate.Package -ne 'com.grookai.vault' -or $installed.Package -ne 'com.grookai.vault') {
        throw 'Package ID mismatch; expected com.grookai.vault.'
    }
    if ($candidate.VersionCode -le $installedCode) {
        throw "Candidate build $($candidate.VersionCode) must be greater than installed build $installedCode."
    }
    $releaseSigner = 'a1290a32711ab390f798c0898a4d0d78c97f20b2e12adb55bb2260bff9036119'
    if ($candidate.SignerSha256 -ne $releaseSigner) {
        throw "Candidate signer $($candidate.SignerSha256) is not the approved release signer $releaseSigner."
    }
    $hasExactSigner = $candidate.SignerSha256 -eq $installed.SignerSha256
    $hasInstalledDataLineage = @($candidate.Lineage | Where-Object {
        $_.sha256 -eq $installed.SignerSha256 -and $_.installedData -eq $true
    }).Count -gt 0
    if (-not $hasExactSigner -and -not $hasInstalledDataLineage) {
        throw "Signer continuity is not proven. Installed=$($installed.SignerSha256); candidate=$($candidate.SignerSha256); no verified lineage grants installed-data continuity. No update is safe."
    }

    $continuity = if ($hasExactSigner) { 'exact signer match' } else { 'verified signing lineage with installed-data capability' }
    Write-Output "Update preflight passed: $($candidate.Package) $($candidate.VersionName) ($($candidate.VersionCode)); signer $($candidate.SignerSha256); $continuity. Existing app data will be retained by an in-place update."
} finally {
    Remove-Item -LiteralPath $installedApk -Force -ErrorAction SilentlyContinue
}
