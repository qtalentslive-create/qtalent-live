# How to Sync Icons to Android Capacitor App

## Current Status

✅ **Web Icons**: All favicon files exist in `public/` folder:

- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png`
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`
- `shortcut-icon.png`

❌ **Android App Icons**: Need to be generated and placed in Android resources

## Quick Fix: Generate Android Icons from Existing Files

### Option 1: Use Android Asset Studio (Recommended)

1. Go to: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload your `android-chrome-512x512.png` or create a new icon
3. Configure:
   - **Foreground**: Your Qtalent logo (transparent background)
   - **Background**: Solid color (#9b87f5 or #0A0118)
   - **Shape**: Choose "Circle" or "Square"
4. Click "Download" → "Download ZIP"
5. Extract and copy files to:
   ```
   android/app/src/main/res/mipmap-*/
   ```
   - Copy `ic_launcher.png` to each `mipmap-*/` folder
   - Copy `ic_launcher_round.png` to each `mipmap-*/` folder
   - Copy `ic_launcher_foreground.png` to each `mipmap-*/` folder

### Option 2: Use Capacitor Assets Plugin

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate
```

This will automatically generate all required icon sizes from a source image.

### Option 3: Manual Resize (If you have image editing software)

1. Start with `android-chrome-512x512.png` (or create a 1024x1024 icon)
2. Resize to these sizes:
   - **mdpi**: 48x48
   - **hdpi**: 72x72
   - **xhdpi**: 96x96
   - **xxhdpi**: 144x144
   - **xxxhdpi**: 192x192
3. Save as:
   - `ic_launcher.png` (square)
   - `ic_launcher_round.png` (round)
   - `ic_launcher_foreground.png` (transparent background, for adaptive icon)

## Notification Icon

Create a **white icon on transparent background** (24x24dp minimum):

1. Create a simple white Qtalent logo/icon
2. Save as `ic_stat_icon_config_sample.png`
3. Place in: `android/app/src/main/res/drawable/`

**Important**: The notification icon must be:

- White icon only (Android will colorize it)
- Transparent background
- Simple design (details get lost at small sizes)

## Splash Screen

Splash screens already exist, but you can update them:

1. Create splash images with your logo centered
2. Recommended sizes:
   - **mdpi**: 320x470 (portrait), 470x320 (landscape)
   - **hdpi**: 480x640 (portrait), 640x480 (landscape)
   - **xhdpi**: 720x960 (portrait), 960x720 (landscape)
   - **xxhdpi**: 960x1280 (portrait), 1280x960 (landscape)
   - **xxxhdpi**: 1280x1920 (portrait), 1920x1280 (landscape)
3. Replace files in:
   - `android/app/src/main/res/drawable/splash.png`
   - `android/app/src/main/res/drawable-port-*/splash.png`
   - `android/app/src/main/res/drawable-land-*/splash.png`

## After Adding Icons

1. **Rebuild the app:**

   ```bash
   npm run build
   npx cap sync android
   ```

2. **Clean and rebuild Android project:**

   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   ```

3. **Test on device:**
   - Uninstall old app
   - Install new build
   - Check app icon on home screen
   - Check splash screen on launch
   - Test notifications (icon should appear)

## Verification Checklist

- [ ] App icon appears correctly on Android home screen
- [ ] Round icon appears correctly (if supported)
- [ ] Splash screen shows on app launch
- [ ] Notification icon appears in push notifications
- [ ] All icon sizes are properly generated
- [ ] Icons match your brand/logo

## Troubleshooting

**Icons not updating?**

- Clear app data and reinstall
- Run `npx cap sync android` again
- Check that files are in correct folders
- Verify file names match exactly

**Splash screen not showing?**

- Check `capacitor.config.ts` splash settings
- Verify splash.png files exist in drawable folders
- Rebuild the app completely

**Notification icon not showing?**

- Verify `ic_stat_icon_config_sample.png` exists in `drawable/`
- Check that icon is white on transparent background
- Ensure icon is simple enough for small sizes
