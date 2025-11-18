import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "live.qtalent.app",
  appName: "qtalent",
  webDir: "dist",

  ios: {
    contentInset: "always", // Ensures content respects safe areas (notch/status bar)
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: "#0A0118",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0A0118",
      showSpinner: false,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#9b87f5",
    },
    Keyboard: {
      resize: "native",
      style: "dark",
      resizeOnFullScreen: true,
    },
    App: {
      launchUrl: "https://qtalent.live",
    },
  },
};

export default config;
