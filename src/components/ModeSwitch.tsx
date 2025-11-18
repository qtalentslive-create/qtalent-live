import { Button } from "@/components/ui/button";
import { useUserMode } from "@/contexts/UserModeContext";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

interface ModeSwitchProps {
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function ModeSwitch({ className, size = "sm" }: ModeSwitchProps) {
  const { mode, setMode, canSwitchToArtist } = useUserMode();
  const navigate = useNavigate();
  const location = useLocation();

  if (!canSwitchToArtist) {
    return null;
  }

  // On talent dashboard, show "Switch to Booking"
  // In header (when talent is in booking mode), show "Switch to Artist Dashboard"
  const isOnTalentDashboard = location.pathname === "/talent-dashboard";

  // Only show the switch button if:
  // 1. User is on talent dashboard (show "Switch to Booking")
  // 2. User is a talent in booking mode and NOT on talent dashboard (show "Switch to Artist Dashboard")
  if (!isOnTalentDashboard && mode === "artist") {
    return null;
  }

  const handleSwitch = () => {
    if (mode === "booking") {
      setMode("artist");
      navigate("/talent-dashboard");
    } else {
      setMode("booking");
      navigate("/");
    }
  };

  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleSwitch}
      className={cn(
        "gap-2",
        isNativeApp && size === "sm" && "h-9 px-3 text-xs font-medium",
        className
      )}
    >
      <ArrowRightLeft
        className={cn("h-4 w-4", isNativeApp && size === "sm" && "h-3.5 w-3.5")}
      />
      <span className={isNativeApp && size === "sm" ? "hidden sm:inline" : ""}>
        {mode === "booking"
          ? "Switch to Artist Dashboard"
          : "Switch to Booking"}
      </span>
      {isNativeApp && size === "sm" && (
        <span className="sm:hidden">
          {mode === "booking" ? "Artist" : "Booking"}
        </span>
      )}
    </Button>
  );
}
