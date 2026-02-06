# Android APK Build Guide for NewMarx Media

## Quick Start (Using Expo EAS Build - Cloud-Based, No Local Setup Required)

### Option 1: Expo EAS Build (Recommended - Cloud-Based)

This requires an Expo account (free tier available).

```powershell
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account (creates account if you don't have one)
eas login

# Build APK for Android (cloud build)
eas build --platform android --output="./NM-Media.apk"

# Wait for build to complete, then download APK
```

The APK will be downloaded automatically and ready to install on Android devices.

---

## Option 2: Local Build (Requires Android Studio & SDK Setup)

If you want to build locally on your machine:

### Prerequisites:
1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java Development Kit (JDK)** - Latest LTS version
3. **Android SDK** - Installed via Android Stu distio
4. **ANDROID_SDK_ROOT** environment variable - Set to SDK location

### Build Steps:

```powershell
# Install Capacitor CLI and Android platform
npm install -g @capacitor/cli
npx cap add android

# Sync web build to Android project
npx cap sync android

# Open Android Studio project
npx cap open android
# Or manually open: android/ folder in Android Studio

# In Android Studio:
# 1. Wait for Gradle sync to complete
# 2. Click "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"
# 3. Wait for build to complete
# 4. APK will be in: android/app/release/app-release.apk
```

---

## Option 3: Using Gradle Directly (If Android SDK is Installed)

```powershell
# After `npx cap add android` and `npx cap sync android`
cd android
gradlew assembleRelease
# APK will be at: app/build/outputs/apk/release/app-release.apk
```

---

## Current Project Configuration

✅ **Already Configured For Android:**
- `app.json` - Includes Android package name and icon
- `capacitor.config.ts` - Capacitor configuration with web-dir pointing to dist/
- Web build - Already generated in `dist/` folder
- Package.json - All dependencies installed

---

## Testing on Android Device

Once you have the APK:

```powershell
# Install APK on connected Android device via ADB
adb install NM-Media.apk

# Or transfer APK to device and install manually
```

---

## Troubleshooting

**If EAS Build requires authentication:**
- Create free account at https://expo.dev
- Run: `eas login` and follow prompts
- Then retry: `eas build --platform android`

**If local build fails:**
- Ensure ANDROID_SDK_ROOT is set correctly
- Update Android Studio and SDKs to latest version
- Check Java version: `java -version` (should be 11+)

---

## File Distribution

The generated APK can be:
- Shared via email, cloud storage, or app distribution platforms
- Uploaded to Google Play Store
- Distributed via direct download link

Size: ~169 MB (typical for React web app wrapped as Android app)
