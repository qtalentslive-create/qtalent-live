// Mobile-optimized input component - NO GREEN
import { forwardRef, InputHTMLAttributes } from "react";

interface MobileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, label, style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        data-mobile-form-input="true"
        className="mobile-form-input"
        style={{
          display: "flex",
          height: "48px",
          width: "100%",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          padding: "12px 16px",
          fontSize: "16px",
          color: "inherit",
          outline: "none",
          boxShadow: "none",
          ...style,
        }}
        {...props}
      />
    );
  }
);

MobileInput.displayName = "MobileInput";
