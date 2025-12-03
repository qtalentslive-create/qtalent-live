// Mobile-optimized textarea component - NO GREEN
import { forwardRef, TextareaHTMLAttributes } from "react";

interface MobileTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const MobileTextarea = forwardRef<
  HTMLTextAreaElement,
  MobileTextareaProps
>(({ className, style, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      data-mobile-form-input="true"
      className="mobile-form-input"
      style={{
        display: "flex",
        minHeight: "100px",
        width: "100%",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        padding: "12px 16px",
        fontSize: "16px",
        color: "inherit",
        outline: "none",
        boxShadow: "none",
        resize: "none",
        ...style,
      }}
      {...props}
    />
  );
});

MobileTextarea.displayName = "MobileTextarea";
