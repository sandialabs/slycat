/**
 * Ensure a date string has timezone information; if missing, assume UTC.
 * Returns the original value for Date objects.
 */
export const ensureUtcTimezone = (date: string | Date): string | Date => {
  if (date instanceof Date) {
    return date;
  }

  const trimmed = typeof date === "string" ? date.trim() : date;
  const hasTimezone =
    typeof trimmed === "string" &&
    /(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);

  if (typeof trimmed !== "string") {
    return trimmed;
  }

  return hasTimezone ? trimmed : `${trimmed}Z`;
};

/**
 * Normalize a date input and return its locale string representation.
 * Returns an empty string for null/undefined/invalid inputs.
 */
export const formatDateToLocaleString = (date?: string | Date): string => {
  if (date === undefined || date === null) {
    return "";
  }

  const normalized = ensureUtcTimezone(date);
  const parsed = normalized instanceof Date ? normalized : new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
};
