Set-StrictMode -Version Latest

function Assert-VibeRouteTrue {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if ($Condition) {
        Write-Host "[PASS] $Message"
        return $true
    }

    Write-Host "[FAIL] $Message" -ForegroundColor Red
    return $false
}

function Read-VibeRouteJsonUtf8 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    return ([System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8) | ConvertFrom-Json)
}

function Resolve-VibeRouteAuditRepoRoot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptRoot
    )

    return (Resolve-Path (Join-Path $ScriptRoot "..\..")).Path
}

function Install-VibeRouteAuditSkills {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [Parameter(Mandatory = $true)]
        [string]$TargetRoot
    )

    $routeSkills = @(
        "flashrag-evidence",
        "generating-test-reports",
        "gh-fix-ci",
        "latex-submission-pipeline",
        "literature-review",
        "ml-data-leakage-guard",
        "pdf",
        "preprocessing-data-with-automated-pipelines",
        "scientific-reporting",
        "scientific-schematics",
        "scientific-visualization",
        "scikit-learn",
        "sentry",
        "systematic-debugging",
        "webthinker-deep-research"
    )

    $skillsRoot = Join-Path $TargetRoot "skills"
    New-Item -ItemType Directory -Path $skillsRoot -Force | Out-Null

    foreach ($skillId in $routeSkills) {
        $source = Join-Path $RepoRoot ("bundled\skills\{0}" -f $skillId)
        $destination = Join-Path $skillsRoot $skillId
        if (Test-Path -LiteralPath $source) {
            Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
        }
    }
}

function New-VibeRouteAuditWorkspace {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    $workspaceRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("vibe-route-audit-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $workspaceRoot -Force | Out-Null
    $targetRoot = Join-Path $workspaceRoot ".agents"
    New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
    Install-VibeRouteAuditSkills -RepoRoot $RepoRoot -TargetRoot $targetRoot

    return [pscustomobject]@{
        workspace_root = $workspaceRoot
        target_root    = $targetRoot
    }
}

function Remove-VibeRouteAuditWorkspace {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Workspace
    )

    if ($null -ne $Workspace -and $Workspace.PSObject.Properties.Name -contains "workspace_root") {
        $workspaceRoot = [string]$Workspace.workspace_root
        if (-not [string]::IsNullOrWhiteSpace($workspaceRoot) -and (Test-Path -LiteralPath $workspaceRoot)) {
            Remove-Item -LiteralPath $workspaceRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Invoke-VibeRouteAudit {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [Parameter(Mandatory = $true)]
        [string]$TargetRoot,
        [Parameter(Mandatory = $true)]
        [string]$Prompt,
        [Parameter(Mandatory = $true)]
        [string]$Grade,
        [Parameter(Mandatory = $true)]
        [string]$TaskType,
        [string]$RequestedSkill = ""
    )

    $resolver = Join-Path $RepoRoot "scripts\router\resolve-pack-route.ps1"
    $confirmUiState = Join-Path (Join-Path $RepoRoot "outputs\runtime") "confirm-ui-state.json"
    if (Test-Path -LiteralPath $confirmUiState) {
        Remove-Item -LiteralPath $confirmUiState -Force -ErrorAction SilentlyContinue
    }

    $routeArgs = @{
        Prompt     = $Prompt
        Grade      = $Grade
        TaskType   = $TaskType
        TargetRoot = $TargetRoot
    }
    if (-not [string]::IsNullOrWhiteSpace($RequestedSkill)) {
        $routeArgs["RequestedSkill"] = $RequestedSkill
    }

    return (& $resolver @routeArgs | ConvertFrom-Json)
}

function Get-VibeRouteReplayCases {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [Parameter(Mandatory = $true)]
        [string]$ExpectedRouteMode
    )

    $fixturePath = Join-Path $RepoRoot "tests\replay\route\recovery-wave-curated-prompts.json"
    $fixture = Read-VibeRouteJsonUtf8 -Path $fixturePath
    return @(
        $fixture.cases |
            Where-Object { [string]$_.expected.route_mode -eq $ExpectedRouteMode } |
            Sort-Object id
    )
}

function New-VibeRouteSuiteSummary {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title,
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [bool[]]$Assertions
    )

    $passed = @($Assertions | Where-Object { $_ }).Count
    $failed = @($Assertions | Where-Object { -not $_ }).Count

    Write-Host ""
    Write-Host ("=== {0} Summary ===" -f $Title)
    Write-Host ("Total assertions: {0}" -f $Assertions.Count)
    Write-Host ("Passed: {0}" -f $passed)
    Write-Host ("Failed: {0}" -f $failed)

    return [pscustomobject]@{
        title       = $Title
        total       = $Assertions.Count
        passed      = $passed
        failed      = $failed
        gate_passed = ($failed -eq 0)
    }
}
