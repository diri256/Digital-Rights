param(
    [Parameter(Mandatory=$true)][string]$InputApk,
    [Parameter(Mandatory=$true)][string]$OutputApk,
    [Parameter(Mandatory=$true)][string]$SignerJar
)
$ErrorActionPreference = 'Stop'
$diriMobileRoot = Split-Path -Parent $PSScriptRoot
$diriPropertiesFile = Join-Path $diriMobileRoot 'android/key.properties'
$diriSigning = @{}
foreach ($line in Get-Content -LiteralPath $diriPropertiesFile) {
    if ($line -match '^([^#=]+)=(.*)$') { $diriSigning[$matches[1].Trim()] = $matches[2] }
}
$diriJava = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin/java.exe' } else { (Get-Command java -ErrorAction Stop).Source }
$diriInputPath = (Resolve-Path -LiteralPath $InputApk).Path
$diriSignerPath = (Resolve-Path -LiteralPath $SignerJar).Path
$diriOutputPath = [System.IO.Path]::GetFullPath($OutputApk)
if ($diriInputPath -eq $diriOutputPath) { throw 'Choose a different output path; retain the original build.' }
New-Item -ItemType Directory -Force (Split-Path -Parent $diriOutputPath) | Out-Null
$env:DIRI_STORE_PASSWORD = $diriSigning['storePassword']
$env:DIRI_KEY_PASSWORD = $diriSigning['keyPassword']
try {
    & $diriJava -jar $diriSignerPath sign --ks $diriSigning['storeFile'] --ks-key-alias $diriSigning['keyAlias'] --ks-pass env:DIRI_STORE_PASSWORD --key-pass env:DIRI_KEY_PASSWORD --out $diriOutputPath $diriInputPath
    if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }
    & $diriJava -jar $diriSignerPath verify --verbose --print-certs $diriOutputPath
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    Get-FileHash -LiteralPath $diriOutputPath -Algorithm SHA256 | Format-List
} finally {
    Remove-Item Env:DIRI_STORE_PASSWORD,Env:DIRI_KEY_PASSWORD -ErrorAction SilentlyContinue
    $diriSigning.Clear()
}
