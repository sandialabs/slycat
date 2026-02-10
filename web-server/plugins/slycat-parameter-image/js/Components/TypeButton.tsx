import React from "react";
import Icon, { type IconName } from "components/Icons/Icon";
import { type MediaType } from "../constants/media-types";

interface TypeButtonProps {
  mediaType: MediaType;
  title?: string;
  className?: string;
}

// Map media types to their corresponding icons
const MEDIA_TYPE_ICON_MAP: Record<MediaType, IconName> = {
  link: "link",
  image: "image",
  video: "video",
  pdf: "file-pdf",
  vtp: "cube",
  stl: "cube",
  unknown: "question-circle",
};

// Map media types to display labels
const MEDIA_TYPE_LABEL_MAP: Record<MediaType, string> = {
  link: "Link",
  image: "Image",
  video: "Video",
  pdf: "PDF",
  vtp: "3D (VTP)",
  stl: "3D (STL)",
  unknown: "Unknown",
};

/**
 * A button component that displays an icon representing the media type.
 * Used in image frames to indicate what type of media is being displayed.
 */
const TypeButton: React.FC<TypeButtonProps> = ({ mediaType, title, className = "" }) => {
  const icon = MEDIA_TYPE_ICON_MAP[mediaType] || MEDIA_TYPE_ICON_MAP.unknown;
  const label = MEDIA_TYPE_LABEL_MAP[mediaType] || MEDIA_TYPE_LABEL_MAP.unknown;
  const buttonTitle = title || `Media type: ${label}`;

  // PDF icon is slightly taller, so we reduce its size and shift it up a bit
  const iconStyle =
    mediaType === "pdf" ? { fontSize: "0.9em", transform: "translateY(-1px)" } : undefined;

  return (
    <span
      className={`type-button frame-button ${className}`}
      title={buttonTitle}
      aria-label={buttonTitle}
    >
      <Icon type={icon} style={iconStyle} />
    </span>
  );
};

export default TypeButton;
