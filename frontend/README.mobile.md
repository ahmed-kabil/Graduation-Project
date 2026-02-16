# Al Zohor Hospital - Mobile App (Android APK)

This guide explains how to build and run the Al Zohor Hospital app as an Android APK using **Capacitor**.

---

## Prerequisites

1. **Node.js** (v18+) — already installed if you're running the frontend
2. **Android Studio** — [Download here](https://developer.android.com/studio)
   - During install, make sure to include:
     - Android SDK (API 34+)
     - Android SDK Build-Tools
     - Android Emulator (optional, for testing without a physical device)
3. **Java JDK 17+** — Android Studio typically bundles this

### Environment Variables (Windows)
Add these to your system PATH:
```
ANDROID_HOME = C:\Users\<YourUser>\AppData\Local\Android\Sdk
PATH += %ANDROID_HOME%\platform-tools
PATH += %ANDROID_HOME%\tools
```

---

## Quick Start

### 1. Configure Backend URL

Edit `frontend/.env.mobile` and set your backend server URL:

```env
# Use your machine's local IP (NOT localhost — the phone can't reach localhost)
VITE_BACKEND_URL=http://192.168.1.100:8080
VITE_SOCKET_URL=http://192.168.1.100:8080
```

> **Finding your IP:** Run `ipconfig` on Windows or `ifconfig` on Mac/Linux and look for your WiFi adapter's IPv4 address.

### 2. Build & Open in Android Studio

```bash
cd frontend

# Build the web app and sync to Android
npm run mobile:build

# Open the Android project in Android Studio
npm run mobile:open
```

### 3. Build APK from Android Studio

1. In Android Studio, wait for Gradle sync to complete
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. The APK will be generated at:
   ```
   frontend/android/app/build/outputs/apk/debug/app-debug.apk
   ```
4. Transfer this APK to your Android phone and install it

### 4. Build Signed Release APK

For a production-ready APK:

1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Choose **APK**
3. Create or select a keystore file
4. Choose **release** build type
5. The signed APK will be at:
   ```
   frontend/android/app/build/outputs/apk/release/app-release.apk
   ```

---

## Available NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run mobile:build` | Build web app + sync to Android project |
| `npm run mobile:open` | Open Android project in Android Studio |
| `npm run mobile:sync` | Sync web assets to Android (without rebuild) |
| `npm run mobile:run` | Build & run directly on a connected device/emulator |
| `npm run mobile:live` | Full pipeline: build + sync + run on device |

---

## Running on a Physical Device

1. Enable **Developer Options** on your Android phone:
   - Go to Settings → About Phone → tap "Build Number" 7 times
2. Enable **USB Debugging** in Developer Options
3. Connect your phone via USB
4. Run:
   ```bash
   npm run mobile:run
   ```

---

## Running on an Emulator

1. Open Android Studio
2. Go to **Tools → Device Manager**
3. Create a virtual device (e.g., Pixel 6, API 34)
4. Start the emulator
5. Run:
   ```bash
   npm run mobile:run
   ```

---

## Project Structure (Mobile)

```
frontend/
├── capacitor.config.ts          # Capacitor configuration
├── .env.mobile                  # Mobile-specific environment variables
├── android/                     # Native Android project (auto-generated)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── assets/public/   # Built web app (synced from dist/)
│   │   │   └── res/             # Android resources (icons, splash, etc.)
│   │   └── build.gradle
│   └── build.gradle
├── services/
│   └── mobileInit.ts            # Mobile platform initialization
└── dist/                        # Built web app output
```

---

## Customizing the App

### App Icon
Replace the icon files in:
```
frontend/android/app/src/main/res/mipmap-*/ic_launcher.png
```
Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) to generate all required sizes.

### Splash Screen
Configure in `capacitor.config.ts` under `plugins.SplashScreen`.

### App Name
Edit `frontend/android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Al Zohor Hospital</string>
```

---

## Troubleshooting

### "net::ERR_CLEARTEXT_NOT_PERMITTED"
The app is trying to connect via HTTP but Android blocks it. Make sure:
- `android:usesCleartextTraffic="true"` is in AndroidManifest.xml (already configured)
- The `network_security_config.xml` allows cleartext traffic

### App can't connect to backend
- Make sure your phone and backend server are on the **same WiFi network**
- Use your machine's **local IP** (not `localhost` or `127.0.0.1`)
- Check that the backend server is running and accessible

### White screen on launch
- Run `npm run mobile:build` to rebuild and sync
- Check the Android Studio Logcat for JavaScript errors

### Gradle sync fails
- Make sure Android Studio has downloaded the required SDK version
- Try **File → Invalidate Caches / Restart** in Android Studio

---

## Production Deployment

For the production APK:

1. Update `.env.mobile` with your production backend URL:
   ```env
   VITE_BACKEND_URL=https://alzohor-hospital.nabawi.me
   VITE_SOCKET_URL=https://alzohor-hospital.nabawi.me
   ```

2. Update `capacitor.config.ts`:
   - Set `server.cleartext` to `false`
   - Set `server.androidScheme` to `'https'`

3. Update `network_security_config.xml` to restrict domains

4. Build a signed release APK from Android Studio
