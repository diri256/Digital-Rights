# Creates a persistent local signing identity; never overwrites an existing key.
# Keep both the keystore and android/key.properties backed up privately.
$ErrorActionPreference = 'Stop'
$diriMobileRoot = Split-Path -Parent $PSScriptRoot
$diriKeyDirectory = Join-Path $env:USERPROFILE '.diri/signing'
$diriKeyFile = Join-Path $diriKeyDirectory 'diri-upload.jks'
$diriProperties = Join-Path $diriMobileRoot 'android/key.properties'
if ((Test-Path -LiteralPath $diriKeyFile) -or (Test-Path -LiteralPath $diriProperties)) {
    throw 'A DIRI signing key or configuration already exists. Preserve it; do not generate a replacement.'
}
$diriKeytool = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin/keytool.exe' } else { (Get-Command keytool -ErrorAction Stop).Source }
New-Item -ItemType Directory -Force $diriKeyDirectory | Out-Null
$diriSecretBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($diriSecretBytes)
$env:DIRI_SIGNING_PASSWORD = [Convert]::ToBase64String($diriSecretBytes)
try {
    & $diriKeytool -genkeypair -v -keystore $diriKeyFile -storetype JKS -keyalg RSA -keysize 3072 -validity 10000 -alias diri-upload -dname 'CN=DIRI, OU=Mobile, O=DIRI' -storepass:env DIRI_SIGNING_PASSWORD -keypass:env DIRI_SIGNING_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw 'Key generation failed. No signing configuration was written.' }
    $diriKeyPath = $diriKeyFile.Replace('\', '/')
    @(
        ('storePassword=' + $env:DIRI_SIGNING_PASSWORD)
        ('keyPassword=' + $env:DIRI_SIGNING_PASSWORD)
        'keyAlias=diri-upload'
        ('storeFile=' + $diriKeyPath)
    ) | Set-Content -LiteralPath $diriProperties -Encoding ascii
    Write-Output 'DIRI release signing is configured. Back up the private key and android/key.properties securely.'
    Write-Output ('Keystore: ' + $diriKeyFile)
} finally {
    Remove-Item Env:DIRI_SIGNING_PASSWORD -ErrorAction SilentlyContinue
    [Array]::Clear($diriSecretBytes, 0, $diriSecretBytes.Length)
}
