import React, { useId } from "react";
import Icon, { type IconName } from "components/Icons/Icon";
import { type MediaType } from "../constants/media-types";

interface TypeButtonProps {
  mediaType: MediaType;
  title?: string;
  className?: string;
  onMaximize?: (event: Event) => void;
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
 * A dropdown button component that displays an icon and label for the media type.
 * Used in image frames to indicate what type of media is being displayed.
 * Renders as a Bootstrap dropup since it sits in the frame footer at the bottom.
 */
const TypeButton: React.FC<TypeButtonProps> = ({ mediaType, title, className = "", onMaximize }) => {
  const icon = MEDIA_TYPE_ICON_MAP[mediaType] || MEDIA_TYPE_ICON_MAP.unknown;
  const label = MEDIA_TYPE_LABEL_MAP[mediaType] || MEDIA_TYPE_LABEL_MAP.unknown;
  const buttonTitle = title || `Media type: ${label}`;
  const dropdownId = useId();

  // PDF icon is slightly taller, so we reduce its size and shift it up a bit
  const iconStyle =
    mediaType === "pdf" ? { fontSize: "0.9em", transform: "translateY(-1px)" } : undefined;

  return (
    <div className={`dropup type-button frame-button ${className}`}>
      <button
        type="button"
        className="btn btn-sm type-button-toggle dropdown-toggle"
        id={dropdownId}
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
        title={buttonTitle}
        aria-label={buttonTitle}
      >
        <Icon type={icon} style={iconStyle} />
        <span className="type-button-label">{label}</span>
      </button>
      <div className="dropdown-menu" aria-labelledby={dropdownId}>
        <button
          type="button"
          className="dropdown-item"
          onClick={(e) => onMaximize?.(e.nativeEvent)}
        >
          <Icon type="window-maximize" /> Maximize
        </button>
      </div>
    </div>
  );
};

export default TypeButton;
