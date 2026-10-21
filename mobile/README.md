# DIRI for Android and iOS

Native Flutter learner app alongside the existing website. Android application ID: `online.diri.diri_app`; iOS bundle ID: `online.diri.diriApp`. Developed with Flutter **3.47.7** / Dart **3.13.5**. Website functionality and database schemas are unchanged.

## Run

```sh
cd mobile
flutter pub get --enforce-lockfile
flutter run
```

On this Windows machine Flutter is installed at `C:\Users\OPAKI\.cache\diri-flutter-sdk`. Use `./flutter.ps1` from this directory if Flutter is not on PATH. Android SDK/JDK and an emulator or USB device are needed to run Android. iOS requires macOS and Xcode.

## Included

- Native DIRI home and five-tab navigation, original logo, navy/teal palette, accessible text and scrollable layouts.
- All nine website lessons and 36 flashcards bundled for offline reading; filters, search, video links, signed-in completion saved to the same lesson_progress records.
- Email/password login, registration with email confirmation, website password reset, persisted Supabase sessions, profile creation/display-name editing, sign-out, and the existing delete-account function.
- Current published weekly quiz, question ordering, saved answers, resume, timer, retryable submission and results. Legacy forum quizzes use the website's curated safety questions. Completed attempts are not reset.
- Weekly, monthly and all-time leaderboard using the website RPC.
- Dashboard with progress, quiz history, certificate requests and issued certificates; certificate requests and public verification use existing RPCs.
- Training requests, including participant type, preferred date and certification preference, plus training attendance/assessment/certification records in the account dashboard.
- Native published news and article screens, and seven bundled offline information/help/policy pages copied from the website.
- Mr. DIRI chat using the existing server endpoint, including source links, loading/errors and retained input on failure. No Gemini key is stored in the app.

## Current boundaries

This is a native learner implementation, not complete screen-for-screen website parity. Videos, password reset and digital certificate viewing/downloading open the website or external player. Google OAuth, full Luganda UI translation, profile-photo upload, admin/policymaker tools, and the USSD simulator are not ported. Certificate eligibility and issuance remain controlled by the existing backend. Offline policy/help pages reflect the bundled website snapshot and include a link to the current website version.

Lessons work offline. Account changes, progress saving, quizzes, chat and verification require a connection; failed writes are not claimed as saved. Quiz scoring follows the website's existing client-side schema; authoritative server-side scoring and timing should be implemented before high-stakes assessments. The mobile timer continues while the app is backgrounded or closed.

## Backend configuration

`assets/public_config.json` copies the website's existing public Supabase URL and anon key. These are public client identifiers; protection relies on the existing RLS and RPC permissions. Never put service-role or Gemini secrets here.

```sh
flutter run --dart-define=SUPABASE_URL=https://PROJECT.supabase.co --dart-define=SUPABASE_ANON_KEY=PUBLIC_KEY --dart-define=DIRI_SITE_URL=https://diri.online
```

The app uses existing deployed tables/functions; no migrations were applied. Sign-up/reset redirects use the website. Confirm `https://diri.online/index.html` and `https://diri.online/login.html?reset=1` are allowed in Supabase Auth. Native OAuth is not enabled until mobile callback URLs and provider configuration are set up.

## Keep content in sync

From the repository root, after editing website lessons:

```sh
node mobile/tool/sync_content.cjs
```

The generator copies lessons, curated quiz fallback, seven informational pages, public configuration and original brand images. Review generated JSON in the same change. Font assets include their upstream Apache license.

## Validate and build

```sh
flutter analyze
flutter test
dart run flutter_launcher_icons
flutter build apk --debug
# On a Mac:
flutter build ios --simulator --debug
```

Tests cover lesson integrity, quiz scheduling/scoring, search, completion gating, authentication validation, small-screen/large-text layout, failed answer saves and retried submission. The preview test renders a phone preview to `build/previews/diri-home.png`.

The GitHub workflow in `.github/workflows/mobile.yml` runs checks and produces Android debug APKs, unsigned release APKs for local signing, and an iOS simulator build. A simulator build is not an installable iPhone release. Unsigned APKs must be signed before installation; the private release key never needs to be uploaded to GitHub.

## Release signing

Android release builds use `android/key.properties`, which is ignored by Git. The local DIRI key is stored at `%USERPROFILE%\.diri\signing\diri-upload.jks`; securely back up that file **and** `android/key.properties`. Updates must retain the same signing identity. Do not share either file publicly or regenerate the key for subsequent builds.

`tool/create_signing_key.ps1` creates a new identity only if none exists. `tool/build_android.ps1` checks, tests, and builds signed release APKs; pass `-Bundle` for a Play Store AAB. Missing signing configuration fails release builds instead of silently using a debug key. CI explicitly opts into unsigned output using `DIRI_ALLOW_UNSIGNED_RELEASE=true`.

Store publication still needs Apple signing/team configuration, store records, privacy declarations, device testing and end-to-end checks with a dedicated test account. No production account was created and no real learner record was mutated during development.
## Build verification

The Android debug and release APKs and iOS simulator app compiled successfully in GitHub Actions on 21 October 2026 for commit `7bc993720d2d3d30e326ea239269e1eb14db4437`. The runner also passed Flutter analysis and all 14 tests. See [build run](https://github.com/diri256/Digital-Rights/actions/runs/39560300011).

On this PC, Java 17 and the Android command-line tools are installed. The remaining local SDK/NDK downloads failed because of network resets/timeouts; use the CI artifacts until those downloads can complete. The cloud build avoids depending on this incomplete local Android SDK.

For an Android release built in CI, use `tool/sign_android_apk.ps1` with the downloaded unsigned APK and `apksigner.jar`; it signs with the private local key and verifies the result. See [INSTALL.md](INSTALL.md) for phone installation and first-device checks.

Signed ARM64, ARMv7 and x86-64 release APKs are available locally in `build/releases/`, with `SHA256SUMS.txt`. Their APK v2/v3 signatures were verified with Android's apksigner. The signer certificate SHA-256 is `643aa858b0d0773299cb16f9bb25ac1ec6f356c94781136a9b6e8430ed2de98c`. These files are ignored by Git; keep a copy before running `flutter clean`. They have not yet been tested on a physical phone.

The signing scripts require Java on PATH or `JAVA_HOME` pointing at a JDK. On this PC the installed JDK is `%USERPROFILE%\.cache\diri-android-tools\java\jdk-17.0.20.1+1`.
