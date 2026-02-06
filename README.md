<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1QyYT7rJfsHtRUNU9ANbfh6wpnP2IiEUh

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Build for Android

See [ANDROID_BUILD_GUIDE.md](ANDROID_BUILD_GUIDE.md) for complete Android APK build instructions.

**Quick Build (Cloud-based, no local setup required):**

```bash
npm install -g eas-cli
eas login
eas build --platform android --output="./NM-Media.apk"
```

**Local Build:**

```bash
npm run build
npm run android:build
# Then open the project in Android Studio to generate APK
```
