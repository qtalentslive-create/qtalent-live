import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initChromeOptimizations } from "./utils/chromeOptimizer";
import { checkAndUpdateVersion } from "./utils/versionCheck";
import { initServiceWorker } from "./utils/serviceWorkerManager";
import { setupBackButtonHandler } from "./utils/backButtonHandler";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { setupIonicReact } from "@ionic/react";
import App from "./App.tsx";
import "./index.css";

const htmlElement = document.documentElement;
const bodyElement = document.body;
const MOBILE_UNIFIED_CLASS = "mobile-unified";

// Setup Ionic React for native look
setupIonicReact({
  mode: Capacitor.isNativePlatform()
    ? Capacitor.getPlatform() === "ios"
      ? "ios"
      : "md"
    : "md", // Material Design for web, iOS for iOS, MD for Android
});

const applyMobileUnifiedClassForWeb = () => {
  if (Capacitor.isNativePlatform()) {
    return;
  }

  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  htmlElement.classList.toggle(MOBILE_UNIFIED_CLASS, isMobileViewport);
  bodyElement.classList.toggle(MOBILE_UNIFIED_CLASS, isMobileViewport);
};

// Add platform-specific classes for Capacitor native apps
if (Capacitor.isNativePlatform()) {
  // Add generic native classes to match CSS expectations
  htmlElement.classList.add("capacitor-native", MOBILE_UNIFIED_CLASS);
  bodyElement.classList.add("capacitor-native", MOBILE_UNIFIED_CLASS);

  // Add platform-specific classes
  const platform = Capacitor.getPlatform();
  if (platform === "ios") {
    htmlElement.classList.add("plt-ios");
    bodyElement.classList.add("plt-ios");
  } else if (platform === "android") {
    htmlElement.classList.add("plt-android");
    bodyElement.classList.add("plt-android");
  }

} else {
  // Apply unified mobile class for responsive web experience
  applyMobileUnifiedClassForWeb();
  window.addEventListener("resize", applyMobileUnifiedClassForWeb);
  window.addEventListener("orientationchange", applyMobileUnifiedClassForWeb);
}

// Check version and clear caches if needed (MUST be first)
checkAndUpdateVersion();

// Initialize Chrome optimizations immediately
initChromeOptimizations();

// Initialize service worker for web only (not on native platforms)
if (!Capacitor.isNativePlatform()) {
  initServiceWorker();
}

// Setup Android back button handler for Capacitor
setupBackButtonHandler();

// Setup PayPal checkout handler for Capacitor - Opens in EXTERNAL browser
// Opens in Safari (iOS) or Chrome (Android) - full external browser, not in-app
if (Capacitor.isNativePlatform()) {
  // Intercept PayPal checkout URLs and open in external/system browser
  const originalOpen = window.open;
  interface WindowWithPayPalHandler extends Window {
    __paypalBrowserHandler?: boolean;
  }
  const win = window as WindowWithPayPalHandler;

  if (originalOpen && !win.__paypalBrowserHandler) {
    win.__paypalBrowserHandler = true;

    // Intercept window.open - PayPal SDK uses this to open checkout
    window.open = function (
      url?: string | URL,
      target?: string,
      features?: string
    ) {
      const urlString = url?.toString() || "";

      // Check for ANY PayPal domain URL - open in native in-app browser
      if (
        urlString.includes("paypal.com") ||
        urlString.includes("paypalobjects.com")
      ) {
        // Open PayPal checkout in EXTERNAL/system browser using Capacitor Browser
        // Browser.open uses SFSafariViewController (iOS) or Chrome Custom Tabs (Android)
        // These are full-screen, scrollable browsers that are much better than WebView
        // Use Browser.open - this opens in a native browser view (not WebView)
        // SFSafariViewController (iOS) and Chrome Custom Tabs (Android) are full-screen and scrollable
        // These provide a much better experience than WebView
        CapacitorApp.openUrl({ url: urlString })
          .catch((error) => {
            console.error("❌ App.openUrl failed, trying Browser plugin:", error);
            return Browser.open({
              url: urlString,
              toolbarColor: "#0A0118",
              presentationStyle: "fullscreen",
            });
          })
          .catch((error) => {
            console.error("❌ Browser.open failed, trying fallback:", error);
            window.location.href = urlString;
          });

        // Return a mock window object to satisfy PayPal SDK
        return {
          closed: false,
          close: () => {},
          focus: () => {},
          blur: () => {},
          location: { href: urlString },
          document: {},
        } as Window;
      }

      // For non-PayPal URLs, use original behavior
      return originalOpen.call(window, url, target, features);
    };
  }

  // Handle deep links when returning from PayPal browser
  CapacitorApp.addListener("appUrlOpen", (data) => {
    try {
      let url: URL;
      // Handle both full URLs and relative paths
      if (data.url.startsWith("http://") || data.url.startsWith("https://")) {
        url = new URL(data.url);
      } else {
        // If it's a relative path, construct full URL
        url = new URL(data.url, window.location.origin);
      }

      const path = url.pathname;
      const search = url.search;

      // Handle subscription success/cancelled returns
      if (
        path.includes("/subscription-success") ||
        path.includes("/subscription-cancelled")
      ) {
        // Navigate to the appropriate page with query params
        window.location.href = path + search;
      }
    } catch (error) {
      console.error("❌ Error handling app URL open:", error, data);
    }
  });
}

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
