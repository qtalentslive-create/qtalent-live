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

// Setup Ionic React for native look
setupIonicReact({
  mode: Capacitor.isNativePlatform()
    ? Capacitor.getPlatform() === "ios"
      ? "ios"
      : "md"
    : "md", // Material Design for web, iOS for iOS, MD for Android
});

// Add platform-specific classes for Capacitor native apps
if (Capacitor.isNativePlatform()) {
  const htmlElement = document.documentElement;
  const bodyElement = document.body;

  // Add generic native class
  htmlElement.classList.add("capacitor-native");
  bodyElement.classList.add("capacitor-native");

  // Add platform-specific classes
  const platform = Capacitor.getPlatform();
  if (platform === "ios") {
    htmlElement.classList.add("plt-ios");
    bodyElement.classList.add("plt-ios");
  } else if (platform === "android") {
    htmlElement.classList.add("plt-android");
    bodyElement.classList.add("plt-android");
  }

  console.log("✅ Capacitor native platform detected:", platform);
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
  console.log("🔧 Setting up PayPal external browser handler for Capacitor");

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
      console.log("🔍 window.open called with URL:", urlString);

      // Check for ANY PayPal domain URL - open in native in-app browser
      if (
        urlString.includes("paypal.com") ||
        urlString.includes("paypalobjects.com")
      ) {
        console.log(
          "✅ Intercepted PayPal URL, opening in EXTERNAL browser (Safari/Chrome):",
          urlString
        );

        // Open PayPal checkout in EXTERNAL/system browser using Capacitor Browser
        // Browser.open uses SFSafariViewController (iOS) or Chrome Custom Tabs (Android)
        // These are full-screen, scrollable browsers that are much better than WebView
        console.log("✅ Opening PayPal in Capacitor Browser:", urlString);

        // Use Browser.open - this opens in a native browser view (not WebView)
        // SFSafariViewController (iOS) and Chrome Custom Tabs (Android) are full-screen and scrollable
        // These provide a much better experience than WebView
        Browser.open({
          url: urlString,
          toolbarColor: "#0A0118",
        })
          .then(() => {
            console.log("✅ PayPal opened in native browser view successfully");
          })
          .catch((error) => {
            console.error("❌ Browser.open failed, trying fallback:", error);
            // Fallback: navigate to URL (will open in external browser)
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
      console.log("🔗 App URL opened:", data.url);
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
        console.log("✅ Navigating to subscription page:", path + search);
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
