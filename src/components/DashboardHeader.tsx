import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Trash2 } from "lucide-react";
import { MobileMenu, useMobileMenu } from "@/components/ui/mobile-menu";
import { useAuth } from "@/hooks/useAuth";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ModeSwitch } from "@/components/ModeSwitch";
import { SubscriptionButton } from "@/components/SubscriptionButton";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import { useUserMode } from "@/contexts/UserModeContext";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DashboardHeaderProps {
  talentName?: string | null;
  isProTalent?: boolean;
  onSubscriptionChange?: () => void;
}

export function DashboardHeader({ 
  talentName, 
  isProTalent = false,
  onSubscriptionChange 
}: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { mode } = useUserMode();
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const isNativeApp = Capacitor.isNativePlatform();

  const handleAuthAction = async () => {
    await signOut();
    navigate("/");
  };

  // Helper component for navigation buttons that close the menu
  const MenuNavigationButton = ({
    onClick,
    children,
    className,
  }: {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
  }) => {
    const { closeMenu } = useMobileMenu();

    const handleClick = () => {
      closeMenu();
      setTimeout(() => {
        onClick();
      }, 100);
    };

    return (
      <Button
        variant="ghost"
        onClick={handleClick}
        className={className}
      >
        {children}
      </Button>
    );
  };

  if (!isNativeApp) {
    return null; // Only show in Capacitor native apps
  }

  return (
    <>
      <header className="dashboard-header fixed top-0 left-0 right-0 w-full z-[10000] glass-card border-b border-card-border bg-background/95 backdrop-blur-md safe-top">
        <div className="container mx-auto px-4 h-14">
          <nav className="flex items-center justify-between h-full">
            {/* Logo/Title */}
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                {talentName ? "Talent Dashboard" : "Booker Dashboard"}
              </h2>
            </div>

            {/* Hamburger Menu */}
            <div className="md:hidden">
              <MobileMenu>
                {user && (
                  <>
                    {/* User Section */}
                    <div className={cn(
                      "border-b border-border/50",
                      isNativeApp ? "pb-5 mb-5" : "pb-4 mb-4"
                    )}>
                      <div
                        className={cn(
                          "rounded-2xl p-4 shadow-sm border border-border/30",
                          isNativeApp
                            ? "bg-gradient-to-br from-muted/40 to-muted/20"
                            : "bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "flex items-center mb-4",
                          talentName ? "justify-between gap-3" : "justify-start"
                        )}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isNativeApp && (
                              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 border-2 border-primary/20">
                                <span className="text-primary font-bold text-lg">
                                  {(talentName ||
                                    user.user_metadata?.name ||
                                    user.email?.split("@")[0] ||
                                    "U")[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-muted-foreground",
                                isNativeApp
                                  ? "text-xs font-medium mb-0.5"
                                  : "text-xs mb-1"
                              )}>
                                {isNativeApp ? "Welcome back" : "Welcome"}
                              </p>
                              <p className={cn(
                                "font-bold truncate text-foreground",
                                isNativeApp ? "text-base" : "text-sm"
                              )}>
                                {talentName ||
                                  user.user_metadata?.name ||
                                  user.email?.split("@")[0] ||
                                  "User"}
                              </p>
                            </div>
                          </div>
                          {talentName && (
                            <div className="flex-shrink-0 ml-2">
                              <ModeSwitch size="sm" />
                            </div>
                          )}
                        </div>

                        {/* Notifications */}
                        <div className={cn(isNativeApp ? "mt-6" : "mt-4")}>
                          <NotificationCenter />
                        </div>
                      </div>

                      {/* Subscription Button - Only show if talent */}
                      {talentName && mode === "artist" && (
                        <div className={cn("mt-3", isNativeApp ? "mt-4" : "mt-3")}>
                          <SubscriptionButton
                            isProSubscriber={isProTalent}
                            onSubscriptionChange={onSubscriptionChange}
                            variant="outline"
                            size="sm"
                            className={cn("w-full", isNativeApp ? "h-11 font-semibold" : "")}
                          />
                        </div>
                      )}
                    </div>

                    {/* Navigation Items */}
                    <div className={cn("space-y-2", isNativeApp ? "mt-2" : "")}>
                      <MenuNavigationButton
                        onClick={() => {
                          if (talentName) {
                            navigate("/talent-dashboard");
                          } else {
                            navigate("/booker-dashboard");
                          }
                        }}
                        className={cn(
                          "w-full text-left transition-all font-medium",
                          isNativeApp
                            ? "py-3.5 px-4 rounded-xl hover:bg-muted/60 active:bg-muted text-foreground text-base"
                            : "py-2 text-foreground hover:text-accent"
                        )}
                      >
                        Dashboard Home
                      </MenuNavigationButton>

                      <MenuNavigationButton
                        onClick={() => navigate("/")}
                        className={cn(
                          "w-full text-left transition-all font-medium",
                          isNativeApp
                            ? "py-3.5 px-4 rounded-xl hover:bg-muted/60 active:bg-muted text-foreground text-base"
                            : "py-2 text-foreground hover:text-accent"
                        )}
                      >
                        Browse Talents
                      </MenuNavigationButton>

                      {talentName && (
                        <MenuNavigationButton
                          onClick={() => navigate("/talent-profile-edit")}
                          className={cn(
                            "w-full text-left transition-all font-medium",
                            isNativeApp
                              ? "py-3.5 px-4 rounded-xl hover:bg-muted/60 active:bg-muted text-foreground text-base"
                              : "py-2 text-foreground hover:text-accent"
                          )}
                        >
                          Edit Profile
                        </MenuNavigationButton>
                      )}
                    </div>

                    {/* Delete Account and Logout */}
                    <div className={cn(
                      "border-t border-border/50",
                      isNativeApp ? "pt-5 mt-5 space-y-3" : "pt-4 mt-4 space-y-2"
                    )}>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50",
                          isNativeApp ? "h-11 font-semibold" : ""
                        )}
                        onClick={() => setShowDeleteAccountModal(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full",
                          isNativeApp ? "h-11 font-semibold border-border/50" : ""
                        )}
                        onClick={handleAuthAction}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </>
                )}
              </MobileMenu>
            </div>
          </nav>
        </div>
      </header>

      <DeleteAccountModal
        open={showDeleteAccountModal}
        onOpenChange={setShowDeleteAccountModal}
      />
    </>
  );
}
