<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1lSuFGB3oiXcroRkt7Fv74Pde9XJ9ZU-k

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Build Android APK (Capacitor)

This project is set up to package the web app as a native Android app using Capacitor.

Prerequisites:

- Node.js (already required above)
- Java JDK 17 or 21 installed and JAVA_HOME set
- Android Studio with Android SDK, Platform Tools, and a recent Android API installed

One-time setup:

1. Build the web assets:
   - `npm run build`
2. Add and sync Android platform:
   - `npx cap add android`
   - `npx cap sync android`

Build a debug APK (Windows):

1. Build the APK:
   - `npm run android`
2. The debug APK will be generated at:
   - `android/app/build/outputs/apk/debug/app-debug.apk`

Open Android project (optional):

- `npx cap open android` to open in Android Studio to run on a device/emulator.

Install APK on a device:

1. Enable Developer Options and USB debugging on the Android device.
2. Connect the device via USB. Ensure `adb` sees it: `adb devices`.
3. Install the APK:
   - `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`

Release build (Play Store):

- Use Android Studio or Gradle to create a signed app bundle:
  - `cd android && ./gradlew.bat bundleRelease`
- The AAB will be at `android/app/build/outputs/bundle/release/app-release.aab`.
- Sign with a keystore and upload to Play Console.
