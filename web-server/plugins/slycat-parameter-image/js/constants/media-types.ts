/**
 * Media type constants and types for the Parameter Image plugin.
 * Used to identify different types of media displayed in image frames.
 */

export const MEDIA_TYPES = Object.freeze({
  LINK: "link",
  IMAGE: "image",
  VIDEO: "video",
  PDF: "pdf",
  VTP: "vtp",
  STL: "stl",
  UNKNOWN: "unknown",
} as const);

// Derive the MediaType union type from MEDIA_TYPES values
export type MediaType = (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES];
