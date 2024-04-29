import * as chrono from "chrono-node";

export function parseDate(dateString: string): Date {
  const parsedChronoDate = chrono.parseDate(dateString.toString());
  if (parsedChronoDate !== null) return parsedChronoDate;

  const parsedDate = new Date(dateString.toString());
  return parsedDate;
}
