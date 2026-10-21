param([switch]$Bundle)
$ErrorActionPreference = 'Stop'
$diriMobileRoot = Split-Path -Parent $PSScriptRoot
Push-Location $diriMobileRoot
try {
    & ./flutter.ps1 pub get --enforce-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'Dependency resolution failed.' }
    & ./flutter.ps1 analyze
    if ($LASTEXITCODE -ne 0) { throw 'Analysis failed.' }
    & ./flutter.ps1 test
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
    if ($Bundle) {
        & ./flutter.ps1 build appbundle --release
    } else {
        & ./flutter.ps1 build apk --release --split-per-abi
    }
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
} finally {
    Pop-Location
}
