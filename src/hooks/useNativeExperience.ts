import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";

const MOBILE_QUERY = "(max-width: 768px)";
const MOBILE_CLASS = "mobile-unified";

const hasMobileUnifiedClass = () => {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains(MOBILE_CLASS) ||
    document.body.classList.contains(MOBILE_CLASS)
  );
};

export function useNativeExperience() {
  const isCapacitorNative = Capacitor.isNativePlatform();
  const [isUnifiedMobile, setIsUnifiedMobile] = useState(() =>
    hasMobileUnifiedClass()
  );

  useEffect(() => {
    if (isCapacitorNative) {
      setIsUnifiedMobile(true);
      return;
    }

    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const media = window.matchMedia ? window.matchMedia(MOBILE_QUERY) : null;

    const updateState = () => {
      const hasClass = hasMobileUnifiedClass();
      setIsUnifiedMobile(hasClass || (media?.matches ?? false));
    };

    updateState();

    if (media) {
      if (media.addEventListener) {
        media.addEventListener("change", updateState);
      } else if (media.addListener) {
        media.addListener(updateState);
      }
    }

    window.addEventListener("orientationchange", updateState);
    window.addEventListener("resize", updateState);

    const observer = new MutationObserver(updateState);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      if (media) {
        if (media.removeEventListener) {
          media.removeEventListener("change", updateState);
        } else if (media.removeListener) {
          media.removeListener(updateState);
        }
      }
      window.removeEventListener("orientationchange", updateState);
      window.removeEventListener("resize", updateState);
      observer.disconnect();
    };
  }, [isCapacitorNative]);

  return isCapacitorNative || isUnifiedMobile;
}
