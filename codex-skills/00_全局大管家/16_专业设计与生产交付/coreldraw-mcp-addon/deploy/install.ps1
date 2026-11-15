<#
.SYNOPSIS
  Builds and deploys the CorelDRAW MCP add-on into the CorelDRAW "Addons" folder.

.DESCRIPTION
  Copies CorelMcp.dll plus its UI/config payload into
  <CorelDRAW install>\Programs64\Addons\CorelMcp\, where CorelDRAW discovers it at startup.

  Writing into "C:\Program Files\..." requires an elevated PowerShell session.

.PARAMETER Configuration
  Build configuration, Debug or Release (default Release).

.PARAMETER CorelDrawVersion
  CorelDRAW install version folder to target: 26 = CorelDRAW 2025, 27 = CorelDRAW 2026.

.PARAMETER CorelInstallRoot
  Override the CorelDRAW install root (default "C:\Program Files\Corel\CorelDRAW Graphics Suite\<version>").

.PARAMETER NoBuild
  Skip the build and deploy whatever is already in bin\.

.PARAMETER Uninstall
  Remove the add-on folder instead of installing it.

.EXAMPLE
  .\install.ps1
.EXAMPLE
  .\install.ps1 -CorelDrawVersion 26 -Configuration Debug
.EXAMPLE
  .\install.ps1 -Uninstall
#>
[CmdletBinding()]
param(
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Release',

    [string]$CorelDrawVersion = '27',

    [string]$CorelInstallRoot,

    [switch]$NoBuild,

    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectDir = Join-Path $repoRoot 'src\CorelMcpAddon'
$projectFile = Join-Path $projectDir 'CorelMcpAddon.csproj'

if (-not $CorelInstallRoot) {
    $CorelInstallRoot = "C:\Program Files\Corel\CorelDRAW Graphics Suite\$CorelDrawVersion"
}

$programsDir = Join-Path $CorelInstallRoot 'Programs64'
$addonDir = Join-Path $programsDir 'Addons\CorelMcp'

Write-Host "CorelDRAW root : $CorelInstallRoot"
Write-Host "Add-on folder  : $addonDir"

if (-not (Test-Path $programsDir)) {
    throw "CorelDRAW Programs64 folder not found at '$programsDir'. Pass -CorelDrawVersion or -CorelInstallRoot."
}

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    throw "Administrator rights are required to write into '$addonDir'. Re-open PowerShell as Administrator."
}

if ($Uninstall) {
    if (Test-Path $addonDir) {
        Remove-Item $addonDir -Recurse -Force
        Write-Host "Removed $addonDir. Restart CorelDRAW to unload the add-on." -ForegroundColor Yellow
    }
    else {
        Write-Host "Nothing to remove at $addonDir." -ForegroundColor Yellow
    }
    return
}

if (-not $NoBuild) {
    Write-Host "Building ($Configuration) against CorelDRAW $CorelDrawVersion ..." -ForegroundColor Cyan
    & dotnet build $projectFile -c $Configuration -p:CorelDrawVersion=$CorelDrawVersion
    if ($LASTEXITCODE -ne 0) { throw "Build failed." }
}

$outputDir = Join-Path $projectDir "bin\$Configuration"
if (-not (Test-Path (Join-Path $outputDir 'CorelMcp.dll'))) {
    throw "Build output not found in '$outputDir'. Run without -NoBuild."
}

New-Item -ItemType Directory -Force -Path $addonDir | Out-Null

# Always replace the binary and the UI definition files.
foreach ($file in 'CorelMcp.dll', 'AppUI.xslt', 'UserUI.xslt', 'Coreldrw.addon') {
    Copy-Item (Join-Path $outputDir $file) (Join-Path $addonDir $file) -Force
    Write-Host "  copied $file"
}

# Never overwrite an existing user configuration.
$targetConfig = Join-Path $addonDir 'config.json'
if (Test-Path $targetConfig) {
    Write-Host "  kept existing config.json" -ForegroundColor DarkGray
}
else {
    Copy-Item (Join-Path $outputDir 'config.json') $targetConfig -Force
    Write-Host "  copied config.json"
}

Write-Host ""
Write-Host "Deployed to: $addonDir" -ForegroundColor Green
Write-Host "Next: start CorelDRAW, then open Window > Dockers > Corel MCP (or Tools > Corel MCP)."
Write-Host "The MCP endpoint will be http://127.0.0.1:8765/mcp (see config.json)."
