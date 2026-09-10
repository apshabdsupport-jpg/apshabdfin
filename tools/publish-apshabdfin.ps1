param(
    [string]$Repository = "https://github.com/apshabdsupport-jpg/apshabdfin.git"
)

$ErrorActionPreference = "Stop"
$sourceDir = Split-Path -Parent $PSScriptRoot
$stageDir = Join-Path $env:TEMP ("apshabdfin-release-" + (Get-Date -Format "yyyyMMddHHmmss"))

Write-Host "Source: $sourceDir"
Write-Host "Stage:  $stageDir"

if (!(Test-Path -LiteralPath $sourceDir -PathType Container)) {
    throw "Project folder not found: $sourceDir"
}

gh auth setup-git
if ($LASTEXITCODE -ne 0) {
    throw "GitHub authentication is not ready. Run: gh auth login --hostname github.com --git-protocol https --web"
}

git clone $Repository $stageDir
if ($LASTEXITCODE -ne 0) {
    throw "Could not clone $Repository"
}

# The temporary clone needs an explicit Git author identity before it can
# create the release commit.
git -C $stageDir config user.name "APSHABD"
git -C $stageDir config user.email "apshabdsupport@gmail.com"

# The website core stays at the repository root because its relative URLs
# and GitHub Pages deployment depend on this layout.
$excludedRootFiles = @(
    "gcm-diagnose.log",
    "Quikink_Notes_Transcription.docx"
)

$rootFiles = Get-ChildItem -LiteralPath $sourceDir -File -Force |
    Where-Object { $_.Name -notin $excludedRootFiles }

foreach ($file in $rootFiles) {
    Copy-Item -LiteralPath $file.FullName `
        -Destination (Join-Path $stageDir $file.Name) -Force
}

# These are the intentional project-level folders. Temporary QA, cache,
# OneDrive metadata, and local workspace folders are not published.
$managedFolders = @(
    ".well-known",
    "assets",
    "creative",
    "content",
    "docs",
    "tools"
)

foreach ($folderName in $managedFolders) {
    $from = Join-Path $sourceDir $folderName
    $to = Join-Path $stageDir $folderName

    if (!(Test-Path -LiteralPath $from -PathType Container)) {
        Write-Warning "Skipping missing folder: $from"
        continue
    }

    New-Item -ItemType Directory -Force -Path $to | Out-Null
    Get-ChildItem -LiteralPath $from -Force |
        Copy-Item -Destination $to -Recurse -Force

    Write-Host "Copied $folderName"
}

# Keep the non-website transcription in a systematic documentation folder.
$notesSource = Join-Path $sourceDir "Quikink_Notes_Transcription.docx"
$notesTargetDir = Join-Path $stageDir "docs\website"
if (Test-Path -LiteralPath $notesSource -PathType Leaf) {
    New-Item -ItemType Directory -Force -Path $notesTargetDir | Out-Null
    Copy-Item -LiteralPath $notesSource `
        -Destination (Join-Path $notesTargetDir "Quikink_Notes_Transcription.docx") -Force
}

git -C $stageDir add --all
$changes = @(git -C $stageDir status --short)

Write-Host ""
Write-Host "Planned repository changes: $($changes.Count) lines"
$changes | Select-Object -First 80 | ForEach-Object { Write-Host $_ }

if ($changes.Count -eq 0) {
    Write-Host "The GitHub repository already matches this organized release."
    exit 0
}

Write-Host ""
$approval = Read-Host "Type PUSH to commit and push this organized release"
if ($approval -cne "PUSH") {
    Write-Host "Stopped safely. Nothing was pushed. Staged copy remains at: $stageDir"
    exit 0
}

git -C $stageDir commit -m "Organize complete APSHABD project release"
if ($LASTEXITCODE -ne 0) {
    throw "Commit failed."
}

git -C $stageDir push origin main
if ($LASTEXITCODE -ne 0) {
    throw "Push failed. The staged copy is preserved at: $stageDir"
}

Write-Host "Release pushed successfully."
gh api repos/apshabdsupport-jpg/apshabdfin/commits/main --jq '.sha + " " + .commit.message'
