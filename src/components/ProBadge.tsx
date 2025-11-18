import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProBadgeProps {
  size?: "sm" | "default" | "lg";
  className?: string;
  showIcon?: boolean;
}

export function ProBadge({
  size = "default",
  className,
  showIcon = true,
}: ProBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-2.5 py-1 font-semibold",
    default: "text-xs px-3 py-1.5 font-semibold",
    lg: "text-sm px-4 py-2 font-semibold",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    default: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <Badge
      aria-label="Pro subscriber"
      className={cn(
        "relative inline-flex items-center gap-1 uppercase tracking-[0.18em]",
        "border border-[hsl(var(--color-accent-gold))]/70",
        "bg-[radial-gradient(circle_at_top,hsl(var(--color-brand-gold))_0%,hsl(var(--color-accent-gold))_45%,hsl(var(--color-brand-primary))_120%)]",
        "text-[hsl(var(--color-text-primary-light))]",
        "shadow-[0_4px_16px_rgba(234,179,8,0.25)]",
        "before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.25),transparent)] before:opacity-60",
        "after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-white/10",
        "overflow-hidden transition-all duration-300",
        "hover:shadow-[0_6px_18px_rgba(234,179,8,0.35)] hover:-translate-y-[1px]",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <span className="relative z-10 flex items-center">
          <Crown
            className={cn(
              iconSizes[size],
              "text-[hsl(var(--color-text-primary-light))]",
              "drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
            )}
            strokeWidth={1.5}
          />
        </span>
      )}
      <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
        PRO
      </span>
    </Badge>
  );
}