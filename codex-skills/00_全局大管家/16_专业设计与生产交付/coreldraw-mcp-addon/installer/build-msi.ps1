<#
.SYNOPSIS
  Builds the CorelDRAW MCP add-on and packages it into an MSI.

.DESCRIPTION
  Builds src\CorelMcpAddon for a specific CorelDRAW version, then produces an MSI that
  installs it into <CorelDRAW>\Programs64\Addons\CorelMcp.

  The CorelDRAW root is discovered at install time from
  HKLM\SOFTWARE\Corel\CorelDRAW\<version>\ProgramsDir, so the package is not tied to a
  hard-coded install path.

  Each CorelDRAW version gets its own product identity (a deterministic UpgradeCode and
  deterministic component GUIDs derived from the version), so packages for e.g. 26 and 27
  can be installed side by side without upgrading each other.

.PARAMETER CorelDrawVersion
  CorelDRAW install version to target: 26 = CorelDRAW 2025, 27 = CorelDRAW 2026.

.PARAMETER Version
  Product version recorded by the MSI (x.y.z). When omitted, the patch number is bumped
  automatically whenever the add-on sources or the WiX definition change, so a rebuilt
  package always upgrades the installed one. The current version is kept in version.txt.

.PARAMETER Configuration
  Build configuration for the add-on assembly (default Release).

.PARAMETER OutputPath
  Output MSI path. Defaults to dist\CorelMcpAddon-<CorelDrawVersion>.msi.

.PARAMETER SkipBuild
  Reuse the existing build output instead of rebuilding the add-on.

.PARAMETER Culture
  UI cultures compiled into the package. The default (en-US, ru-RU) produces one MSI with both
  languages embedded; Windows picks the one matching the user's locale. Pass a single culture to
  build a monolingual package.

.PARAMETER PfxPath
  Code-signing certificate (.pfx). When given, the finished MSI is signed with signtool.

.PARAMETER PfxPassword
  Password for -PfxPath, if the container has one.

.PARAMETER Thumbprint
  Thumbprint of a certificate in the current user's store. Alternative to -PfxPath.

.PARAMETER TimestampUrl
  RFC 3161 timestamp server used while signing (default http://timestamp.digicert.com).

.EXAMPLE
  .\installer\build-msi.ps1
.EXAMPLE
  .\installer\build-msi.ps1 -CorelDrawVersion 26 -Version 1.1.0
.EXAMPLE
  .\installer\build-msi.ps1 -Thumbprint 1A2B3C... -TimestampUrl http://timestamp.digicert.com
#>
[CmdletBinding()]
param(
    [string]$CorelDrawVersion = '27',
    [string]$Version,
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Release',
    [string]$OutputPath,
    [switch]$SkipBuild,
    [string[]]$Culture = @('en-US', 'ru-RU'),
    [string]$PfxPath,
    [string]$PfxPassword,
    [string]$Thumbprint,
    [string]$TimestampUrl = 'http://timestamp.digicert.com'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectFile = Join-Path $repoRoot 'src\CorelMcpAddon\CorelMcpAddon.csproj'
$wxsFile = Join-Path $PSScriptRoot 'CorelMcpAddon.wxs'
$eulaFile = Join-Path $PSScriptRoot 'EULA.rtf'
$eulaRuFile = Join-Path $PSScriptRoot 'EULA.ru.rtf'
$iconFile = Join-Path $PSScriptRoot 'app.ico'

foreach ($required in @(
    @{ Path = $eulaFile; Why = 'English licence text (the UI dialog needs it)' },
    @{ Path = $eulaRuFile; Why = 'Russian licence text for the ru-RU localization' },
    @{ Path = $iconFile; Why = 'Add/Remove Programs icon (run installer\make-icon.ps1)' }
)) {
    if (-not (Test-Path $required.Path)) {
        throw "Not found: $($required.Path) - $($required.Why)."
    }
}

foreach ($cultureName in $Culture) {
    $wxl = Join-Path $PSScriptRoot "Strings.$cultureName.wxl"
    if (-not (Test-Path $wxl)) {
        throw "Localization file for '$cultureName' not found at '$wxl'."
    }
}

if (-not $OutputPath) {
    $OutputPath = Join-Path $repoRoot "dist\CorelMcpAddon-$CorelDrawVersion.msi"
}

# --- signtool lookup (only needed when signing is requested). ---
function Find-SignTool {
    $command = Get-Command 'signtool.exe' -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    $kits = @(
        (Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'),
        (Join-Path $env:ProgramFiles 'Windows Kits\10\bin')
    ) | Where-Object { $_ -and (Test-Path $_) }

    foreach ($kit in $kits) {
        $candidate = Get-ChildItem -Path $kit -Recurse -File -Filter 'signtool.exe' -ErrorAction SilentlyContinue |
            Where-Object { $_.DirectoryName -match '\\x64$' } |
            Sort-Object -Property FullName -Descending |
            Select-Object -First 1
        if ($candidate) { return $candidate.FullName }
    }
    return $null
}

# --- Product version ---
# Bump the patch automatically when the add-on sources (or the .wxs) change, so a rebuilt
# MSI always has a higher ProductVersion than the installed one and MajorUpgrade replaces it.
# The fingerprint is source-based, so the packages for two CorelDRAW versions built from the
# same revision share one product version.
$versionFile = Join-Path $PSScriptRoot 'version.txt'

$fingerprintFiles = @(
    Get-ChildItem -Path (Join-Path $repoRoot 'src\CorelMcpAddon') -Recurse -File -Filter *.cs |
        Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' } |
        Sort-Object -Property FullName |
        Select-Object -ExpandProperty FullName
)
$fingerprintFiles += $wxsFile

$sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
    foreach ($file in $fingerprintFiles) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        [void]$sha256.TransformBlock($bytes, 0, $bytes.Length, $null, 0)
    }
    [void]$sha256.TransformFinalBlock([byte[]]@(), 0, 0)
    $fingerprint = ([System.BitConverter]::ToString($sha256.Hash) -replace '-', '').ToLowerInvariant()
}
finally {
    $sha256.Dispose()
}

$storedVersion = '1.0.0'
$storedFingerprint = ''
if (Test-Path $versionFile) {
    $lines = @(Get-Content -Path $versionFile)
    if ($lines.Count -ge 1 -and $lines[0].Trim() -match '^\d+\.\d+\.\d+$') { $storedVersion = $lines[0].Trim() }
    if ($lines.Count -ge 2) { $storedFingerprint = $lines[1].Trim() }
}

if ($Version) {
    if ($Version -notmatch '^\d+\.\d+\.\d+$') {
        throw "Version must be in x.y.z form (got '$Version')."
    }
}
elseif ($fingerprint -ne $storedFingerprint) {
    $parts = $storedVersion -split '\.'
    $parts[2] = [string]([int]$parts[2] + 1)
    $Version = $parts -join '.'
}
else {
    $Version = $storedVersion
}

# --- Deterministic GUIDs: stable across builds, distinct per CorelDRAW version. ---
function New-DeterministicGuid([string]$seed) {
    $md5 = [System.Security.Cryptography.MD5]::Create()
    try {
        $bytes = $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($seed))
        return ([guid]::new($bytes)).ToString().ToUpper()
    }
    finally {
        $md5.Dispose()
    }
}

$upgradeCode = New-DeterministicGuid "CorelMcpAddon.Product.CorelDRAW.$CorelDrawVersion"
$guidBinaries = New-DeterministicGuid "CorelMcpAddon.Component.Binaries.CorelDRAW.$CorelDrawVersion"
$guidUi = New-DeterministicGuid "CorelMcpAddon.Component.Ui.CorelDRAW.$CorelDrawVersion"
$guidConfig = New-DeterministicGuid "CorelMcpAddon.Component.Config.CorelDRAW.$CorelDrawVersion"

Write-Host "CorelDRAW version : $CorelDrawVersion" -ForegroundColor Cyan
Write-Host "Product version   : $Version"
Write-Host "UpgradeCode       : $upgradeCode"

# --- Warn early when the target CorelDRAW is not installed locally. ---
$regKey = "HKLM:\SOFTWARE\Corel\CorelDRAW\$CorelDrawVersion.0"
if (Test-Path $regKey) {
    $programsDir = (Get-ItemProperty -Path $regKey -Name ProgramsDir -ErrorAction SilentlyContinue).ProgramsDir
    Write-Host "Target addons dir : $programsDir`Addons\CorelMcp"
}
else {
    Write-Warning "CorelDRAW $CorelDrawVersion was not found locally ($regKey). The MSI will be built, but it will refuse to install on machines without that version."
}

# --- Build the add-on assembly. ---
if (-not $SkipBuild) {
    Write-Host "`nBuilding the add-on ($Configuration) ..." -ForegroundColor Cyan
    & dotnet build $projectFile -c $Configuration -p:CorelDrawVersion=$CorelDrawVersion -p:Version=$Version
    if ($LASTEXITCODE -ne 0) { throw 'Add-on build failed.' }
}

$sourceDir = Join-Path $repoRoot "src\CorelMcpAddon\bin\$Configuration"
if (-not (Test-Path (Join-Path $sourceDir 'CorelMcp.dll'))) {
    throw "Add-on build output not found in '$sourceDir'. Run without -SkipBuild."
}

# --- Ensure the WiX tool and its extension are available. ---
Push-Location $repoRoot
try {
    $null = & dotnet tool restore 2>&1
    $wixVersion = & dotnet wix --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "WiX is not available. Run 'dotnet tool restore' in $repoRoot."
    }
    Write-Host "`nWiX              : $wixVersion"

    $extensions = & dotnet wix extension list 2>&1
    foreach ($extension in 'WixToolset.Util.wixext', 'WixToolset.UI.wixext') {
        if ($extensions -notmatch [regex]::Escape($extension)) {
            Write-Host "Adding the WiX extension $extension ..."
            & dotnet wix extension add "$extension/5.0.2"
            if ($LASTEXITCODE -ne 0) { throw "Could not add the WiX extension $extension." }
        }
    }

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null

    # WiX 5 does not merge several cultures into one MSI (the loc files collide), so each culture
    # gets its own package. The first culture keeps the documented file name; the others get a
    # language suffix: CorelMcpAddon-27.msi, CorelMcpAddon-27-ru.msi, ...
    $built = @()
    $primary = $Culture[0]

    foreach ($cultureName in $Culture) {
        $cultureOutput = if ($cultureName -eq $primary) {
            $OutputPath
        }
        else {
            $language = ($cultureName -split '-')[0]
            [System.IO.Path]::Combine(
                [System.IO.Path]::GetDirectoryName($OutputPath),
                [System.IO.Path]::GetFileNameWithoutExtension($OutputPath) + "-$language" +
                    [System.IO.Path]::GetExtension($OutputPath))
        }

        $licence = if ($cultureName -like 'ru-*') { $eulaRuFile } else { $eulaFile }

        Write-Host "`nBuilding the MSI ($cultureName) ..." -ForegroundColor Cyan
        & dotnet wix build $wxsFile `
            -arch x64 `
            -ext WixToolset.Util.wixext `
            -ext WixToolset.UI.wixext `
            -culture $cultureName `
            -loc (Join-Path $PSScriptRoot "Strings.$cultureName.wxl") `
            -d "Version=$Version" `
            -d "CorelVersion=$CorelDrawVersion" `
            -d "SourceDir=$sourceDir" `
            -d "IconPath=$iconFile" `
            -d "EulaRtfPath=$licence" `
            -d "UpgradeCode=$upgradeCode" `
            -d "GuidBinaries=$guidBinaries" `
            -d "GuidUi=$guidUi" `
            -d "GuidConfig=$guidConfig" `
            -o $cultureOutput

        if ($LASTEXITCODE -ne 0) { throw "MSI build failed for culture '$cultureName'." }
        if (-not (Test-Path $cultureOutput)) {
            throw "Expected MSI was not produced at '$cultureOutput'."
        }
        $built += Get-Item $cultureOutput
    }

    # Remember the version (and what it was built from) only after a successful build, so a
    # failed build does not consume a version number. Written with explicit LF endings: the
    # repository stores every text file with LF, and Set-Content would put CRLF here.
    [System.IO.File]::WriteAllText($versionFile, "$Version`n$fingerprint`n",
        [System.Text.Encoding]::ASCII)
}
finally {
    Pop-Location
}

# --- Optional code signing. ---
# An unsigned MSI makes Windows show "Windows protected your PC / Unknown publisher" before the
# UAC prompt, which is the strongest possible "do not trust this" signal for an add-on that
# installs into Program Files. Signing needs a certificate; without one we say so out loud
# instead of letting the user meet SmartScreen unprepared.
$signRequested = $PfxPath -or $Thumbprint
$signed = $false

if ($signRequested -and $PfxPath -and $Thumbprint) {
    throw 'Pass either -PfxPath or -Thumbprint, not both.'
}

if ($PfxPath) {
    if (-not (Test-Path $PfxPath)) { throw "Certificate not found at '$PfxPath'." }
}

if ($signRequested) {
    $signTool = Find-SignTool
    if (-not $signTool) {
        throw 'signtool.exe was not found. Install the Windows SDK, or build without signing.'
    }

    foreach ($package in $built) {
        $signArgs = @('sign', '/fd', 'sha256', '/tr', $TimestampUrl, '/td', 'sha256')
        if ($PfxPath) {
            $signArgs += @('/f', $PfxPath)
            if ($PfxPassword) { $signArgs += @('/p', $PfxPassword) }
        }
        else {
            $signArgs += @('/sha1', $Thumbprint)
        }
        $signArgs += $package.FullName

        Write-Host "`nSigning $($package.Name) ..." -ForegroundColor Cyan
        & $signTool @signArgs
        if ($LASTEXITCODE -ne 0) { throw "MSI signing failed for '$($package.Name)'." }

        & $signTool verify /pa $package.FullName
        if ($LASTEXITCODE -ne 0) { throw "Signature verification failed for '$($package.Name)'." }
    }
    $signed = $true
}

Write-Host ""
foreach ($msi in $built) {
    Write-Host ("Built {0} ({1:N0} bytes)" -f $msi.FullName, $msi.Length) -ForegroundColor Green
}
if ($signed) {
    Write-Host "Signed            : yes ($TimestampUrl)" -ForegroundColor Green
}
else {
    Write-Warning ('The MSI is NOT code-signed. Every user will meet "Windows protected your PC ' +
        '(Unknown publisher)" and a UAC prompt before the installer starts. Sign the package with ' +
        '-PfxPath or -Thumbprint before distributing it.')
}
Write-Host "Install with:  msiexec /i `"$($built[0].FullName)`" /l*v install.log"
Write-Host "Uninstall with: msiexec /x `"$($built[0].FullName)`""
