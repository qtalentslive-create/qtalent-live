// Mobile-optimized location picker - NO GREEN
import { useState, useEffect, useMemo } from "react";
import { Check, MapPin, Search, X, Loader2 } from "lucide-react";
import { countries, sortCountriesByProximity } from "@/lib/countries";
import { useLocationDetection } from "@/hooks/useLocationDetection";

interface MobileLocationPickerProps {
  onLocationChange: (location: string) => void;
  currentLocation?: string;
}

export function MobileLocationPicker({
  onLocationChange,
  currentLocation,
}: MobileLocationPickerProps) {
  const {
    userLocation,
    detectedLocation,
    isDetecting,
    detectionState,
    detectLocation,
    saveLocation,
  } = useLocationDetection();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Determine display location
  const displayLocation = currentLocation || userLocation || "Worldwide";

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

  // Sort and filter countries
  const filteredCountries = useMemo(() => {
    const sorted = sortCountriesByProximity(displayLocation, countries);
    if (!searchQuery.trim()) return sorted;

    const query = searchQuery.toLowerCase();
    return sorted.filter((country) =>
      country.name.toLowerCase().includes(query)
    );
  }, [displayLocation, searchQuery]);

  const handleSelectLocation = (location: string) => {
    saveLocation(location, true);
    onLocationChange(location);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleDetectLocation = async () => {
    await detectLocation();
  };

  const isDetected =
    displayLocation === detectedLocation && displayLocation !== "Worldwide";

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
          color: "inherit",
          outline: "none",
          boxShadow: "none",
        }}
      >
        <MapPin
          style={{
            marginRight: "12px",
            height: "20px",
            width: "20px",
            color: isDetected ? "#4ade80" : "rgba(255, 255, 255, 0.4)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {displayLocation}
        </span>
        {isDetecting && (
          <Loader2
            style={{
              height: "16px",
              width: "16px",
              marginLeft: "8px",
              color: "rgba(255, 255, 255, 0.4)",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
      </button>

      {/* Full-screen Location Picker Modal */}
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
          <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                paddingTop: "max(env(safe-area-inset-top), 16px)",
              }}
            >
              <h3 style={{ fontWeight: 600, fontSize: "18px", color: "white" }}>
                Select Location
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery("");
                }}
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

            {/* Search Input */}
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ position: "relative" }}>
                <Search
                  style={{
                    position: "absolute",
                    left: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    height: "20px",
                    width: "20px",
                    color: "rgba(255, 255, 255, 0.4)",
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search countries..."
                  autoFocus
                  className="mobile-form-input"
                  data-mobile-form-input="true"
                  style={{
                    width: "100%",
                    height: "48px",
                    paddingLeft: "48px",
                    paddingRight: "16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    fontSize: "16px",
                    color: "white",
                    outline: "none",
                    boxShadow: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetecting}
              className="mobile-picker-option"
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                padding: "12px 16px",
                marginBottom: "12px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                fontSize: "16px",
                color: "white",
                cursor: "pointer",
                opacity: isDetecting ? 0.7 : 1,
              }}
            >
              {isDetecting ? (
                <Loader2
                  style={{
                    marginRight: "12px",
                    height: "20px",
                    width: "20px",
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <MapPin
                  style={{
                    marginRight: "12px",
                    height: "20px",
                    width: "20px",
                    color: "rgba(255, 255, 255, 0.5)",
                  }}
                />
              )}
              <span>
                {isDetecting
                  ? "Detecting..."
                  : detectionState === "success"
                  ? "Re-detect Location"
                  : "Detect My Location"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectLocation("Worldwide")}
              className="mobile-picker-option"
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                backgroundColor:
                  displayLocation === "Worldwide"
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(255, 255, 255, 0.05)",
                fontSize: "16px",
                color: "white",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "12px", fontSize: "20px" }}>
                  🌍
                </span>
                <span>Worldwide (Show All)</span>
              </div>
              {displayLocation === "Worldwide" && (
                <Check
                  style={{ height: "18px", width: "18px", color: "#4ade80" }}
                />
              )}
            </button>
          </div>

          {/* Countries List */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ padding: "8px 0" }}>
              {filteredCountries.length === 0 ? (
                <div
                  style={{
                    padding: "32px 20px",
                    textAlign: "center",
                    color: "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  No countries match "{searchQuery}"
                </div>
              ) : (
                filteredCountries.map((country) => {
                  const isSelected = country.name === displayLocation;
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleSelectLocation(country.name)}
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
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span style={{ marginRight: "12px", fontSize: "20px" }}>
                          {country.flag}
                        </span>
                        <span
                          style={{
                            color: isSelected
                              ? "white"
                              : "rgba(255, 255, 255, 0.7)",
                          }}
                        >
                          {country.name}
                        </span>
                      </div>
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
                })
              )}
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
