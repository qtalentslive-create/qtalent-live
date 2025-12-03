// Mobile-optimized date picker - NO GREEN
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

interface MobileDatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  label?: string;
}

export function MobileDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  label = "Select Date",
}: MobileDatePickerProps) {
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

  // Auto-confirm when date is selected
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        data-mobile-form-input="true"
        className="mobile-form-trigger"
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          height: "48px",
          width: "100%",
          alignItems: "center",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          padding: "12px 16px",
          fontSize: "16px",
          textAlign: "left",
          color: value ? "inherit" : "rgba(255, 255, 255, 0.5)",
          outline: "none",
          boxShadow: "none",
        }}
      >
        <CalendarIcon
          style={{
            marginRight: "12px",
            height: "20px",
            width: "20px",
            color: "rgba(255, 255, 255, 0.4)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value ? format(value, "PPP") : placeholder}
        </span>
      </button>

      {/* Full-screen Date Picker Modal */}
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
              {label}
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

          {/* Calendar Container */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              display: "flex",
              justifyContent: "center",
              paddingTop: "24px",
              paddingLeft: "16px",
              paddingRight: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "16px",
              }}
            >
              <Calendar
                mode="single"
                selected={value}
                onSelect={handleDateSelect}
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                classNames={{
                  day_selected: "bg-white/20 text-white",
                  day_today: "border border-white/30 font-medium",
                }}
              />
            </div>
          </div>

          {/* Bottom hint */}
          <div
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "16px 20px",
              paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
              textAlign: "center",
              backgroundColor: "#000",
            }}
          >
            <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>
              Tap a date to select
            </p>
          </div>
        </div>
      )}
    </>
  );
}
