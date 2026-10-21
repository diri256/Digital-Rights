# Install DIRI on an Android phone

Use a **signed** APK from the `mobile/build/releases` folder. The unsigned CI artifacts cannot be installed directly.

1. Copy the ARM64 APK to your Android phone using USB or another trusted file-transfer method.
2. Open the APK in the phone's Files app.
3. If Android asks, allow this Files app to install unknown apps, then tap Install.
4. Open DIRI and sign in with your existing website account, or create an account and confirm your email.
5. You can turn off the Files app's unknown-app installation permission afterward.

If your phone reports that ARM64 is incompatible, use the ARMv7 build instead. Do not uninstall an existing DIRI app just to resolve an update error; report the error first so we can check the package/signature without losing local data.

## First device check

- Open a lesson, read all four cards, save completion, and refresh the account dashboard.
- Check that the website and the app show the same progress.
- Open news and a published article; open the safety guide with the connection turned off.
- Sign out and sign back in. Verify that saved learning remains visible.
- If participating in the current quiz, complete it normally and confirm the result is saved. Quiz submissions affect your real learner record.
- Try certificate verification with a known issued certificate, if you have one.

Please note the phone model, Android version and exact error text when reporting a problem. Do not send passwords, PINs or login codes.

## iPhone

Android APKs do not run on iPhones. The iOS project and simulator build can be validated on a Mac. Installing on a physical iPhone/TestFlight requires an Apple Developer team, signing and a distribution build; none of those are supplied by an Android APK or the simulator artifact.
