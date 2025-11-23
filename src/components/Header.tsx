import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, LogOut, Crown, Edit3, Eye, ArrowRightLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type MouseEvent,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationCenter } from "@/components/NotificationCenter";
import { UniversalChat } from "@/components/UniversalChat";
import { QtalentLogo } from "@/components/QtalentLogo";
import { MobileMenu, useMobileMenu, useMobileMenuControl, MobileMenuProvider } from "@/components/ui/mobile-menu";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { HowItWorksModal } from "@/components/HowItWorksModal";
import { LocationSelector } from "@/components/LocationSelector";

import { ProfileMenu } from "@/components/ProfileMenu";
import { SubscriptionButton } from "@/components/SubscriptionButton";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { ModeSwitch } from "@/components/ModeSwitch";
import { useUserMode } from "@/contexts/UserModeContext";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import { Trash2 } from "lucide-react";
import { SheetClose } from "@/components/ui/sheet";
import { useNativeExperience } from "@/hooks/useNativeExperience";

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { mode, setMode, canSwitchToArtist } = useUserMode();
  const [talentName, setTalentName] = useState<string | null>(null);
  const [talentId, setTalentId] = useState<string | null>(null);
  const [isProTalent, setIsProTalent] = useState<boolean>(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const isMobile = useIsMobile();
  const location = useLocation();
  const isCapacitorNative = Capacitor.isNativePlatform();
  const isNativeExperience = useNativeExperience();
  const { unreadCount } = useUnreadNotifications();

  // Mobile menu button component (only for native apps - rendered outside Sheet)
  const MobileMenuButton = () => {
    const { toggleMenu, open } = useMobileMenuControl();
    return (
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden relative hover:bg-transparent active:bg-transparent focus:bg-transparent"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleMenu();
        }}
        style={{
          position: 'relative', // Keep relative to maintain design
          zIndex: 999999, // EXTREMELY HIGH - above SheetContent (10001)
          isolation: 'isolate',
          transform: 'translateZ(0)', // Force hardware acceleration
          willChange: 'transform',
          pointerEvents: 'auto',
          backgroundColor: 'transparent', // Force transparent background
          background: 'transparent', // Force transparent background
          opacity: 1, // CRITICAL: Force opacity to always be 1
          visibility: 'visible', // CRITICAL: Force visibility to always be visible
          display: 'flex', // CRITICAL: Force display to always be flex
        }}
        data-hamburger-button
        data-menu-open={open ? 'true' : 'false'} // Track menu state for CSS targeting
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseEnter={(e) => {
          // Prevent hover background
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.visibility = 'visible';
        }}
        onMouseLeave={(e) => {
          // Keep transparent
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.visibility = 'visible';
        }}
      >
        <Menu 
          className="h-4 w-4" 
          style={{ 
            pointerEvents: 'none',
            position: 'relative',
            zIndex: 1000000, // Even higher
            color: 'hsl(var(--foreground))', // CRITICAL: Use explicit color instead of inherit
            opacity: 1, // CRITICAL: Force opacity to always be 1
            visibility: 'visible', // CRITICAL: Force visibility to always be visible
            display: 'flex', // CRITICAL: Force display to always be flex
          }} 
        />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" style={{ zIndex: 1000001 }}></div>
        )}
        <span className="sr-only">Open menu</span>
      </Button>
    );
  };
  
  // Remove or comment out these lines since DashboardHeader was removed:
  // Hide hamburger menu in main header when on dashboard pages in Capacitor
  // (DashboardHeader will show its own hamburger menu instead)
  // const isOnDashboardPage = isNativeExperience && (
  //   location.pathname === "/booker-dashboard" || 
  //   location.pathname === "/talent-dashboard"
  // );

  // Check if we should show artist dashboard navigation
  const showArtistDashboardNav = talentName && mode === "artist";

  const fetchTalentProfile = useCallback(async () => {
    if (!user) return;

    try {
      // Use the secure function to get talent profile data
      const { data: profileData, error } = await supabase.rpc(
        "get_user_talent_profile"
      );

      if (error) {
        console.error("Error fetching talent profile:", error);
        return;
      }

      if (profileData && profileData.length > 0) {
        const profile = profileData[0];
        setTalentName(profile.artist_name || null);
        setTalentId(profile.id || null);
        setIsProTalent(profile.is_pro_subscriber || false);

        // Get picture URL separately since it's not in the secure function
        const { data: pictureData } = await supabase
          .from("talent_profiles")
          .select("picture_url")
          .eq("user_id", user.id)
          .maybeSingle();

        setProfilePictureUrl(pictureData?.picture_url || null);
      } else {
        // Reset all states if no profile found
        setTalentName(null);
        setTalentId(null);
        setIsProTalent(false);
        setProfilePictureUrl(null);
      }
    } catch (error) {
      console.error("Error fetching talent profile:", error);
      // Reset states on error to avoid showing incomplete data
      setTalentName(null);
      setTalentId(null);
      setIsProTalent(false);
      setProfilePictureUrl(null);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTalentProfile();
    } else {
      setTalentName(null);
      setTalentId(null);
    }
  }, [user, fetchTalentProfile]);

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate("/auth", { state: { mode: "booker" } });
    }
  };

  const handleWelcomeClick = () => {
    if (talentName) {
      navigate("/talent-dashboard");
    } else if (user) {
      navigate("/booker-dashboard");
    }
  };

  const handleTalentSignup = () => {
    if (user && !talentName) {
      // User is logged in but doesn't have a talent profile
      navigate("/talent-onboarding");
    } else {
      // User is not logged in, go to auth
      navigate("/auth");
    }
  };

  const handleProButtonClick = () => {
    navigate("/");
  };

  const handleManageSubscription = () => {
    setShowSubscriptionModal(true);
  };

  // Helper component for navigation buttons that close the menu
  // This component must only be used inside MobileMenu children
  const MenuNavigationButton = ({
    onClick,
    children,
    className,
  }: {
    onClick: () => void;
    children: ReactNode;
    className?: string;
  }) => {
    const { closeMenu } = useMobileMenu();

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Close the menu first
      closeMenu();

      // Small delay to allow sheet close animation before action
      setTimeout(() => {
        onClick();
      }, 150);
    };

    return (
      <button onClick={handleClick} className={className} type="button">
        {children}
      </button>
    );
  };

  // Create a wrapper component for Upgrade to Pro button in mobile menu
  const UpgradeToProButton = () => {
    const navigate = useNavigate();
    const handleNavigate = () => {
      // Use window.location for more reliable navigation in Capacitor
      if (isCapacitorNative) {
        window.location.href = "/pricing";
      } else {
        navigate("/pricing");
      }
    };

    return (
      <MenuNavigationButton
        onClick={handleNavigate}
        className={cn(
          "w-full text-left transition-all font-medium flex items-center gap-2",
          isNativeExperience
            ? "py-3.5 px-4 rounded-xl hover:bg-muted/60 active:bg-muted text-foreground text-base"
            : "py-2 text-foreground hover:text-accent"
        )}
      >
        <Crown className={cn("h-4 w-4", isNativeExperience && "h-5 w-5")} />
        Upgrade to Pro
      </MenuNavigationButton>
    );
  };

  // Helper component for Delete Account button that closes the menu
  const DeleteAccountButton = () => {
    const { closeMenu } = useMobileMenu();

    const handleClick = () => {
      // Close the menu first
      closeMenu();
      
      // Small delay to ensure menu closes before modal opens
      setTimeout(() => {
        setShowDeleteAccountModal(true);
      }, 150);
    };

    return (
      <Button
        variant="outline"
        className={cn(
          "w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50",
          isNativeExperience
            ? "h-11 font-semibold"
            : ""
        )}
        onClick={handleClick}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Account
      </Button>
    );
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 w-full z-[100003] bg-background/95 backdrop-blur-md safe-top border-none" style={{ willChange: 'transform' }}>
        <div className="container mx-auto px-4 h-full">
          <nav className="flex items-center justify-between h-full">
            {/* Logo */}
            <QtalentLogo onClick={() => navigate("/")} />

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {showArtistDashboardNav ? (
                // Artist Dashboard Navigation
                <>
                  <button
                    onClick={() => navigate("/talent-dashboard")}
                    data-nav-button="dashboard"
                    className="text-foreground hover:text-foreground/80 transition-colors font-medium"
                    style={{
                      color: 'hsl(var(--foreground))',
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'hsl(var(--foreground) / 0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'hsl(var(--foreground))';
                    }}
                  >
                    Dashboard
                  </button>
                  <SubscriptionButton
                    isProSubscriber={isProTalent}
                    onSubscriptionChange={fetchTalentProfile}
                    variant="ghost"
                    size="sm"
                  />
                </>
              ) : (
                // Public Navigation
                <>
                  <button
                    onClick={() => {
                      const talentsSection = document.getElementById("talents");
                      if (talentsSection) {
                        talentsSection.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      } else {
                        navigate("/#talents");
                      }
                    }}
                    className="desktop-nav-link text-foreground hover:text-accent transition-colors font-medium"
                  >
                    Find Talents
                  </button>
                  {user && isProTalent && mode === "artist" && (
                    <button
                      onClick={() => navigate("/gigs")}
                      className="text-foreground hover:text-accent transition-colors font-medium"
                    >
                      Gigs
                    </button>
                  )}
                  <button
                    onClick={() => setShowHowItWorksModal(true)}
                    className="desktop-nav-link text-foreground hover:text-accent transition-colors font-medium"
                  >
                    How it works
                  </button>
                  {user && talentName && mode === "artist" && (
                    <button
                      onClick={() => navigate("/pricing")}
                      className="text-foreground hover:text-accent transition-colors font-medium flex items-center gap-2"
                    >
                      <Crown className="h-4 w-4" />
                      Upgrade to Pro
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Desktop Right Side Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  {/* Location selector and mode switch and notifications */}
                  <LocationSelector />
                  {talentName && <ModeSwitch />}
                  <NotificationCenter />
                  {/* No complete profile button needed - profiles are completed during signup */}

                  {/* Only show subscription button in artist dashboard mode if not already shown in nav */}
                  {talentName &&
                    !showArtistDashboardNav &&
                    mode === "artist" && (
                      <SubscriptionButton
                        isProSubscriber={isProTalent}
                        onSubscriptionChange={fetchTalentProfile}
                        variant="outline"
                        size="sm"
                      />
                    )}

                  <ProfileMenu
                    talentName={talentName || undefined}
                    isProSubscriber={isProTalent}
                    profilePictureUrl={profilePictureUrl || undefined}
                    onManageSubscription={handleManageSubscription}
                    isTalent={!!talentName}
                  />
                </div>
              ) : (
                <>
                  <LocationSelector />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAuthAction}
                    className="font-medium"
                  >
                    Sign In
                  </Button>

                  <Button
                    className="hero-button font-medium"
                    onClick={() => navigate("/talent-onboarding")}
                  >
                    Join as a Talent
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu - Always show (DashboardHeader was removed) */}
            <div className="md:hidden">
              <MobileMenuProvider>
                {isNativeExperience ? (
                  <>
                    {/* Separate hamburger button - OUTSIDE Sheet component tree - NEVER covered */}
                    <MobileMenuButton />
                    {/* Sheet component - controlled by shared state */}
                    <MobileMenu>
                {user && (
                  <div className="flex flex-col gap-4 flex-1 w-full">
                    {/* User Section - Consistent styling for all users */}
                    <div className={cn(
                      "border-b border-border/50",
                      isNativeExperience ? "pb-5 mb-5" : "pb-4 mb-4"
                    )}>
                      {/* User Welcome Card - Consistent styling */}
                      <div
                        className={cn(
                          "rounded-2xl p-4 shadow-sm border border-border/30",
                          isNativeExperience
                            ? "bg-gradient-to-br from-muted/40 to-muted/20"
                            : "bg-muted/30"
                        )}
                      >
                        {/* User Info Row - Always shown */}
                        <div className={cn(
                          "flex items-center mb-4",
                          talentName ? "justify-between gap-3" : "justify-start"
                        )}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isNativeExperience && (
                              <Avatar className="w-12 h-12 flex-shrink-0 border-2 border-primary/20">
                                <AvatarImage 
                                  src={profilePictureUrl || undefined} 
                                  alt={talentName || user.user_metadata?.name || "User"}
                                />
                                <AvatarFallback className="bg-primary/15 text-primary font-bold text-lg">
                                  {(talentName ||
                                    user.user_metadata?.name ||
                                    user.email?.split("@")[0] ||
                                    "U")[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-muted-foreground",
                                  isNativeExperience
                                    ? "text-xs font-medium mb-0.5"
                                    : "text-xs mb-1"
                                )}
                              >
                                {isNativeExperience ? "Welcome back" : "Welcome"}
                              </p>
                              <p
                                className={cn(
                                  "font-bold truncate text-foreground",
                                  isNativeExperience ? "text-base" : "text-sm"
                                )}
                              >
                                {talentName ||
                                  user.user_metadata?.name ||
                                  user.email?.split("@")[0] ||
                                  "User"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* View Bookings & Messages Button - Only show in artist mode */}
                        {talentName && mode === "artist" && (
                          <MenuNavigationButton
                            onClick={() => {
                              navigate("/talent-dashboard");
                            }}
                            className={cn(
                              "w-full rounded-xl shadow-md transition-all flex items-center justify-center gap-3 font-bold relative",
                              isNativeExperience
                                ? "bg-primary text-white hover:bg-primary/90 active:scale-95 py-4 px-5 text-base"
                                : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 py-2.5 px-3 text-sm"
                            )}
                          >
                            <span className="whitespace-nowrap">
                              View bookings & messages
                            </span>
                            {isNativeExperience && (
                              <svg
                                className="w-5 h-5 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            )}
                            {/* Notification Badge */}
                            {unreadCount > 0 && (
                              <span className={cn(
                                "absolute flex items-center justify-center rounded-full bg-red-500 text-white font-bold",
                                isNativeExperience
                                  ? "-top-2 -right-2 min-w-[20px] h-5 px-1.5 text-xs"
                                  : "-top-1 -right-1 min-w-[18px] h-4.5 px-1 text-[10px]"
                              )}>
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </span>
                            )}
                          </MenuNavigationButton>
                        )}
                      </div>

                      {/* Subscription Button - Only show if talent, consistent styling */}
                      {talentName && mode === "artist" && (
                        <div className={cn(
                          "mt-3",
                          isNativeExperience ? "mt-4" : "mt-3"
                        )}>
                          <SubscriptionButton
                            isProSubscriber={isProTalent}
                            onSubscriptionChange={fetchTalentProfile}
                            variant={
                              showArtistDashboardNav ? "outline" : "default"
                            }
                            size="sm"
                            className={cn(
                              "w-full",
                              isNativeExperience ? "h-11 font-semibold" : ""
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Navigation Items - Consistent spacing and styling */}
                    <div className={cn(
                      "space-y-2",
                      isNativeExperience ? "mt-2" : ""
                    )}>
                      {/* Add Edit Profile for talent users in Capacitor */}
                      {isNativeExperience && talentName && mode === "artist" && (
                        <MenuNavigationButton
                          onClick={() => navigate("/talent-profile-edit")}
                          className={cn(
                            "w-full text-left transition-all font-medium",
                            isNativeExperience
                              ? "py-3.5 px-4 rounded-xl hover:bg-muted/60 active:bg-muted text-foreground text-base"
                              : "py-2 text-foreground hover:text-accent"
                          )}
                        >
                          <Edit3 className="h-4 w-4 mr-2 inline" />
                          Edit Profile
                        </MenuNavigationButton>
                      )}

                      {/* Mode Switch - Always show for talents in mobile menu */}
                      {talentName && canSwitchToArtist && (
                        <MenuNavigationButton
                          onClick={() => {
                            if (mode === "booking") {
                              setMode("artist");
                              navigate("/talent-dashboard");
                            } else {
                              setMode("booking");
                              navigate("/");
                            }
                          }}
                          className={cn(
                            "w-full text-left transition-all font-medium",
                            isNativeExperience
                              ? "py-3.5 px-4 rounded-xl hover:bg-muted/60 active:bg-muted text-foreground text-base"
                              : "py-2 text-foreground hover:text-accent"
                          )}
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-2 inline" />
                          {mode === "booking"
                            ? "Switch to Artist Dashboard"
                            : "Switch to Booking"}
                        </MenuNavigationButton>
                      )}

                      {!showArtistDashboardNav && (
                        <>
                          <MenuNavigationButton
                            onClick={() => {
                              const talentsSection =
                                document.getElementById("talents");
                              if (talentsSection) {
                                talentsSection.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                              } else {
                                navigate("/#talents");
                              }
                            }}
                            className={cn(
                              "w-full text-left transition-all font-medium",
                              isNativeExperience
                                ? "py-3.5 px-4 rounded-xl hover:bg-muted/60 active:bg-muted text-foreground text-base"
                                : "py-2 text-foreground hover:text-accent"
                            )}
                          >
                            Find Talents
                          </MenuNavigationButton>

                          {user && isProTalent && mode === "artist" && (
                            <MenuNavigationButton
                              onClick={() => navigate("/gigs")}
                              className={cn(
                                "w-full text-left transition-all font-medium",
                                isNativeExperience
                                  ? "py-3.5 px-4 rounded-xl hover:bg-muted/60 active:bg-muted text-foreground text-base"
                                  : "py-2 text-foreground hover:text-accent"
                              )}
                            >
                              Gigs
                            </MenuNavigationButton>
                          )}

                          {/* Hide "How it works" when in booking mode */}
                          {mode === "artist" && (
                            <MenuNavigationButton
                              onClick={() => setShowHowItWorksModal(true)}
                              className={cn(
                                "w-full text-left transition-all font-medium",
                                isNativeExperience
                                  ? "py-3.5 px-4 rounded-xl hover:bg-muted/60 active:bg-muted text-foreground text-base"
                                  : "py-2 text-foreground hover:text-accent"
                              )}
                            >
                              How it works
                            </MenuNavigationButton>
                          )}

                          {user && talentName && mode === "artist" && (
                            <UpgradeToProButton />
                          )}
                        </>
                      )}
                    </div>

                    {/* Delete Account and Logout Buttons - Consistent styling */}
                    <div
                      className={cn(
                        "border-t border-border/50",
                        isNativeExperience ? "pt-5 mt-5 space-y-3" : "pt-4 mt-4 space-y-2",
                        "mt-auto"
                      )}
                    >
                      <DeleteAccountButton />
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full",
                          isNativeExperience
                            ? "h-11 font-semibold border-border/50"
                            : ""
                        )}
                        onClick={handleAuthAction}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </div>
                )}

                {!user && (
                  <div
                    className={cn(
                      "space-y-2 mt-auto",
                      isNativeExperience && "space-y-3 -mx-2"
                    )}
                  >
                    <Button
                      variant="outline"
                      className={cn(
                        isNativeExperience ? "" : "w-full",
                        isNativeExperience
                          ? "h-14 text-base font-semibold border-2 shadow-sm px-8 w-[calc(100%+1rem)]"
                          : ""
                      )}
                      onClick={() => navigate("/login")}
                    >
                      Login
                    </Button>

                    <Button
                      className={cn(
                        isNativeExperience ? "" : "w-full hero-button",
                        isNativeExperience
                          ? "h-14 text-base font-semibold shadow-md px-8 w-[calc(100%+1rem)] hero-button"
                          : ""
                      )}
                      onClick={() => navigate("/talent-onboarding")}
                    >
                      Join as a Talent
                    </Button>
                  </div>
                )}
                    </MobileMenu>
                  </>
                ) : (
                  <MobileMenu>
                    {user && (
                      <>
                        {/* User Section - Consistent styling for all users */}
                        <div className={cn(
                          "border-b border-border/50",
                          "pb-4 mb-4"
                        )}>
                          {/* User Welcome Card - Consistent styling */}
                          <div className="flex items-center gap-3 mb-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={profilePictureUrl || undefined} />
                              <AvatarFallback>
                                {user.email?.[0]?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {talentName || user.email}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {talentName ? "Talent" : "Booker"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </MobileMenu>
                )}
              </MobileMenuProvider>
            </div>

            {/* Universal Chat - Always available for authenticated users */}
            {user && <UniversalChat />}
          </nav>
        </div>
      </header>

      {/* Spacer to prevent content from going under fixed header */}
      <div className="h-16 sm:h-20"></div>

      <HowItWorksModal
        open={showHowItWorksModal}
        onOpenChange={setShowHowItWorksModal}
      />

      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
      />

      <DeleteAccountModal
        open={showDeleteAccountModal}
        onOpenChange={setShowDeleteAccountModal}
      />
    </>
  );
}
