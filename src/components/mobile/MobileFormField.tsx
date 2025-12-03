// Mobile form field wrapper - inline styles only
import { ReactNode } from "react";

interface MobileFormFieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

export function MobileFormField({
  label,
  required = false,
  children,
}: MobileFormFieldProps) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label
        style={{
          display: "block",
          fontSize: "14px",
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.6)",
          paddingLeft: "4px",
          marginBottom: "8px",
        }}
      >
        {label}
        {required && (
          <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
        )}
      </label>
      {children}
    </div>
  );
}
