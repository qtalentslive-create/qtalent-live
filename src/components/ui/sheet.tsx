import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";
import { Capacitor } from "@capacitor/core";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  return (
    <SheetPrimitive.Overlay
      className={cn(
        // For native: CSS will handle positioning and clipping to prevent covering header
        isNative 
          ? "fixed left-0 right-0 top-[calc(3rem+env(safe-area-inset-top))] bottom-0 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-[10000]"
          : "fixed inset-0 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50",
        className
      )}
      style={isNative ? {
        position: 'fixed',
        top: `calc(3rem + env(safe-area-inset-top))`,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: `calc(100vh - 3rem - env(safe-area-inset-top))`,
        zIndex: 10000,
        // Use clip-path to ensure overlay never covers header
        clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`,
      } : undefined}
      {...props}
      ref={ref}
    />
  );
});
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  return (
    <SheetPortal>
      {/* FOR NATIVE APPS: COMPLETELY REMOVE OVERLAY - it covers hamburger button */}
      {/* NO OVERLAY AT ALL for native apps */}
      {!isNative && <SheetOverlay />}
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          // For native apps with right side: REMOVE inset-y-0 and h-full from variants
          // These make the sheet cover the entire height including header!
          // Also remove shadow-lg to prevent shadow from covering header
          isNative && side === "right" 
            ? "fixed right-0 w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm gap-4 bg-background p-6 transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 overflow-hidden"
            : sheetVariants({ side }),
          isNative ? "z-[10001]" : "z-50",
          // For native apps, position Sheet COMPLETELY BELOW header - no overlap
          isNative && side === "right" && "top-[calc(3rem+env(safe-area-inset-top))] h-[calc(100vh-3rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-h-[calc(100vh-3rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] bottom-auto",
          className
        )}
        style={isNative && side === "right" ? {
          position: 'fixed',
          top: `calc(3rem + env(safe-area-inset-top))`,
          right: 0,
          bottom: 'auto', // CRITICAL: Override any bottom: 0 from inset-y-0
          height: `calc(100vh - 3rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))`,
          maxHeight: `calc(100vh - 3rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))`,
          zIndex: 10001,
          // Ensure it doesn't extend into header area
          marginTop: 0,
          paddingTop: 0,
          // CRITICAL: Use clip-path to physically cut out header area - prevents any visual coverage
          clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`,
          // Prevent overflow that might cover header
          overflow: 'hidden',
          // Ensure shadow doesn't extend beyond bounds
          boxShadow: 'none', // Remove shadow that might extend into header
        } : undefined}
        {...props}
      >
        {children}
        {/* Hide close button in Capacitor - hamburger menu controls it */}
        {!isNative && (
          <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
