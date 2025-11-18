# Icon and Splash Screen Setup Guide for Capacitor

This guide explains how to properly set up icons and splash screens for the Qtalent Capacitor app.

## ✅ What's Already Configured

1. **HTML Meta Tags** - All favicon and icon links are properly set in `index.html`
2. **Manifest Files** - `manifest.json` and `site.webmanifest` are configured
3. **Capacitor Config** - Splash screen settings are configured
4. **Android Resources** - Icon resources are set up in Android project

## 📱 Required Icon Files

Make sure these files exist in the `public/` folder:

### Web Icons (for PWA and browser)
- ✅ `favicon.ico` - Main favicon (16x16, 32x32, 48x48)
- ✅ `favicon-16x16.png` - 16x16 PNG favicon
- ✅ `favicon-32x32.png` - 32x32 PNG favicon
- ✅ `apple-touch-icon.png` - 180x180 for iOS home screen
- ✅ `android-chrome-192x192.png` - 192x192 for Android
- ✅ `android-chrome-512x512.png` - 512x512 for Android
- ✅ `shortcut-icon.png` - 96x96 for shortcuts

### Android App Icons

The Android app uses adaptive icons. You need to update these files in:
`android/app/src/main/res/mipmap-*/`

**Required sizes:**
- `mipmap-mdpi/` - 48x48 (1x)
- `mipmap-hdpi/` - 72x72 (1.5x)
- `mipmap-xhdpi/` - 96x96 (2x)
- `mipmap-xxhdpi/` - 144x144 (3x)
- `mipmap-xxxhdpi/` - 192x192 (4x)

**Files needed in each folder:**
- `ic_launcher.png` - Square icon
- `ic_launcher_round.png` - Round icon
- `ic_launcher_foreground.png` - Foreground layer (transparent background)

### Android Notification Icon

For push notifications, you need a small icon in:
`android/app/src/main/res/drawable/`

**Required:**
- `ic_stat_icon_config_sample.png` - 24x24 white icon on transparent background

**Note:** The notification icon must be:
- White icon on transparent background
- Simple design (Android will colorize it)
- 24x24dp minimum

## 🎨 Splash Screen

Splash screens are already configured. Make sure you have splash images in:

**Android:**
- `android/app/src/main/res/drawable/splash.png` - Main splash
- `android/app/src/main/res/drawable-port-*/splash.png` - Portrait variants
- `android/app/src/main/res/drawable-land-*/splash.png` - Landscape variants

**Recommended sizes:**
- mdpi: 320x470 (portrait), 470x320 (landscape)
- hdpi: 480x640 (portrait), 640x480 (landscape)
- xhdpi: 720x960 (portrait), 960x720 (landscape)
- xxhdpi: 960x1280 (portrait), 1280x960 (landscape)
- xxxhdpi: 1280x1920 (portrait), 1920x1280 (landscape)

## 🛠️ How to Generate Icons

### Option 1: Online Tools
1. **Favicon Generator**: https://realfavicongenerator.net/
   - Upload your logo/icon
   - Generate all sizes automatically
   - Download and place in `public/` folder

2. **Android Asset Studio**: https://romannurik.github.io/AndroidAssetStudio/
   - Generate adaptive icons
   - Download and place in `android/app/src/main/res/mipmap-*/`

### Option 2: Manual Creation
1. Start with a high-resolution logo (1024x1024 minimum)
2. Use image editing software to create each size
3. For Android adaptive icons:
   - Foreground: Your logo on transparent background (1024x1024)
   - Background: Solid color or pattern (1024x1024)
   - Safe zone: Keep important content in center 66% (safe zone)

## 📋 Quick Checklist

- [ ] All web icons exist in `public/` folder
- [ ] Android adaptive icons exist in all `mipmap-*/` folders
- [ ] Notification icon exists in `drawable/` folder
- [ ] Splash screens exist for all densities
- [ ] Icons use the Qtalent brand colors (#9b87f5 theme color)
- [ ] Icons are properly formatted (PNG with transparency where needed)

## 🚀 After Adding Icons

1. **Rebuild the app:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Test on device:**
   - App icon should appear on home screen
   - Splash screen should show on launch
   - Notifications should show the icon

## 🎯 Current Configuration

- **App Name**: Qtalent
- **Theme Color**: #9b87f5 (purple)
- **Background Color**: #0A0118 (dark)
- **Splash Duration**: 2000ms
- **Notification Icon Color**: #9b87f5

## 📝 Notes

- Icons should be high-quality and recognizable at small sizes
- Use consistent branding across all icon sizes
- Test icons on actual devices to ensure they look good
- Android adaptive icons have a safe zone - keep important content centered

