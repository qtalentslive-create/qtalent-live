# Quick Fix: Icons and Splash Screen for Capacitor

## ✅ What's Already Done

1. **HTML Configuration** - All favicon links are in `index.html`
2. **Manifest Files** - `manifest.json` and `site.webmanifest` are configured
3. **Capacitor Config** - Splash screen and icon settings are configured
4. **Web Icons** - All files exist in `public/` folder

## ❌ What Needs to Be Done

The icon files exist in `public/` but need to be:
1. **Copied to Android resources** for the app icon
2. **Generated in multiple sizes** for Android adaptive icons
3. **Created as notification icon** (white icon on transparent)

## 🚀 Quickest Solution

### Step 1: Generate Android Icons

**Option A: Use Online Tool (5 minutes)**
1. Go to: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload `public/android-chrome-512x512.png`
3. Configure:
   - Foreground: Your logo (transparent PNG)
   - Background: Color #9b87f5 or #0A0118
4. Download ZIP
5. Extract and copy all `mipmap-*/` folders to:
   ```
   qtalent-live/android/app/src/main/res/
   ```
   (Replace existing mipmap folders)

**Option B: Use Capacitor Assets (Automated)**
```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate --iconBackgroundColor '#9b87f5' --iconBackgroundColorDark '#0A0118'
```

### Step 2: Create Notification Icon

1. Create a simple white Qtalent logo (24x24 minimum)
2. Save as: `android/app/src/main/res/drawable/ic_stat_icon_config_sample.png`
3. Must be: White icon on transparent background

### Step 3: Update Splash Screen (Optional)

If you want a custom splash screen:
1. Create splash images with your logo centered
2. Replace files in `android/app/src/main/res/drawable*/splash.png`

### Step 4: Sync and Rebuild

```bash
npm run build
npx cap sync android
cd android
./gradlew clean
./gradlew assembleDebug
```

## 📋 File Locations

**Web Icons (Already exist):**
- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/apple-touch-icon.png`
- `public/android-chrome-192x192.png`
- `public/android-chrome-512x512.png`
- `public/shortcut-icon.png`

**Android App Icons (Need to be added):**
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)
- Plus `ic_launcher_round.png` and `ic_launcher_foreground.png` in each folder

**Notification Icon (Need to be created):**
- `android/app/src/main/res/drawable/ic_stat_icon_config_sample.png` (white icon, transparent bg)

## 🎯 Current Configuration

- **App Name**: Qtalent
- **Theme Color**: #9b87f5
- **Background Color**: #0A0118
- **Splash Duration**: 2000ms
- **Notification Icon Color**: #9b87f5

## ⚠️ Important Notes

1. **Icons must be PNG format** (not SVG for Android)
2. **Notification icon must be white** (Android colorizes it)
3. **All sizes must be exact** (Android is strict about dimensions)
4. **After adding icons, always run `npx cap sync android`**

## 🔍 Verification

After adding icons, verify:
- [ ] App icon appears on Android home screen
- [ ] Splash screen shows on app launch
- [ ] Notification icon appears in push notifications
- [ ] All icon sizes are correct

