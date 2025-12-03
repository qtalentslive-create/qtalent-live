// Mobile-optimized select component using full-screen picker
import { useState, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export interface MobileSelectOption {
  value: string;
  label: string;
}

interface MobileSelectProps {
  value: string;
  options: MobileSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
}

export function MobileSelect({
  value,
  options,
  onValueChange,
  placeholder = "Select an option",
  label,
  id,
}: MobileSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scroll when picker is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setIsOpen(false); // Auto-close on selection
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        data-mobile-form-input="true"
        onClick={() => setIsOpen(true)}
        className="mobile-form-trigger"
        style={{
          display: "flex",
          height: "48px",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          padding: "12px 16px",
          fontSize: "16px",
          textAlign: "left",
          color: selectedOption ? "inherit" : "rgba(255, 255, 255, 0.5)",
          outline: "none",
          boxShadow: "none",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          style={{
            height: "20px",
            width: "20px",
            color: "rgba(255, 255, 255, 0.4)",
            flexShrink: 0,
            marginLeft: "8px",
          }}
        />
      </button>

      {/* Full-screen Picker Modal */}
      {isOpen && (
        <div
          className="mobile-picker-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#000",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              paddingTop: "max(env(safe-area-inset-top), 16px)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <h3 style={{ fontWeight: 600, fontSize: "18px", color: "white" }}>
              {label || "Select"}
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mobile-picker-close"
              style={{
                padding: "8px",
                marginRight: "-8px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "white",
              }}
            >
              <X style={{ height: "20px", width: "20px" }} />
            </button>
          </div>

          {/* Options List */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ padding: "8px 0" }}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className="mobile-picker-option"
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      textAlign: "left",
                      fontSize: "16px",
                      background: isSelected
                        ? "rgba(255, 255, 255, 0.08)"
                        : "transparent",
                      border: "none",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      cursor: "pointer",
                      color: "white",
                    }}
                  >
                    <span
                      style={{
                        color: isSelected
                          ? "white"
                          : "rgba(255, 255, 255, 0.7)",
                      }}
                    >
                      {option.label}
                    </span>
                    {isSelected && (
                      <Check
                        style={{
                          height: "18px",
                          width: "18px",
                          color: "#4ade80",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom safe area */}
          <div
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              paddingBottom: "env(safe-area-inset-bottom)",
              backgroundColor: "#000",
            }}
          />
        </div>
      )}
    </>
  );
}
