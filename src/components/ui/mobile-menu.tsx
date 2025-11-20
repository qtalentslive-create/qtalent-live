import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { cn } from "@/lib/utils";
import { useNativeExperience } from "@/hooks/useNativeExperience";

interface MobileMenuProps {
  children: React.ReactNode;
  onTriggerClick?: () => void; // Callback for external trigger
}

// Shared state context for menu control (used by both Header button and MobileMenu)
const MobileMenuStateContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

// Create context for closing the menu (used inside menu content)
const MobileMenuContext = React.createContext<{
  closeMenu: () => void;
  openMenu: () => void;
  isOpen: boolean;
}>({
  closeMenu: () => {},
  openMenu: () => {},
  isOpen: false,
});

export const useMobileMenu = () => React.useContext(MobileMenuContext);

// Export hook to control menu from outside (e.g., Header button)
export function useMobileMenuControl() {
  const context = React.useContext(MobileMenuStateContext);
  if (!context) {
    throw new Error("useMobileMenuControl must be used within MobileMenuProvider");
  }
  return {
    open: context.open,
    openMenu: () => context.setOpen(true),
    closeMenu: () => context.setOpen(false),
    toggleMenu: () => context.setOpen(!context.open),
  };
}

// Provider component that manages the shared state
export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <MobileMenuStateContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileMenuStateContext.Provider>
  );
}

export function MobileMenu({ children, onTriggerClick }: MobileMenuProps) {
  const stateContext = React.useContext(MobileMenuStateContext);
  // Use shared state if available (when inside MobileMenuProvider), otherwise use local state
  const [localOpen, setLocalOpen] = React.useState(false);
  const open = stateContext ? stateContext.open : localOpen;
  const setOpen = stateContext ? stateContext.setOpen : setLocalOpen;
  
  const isMobile = useIsMobile();
  const { unreadCount } = useUnreadNotifications();
  const isNativeExperience = useNativeExperience();

  // Define closeMenu and openMenu before any conditional returns (React Hook rules)
  const closeMenu = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const openMenu = React.useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  // Only render on mobile
  if (!isMobile) {
    return null;
  }

  // For native apps: Sheet WITHOUT trigger - button is rendered separately in Header
  if (isNativeExperience) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            "w-[380px] px-1 [&>button]:top-4 [&>button]:right-4 [&>button]:opacity-100 [&>button]:h-9 [&>button]:w-9 [&>button>svg]:h-6 [&>button>svg]:w-6",
            "h-full max-h-[100dvh] overflow-y-auto",
            "pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-[calc(env(safe-area-inset-bottom,0px)+96px)]"
          )}
        >
          <MobileMenuContext.Provider value={{ closeMenu, openMenu, isOpen: open }}>
            <div className="flex flex-col space-y-0 pt-2">
              {children}
            </div>
          </MobileMenuContext.Provider>
        </SheetContent>
      </Sheet>
    );
  }

  // For web: Use normal Sheet with trigger
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden relative">
          <Menu className="h-4 w-4" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full"></div>
          )}
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className={cn(
          "w-[280px] sm:w-[400px]",
          "max-h-[100dvh] overflow-y-auto pb-10"
        )}
      >
        <MobileMenuContext.Provider value={{ closeMenu, openMenu, isOpen: open }}>
          <div className="flex flex-col space-y-4 py-4">
            {children}
          </div>
        </MobileMenuContext.Provider>
      </SheetContent>
    </Sheet>
  );
}
