import { Capacitor } from "@capacitor/core";

export const NativeSafeFooter = () => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  return <div className="native-footer-bar" />;
};
