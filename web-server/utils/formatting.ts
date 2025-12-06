import { DateTime } from "luxon";

/**
 * Parse an ISO date string, preserving timezone when provided and
 * defaulting to UTC when missing.
 */
export const parseDateWithTimezone = (date: string): Date | null => {
  if (typeof date !== "string") {
    return null;
  }

  const trimmed = date.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = DateTime.fromISO(trimmed, { setZone: true, zone: "utc" });
  return parsed.isValid ? parsed.toJSDate() : null;
};

/**
 * Normalize an ISO date string and return its locale string representation.
 * Returns an empty string for null/undefined/invalid inputs.
 */
export const formatDateToLocaleString = (date?: string): string => {
  if (date === undefined || date === null) {
    return "";
  }

  const parsed = parseDateWithTimezone(date);
  return parsed ? parsed.toLocaleString() : "";
};
