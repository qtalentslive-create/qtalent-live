import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

const MOBILE_QUERY = "(max-width: 768px)";
const MOBILE_CLASS = "mobile-unified";

export function useNativeExperience() {
  const isCapacitorNative = Capacitor.isNativePlatform();
  const [isUnifiedMobile, setIsUnifiedMobile] = useState(() => {
    if (typeof document === "undefined") return false;
    const matchesQuery =
      typeof window !== "undefined" &&
      "matchMedia" in window &&
      window.matchMedia(MOBILE_QUERY).matches;
    return (
      document.documentElement.classList.contains(MOBILE_CLASS) && matchesQuery
    );
  });

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
      if (!media) {
        setIsUnifiedMobile(false);
        return;
      }
      const hasClass =
        document.documentElement.classList.contains(MOBILE_CLASS);
      setIsUnifiedMobile(hasClass && media.matches);
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
    };
  }, [isCapacitorNative]);

  return isCapacitorNative || isUnifiedMobile;
}
