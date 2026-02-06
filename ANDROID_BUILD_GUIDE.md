# Android APK Build Guide for NewMarx Media

## Fixed Configuration

✅ **app.json** - Cleaned up, removed problematic plugins
✅ **eas.json** - Fixed APK build configuration  
✅ **capacitor.config.ts** - Proper web-dir configuration
✅ **Android Project** - Generated via Capacitor

---

## Option 1: Using Android Studio (Recommended - GUI, Most Reliable)

### Prerequisites:
1. Download **Android Studio** from https://developer.android.com/studio
2. During installation, select "Android SDK", "Android SDK Platform", and "Android Virtual Device"
3. Install latest Android SDK (API 34 recommended)

### Build Steps:

```powershell
# 1. Build the web app
npm run build

# 2. Sync to Android project
npm run cap:sync

# 3. Open in Android Studio
npm run cap:open
# (Or manually open the 'android' folder)
```

**In Android Studio:**
1. Wait for Gradle sync to complete (bottom right indicator shows "Sync successful")
2. Click menu: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Wait for build to complete (watch the build console at bottom)
4. Click "Locate" in the success notification
5. APK file will be in: `android/app/release/app-release.apk`

✅ **Result:** Ready-to-install APK file

---

## Option 2: Command Line with Android SDK (If Already Installed)

```powershell
# Ensure ANDROID_SDK_ROOT environment variable is set
$env:ANDROID_SDK_ROOT = "PATH_TO_YOUR_SDK"  # e.g., "C:\Users\YourName\AppData\Local\Android\Sdk"

# Build
cd android
.\gradlew assembleRelease

# APK output: app/build/outputs/apk/release/app-release.apk
```

---

## Option 3: Docker Build (No Local Android Setup Needed)

If you have Docker installed:

```bash
docker run --rm -v <project_path>:/app -w /app node:18
npm install
npm run build
docker run --rm -v <project_path>:/app -w /app/android gradle:8.0
./gradlew assembleRelease
```

---

## Option 4: Cloud Build (Requires EAS Account)

```powershell
# 1. Create free account at https://expo.dev
# 2. Login locally
npm install -g eas-cli
eas login

# 3. Build (cloud-based, no local Android SDK needed)
eas build --platform android --preview
```

⏱️ Takes 15-30 minutes but requires no local setup.

---

## Testing the APK

```powershell
# Connect Android device via USB with Developer Mode enabled
adb install app-release.apk

# Or transfer APK file to device and tap to install
```

---

## Troubleshooting

**Option 1 (Android Studio) Issues:**
- Ensure Android SDK Platform is installed (Settings → System Settings → Android SDK)
- Check Java version: `java -version` (should show 11 or higher)
- Try invalidating cache: File → Invalidate Caches

**Option 2 (Gradle CLI) Issues:**
- Verify `ANDROID_SDK_ROOT` environment variable is set: `echo $env:ANDROID_SDK_ROOT`
- Update SDK platforms: `sdkmanager "platforms;android-34"`
- Check Java: `java -version`

**Option 4 (EAS) Issues:**
- Sign up at https://expo.dev
- Authenticate: `eas login`
- Check credentials: `eas whoami`

---

## Next Steps

1. **Choose your build method** from the options above
2. **Follow the steps** for that method
3. **Get your APK** file
4. **Test on device** or install via Google Play Store

**File Size:** ~150-170 MB (typical for React web app wrapped as native Android)
**Min Android Version:** Android 6.0 (API 23)

