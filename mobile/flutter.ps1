$flutterCommand = Get-Command flutter -ErrorAction SilentlyContinue
if ($flutterCommand) {
    & $flutterCommand.Source @args
} else {
    $diriFlutterSdk = Join-Path $env:USERPROFILE '.cache/diri-flutter-sdk/bin/flutter.bat'
    if (-not (Test-Path -LiteralPath $diriFlutterSdk)) {
        throw 'Install Flutter and add its bin directory to PATH first.'
    }
    & $diriFlutterSdk --no-version-check @args
}
exit $LASTEXITCODE
