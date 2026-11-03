// Utility functions for Jalali / Persian date formatting and input normalization

export function toEnglishDigits(str: string): string {
  if (!str) return "";
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/**
 * Formats user input into Jalali date format (YYYY/MM/DD) live while typing.
 * Rules:
 * - Persian/Arabic numbers converted to English numbers.
 * - Max 8 digits (YYYYMMDD).
 * - After 4 digits of year, automatically appends '/'.
 * - After 2 digits of month, automatically appends '/'.
 */
export function formatJalaliDateInput(val: string): string {
  if (!val) return "";

  // Convert Persian/Arabic digits to English digits
  const englishStr = toEnglishDigits(val);
  // Extract all digits only, max 8
  const digits = englishStr.replace(/\D/g, "").slice(0, 8);

  if (!digits) return "";

  if (digits.length < 4) {
    return digits;
  } else if (digits.length === 4) {
    return `${digits}/`;
  } else if (digits.length < 6) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4);
    return `${y}/${m}`;
  } else if (digits.length === 6) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    return `${y}/${m}/`;
  } else {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    return `${y}/${m}/${d}`;
  }
}

/**
 * Finalizes Jalali date string on blur or save, padding month & day to 2 digits.
 * e.g., "1405/5/9" -> "1405/05/09", "۱۴۰۵/۵/۹" -> "1405/05/09"
 */
export function finalizeJalaliDate(val: string): string {
  if (!val) return "";
  const clean = toEnglishDigits(val).trim();

  // If string contains slashes like "1405/5/9" or "1405/05/09"
  if (clean.includes("/")) {
    const parts = clean.split("/").map((p) => p.trim());
    if (parts.length >= 1 && parts[0]) {
      const y = parts[0].padStart(4, "0");
      if (parts.length === 1 || !parts[1]) return y;
      const m = parts[1].padStart(2, "0");
      if (parts.length === 2 || !parts[2]) return `${y}/${m}`;
      const d = parts[2].padStart(2, "0");
      return `${y}/${m}/${d}`;
    }
  }

  // Raw digits without slashes, e.g., "14050509"
  const digits = clean.replace(/\D/g, "").slice(0, 8);
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
  }
  if (digits.length >= 4) {
    const y = digits.slice(0, 4);
    const rest = digits.slice(4);
    if (rest.length === 0) return `${y}`;
    if (rest.length <= 2) return `${y}/${rest.padStart(2, "0")}`;
    const m = rest.slice(0, 2).padStart(2, "0");
    const d = rest.slice(2, 4).padStart(2, "0");
    return `${y}/${m}/${d}`;
  }

  return clean;
}

/**
 * Gets current Jalali date formatted as 8 digits with slashes: YYYY/MM/DD
 * e.g., "1405/05/09"
 */
export function getTodayJalali(dateInput?: Date): string {
  const d = dateInput || new Date();
  try {
    const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return finalizeJalaliDate(formatter.format(d));
  } catch {
    return finalizeJalaliDate(d.toLocaleDateString("fa-IR"));
  }
}

/**
 * Gets tomorrow's Jalali date formatted as YYYY/MM/DD
 */
export function getTomorrowJalali(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getTodayJalali(tomorrow);
}

/**
 * Normalizes any Jalali date string to YYYY/MM/DD for comparison
 */
export function normalizeJalaliDate(val: string): string {
  return finalizeJalaliDate(val);
}

/** Returns false for empty and placeholder values such as "     /  /". */
export function hasRealJalaliDate(val?: string): boolean {
  if (!val) return false;
  const normalized = toEnglishDigits(String(val)).trim();
  return (normalized.match(/\d/g) || []).length >= 6;
}
