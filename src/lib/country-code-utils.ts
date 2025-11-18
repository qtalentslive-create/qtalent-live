import { countries } from "./countries";

/**
 * Get ISO country code from country name
 * @param countryName - Full country name (e.g., "United States", "Qatar")
 * @returns ISO country code (e.g., "US", "QA") or "US" as fallback
 */
export const getCountryCode = (
  countryName: string | null | undefined
): string => {
  if (!countryName || countryName === "Worldwide") {
    return "US"; // Default fallback
  }

  // Find country in the countries array
  const country = countries.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase()
  );

  return country?.code || "US";
};

/**
 * Get country name from ISO country code
 * @param code - ISO country code (e.g., "US", "QA")
 * @returns Full country name or empty string if not found
 */
export const getCountryName = (code: string | null | undefined): string => {
  if (!code) return "";

  const country = countries.find(
    (c) => c.code.toLowerCase() === code.toLowerCase()
  );

  return country?.name || "";
};
