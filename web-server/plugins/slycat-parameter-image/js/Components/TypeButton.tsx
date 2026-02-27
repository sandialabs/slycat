import React, { useId } from "react";
import Icon, { type IconName } from "components/Icons/Icon";
import { type MediaType } from "../constants/media-types";

interface TypeButtonProps {
  mediaType: MediaType;
  title?: string;
  className?: string;
  onMaximize?: (event: Event) => void;
  onMinimize?: (event: Event) => void;
  onClone?: (event: Event) => void;
  onSetCenterOfRotation?: () => void;
  onJump?: (event: Event) => void;
  tableIndex?: number | string;
  downloadUrl?: string;
  downloadFilename?: string;
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
const TypeButton: React.FC<TypeButtonProps> = ({
  mediaType,
  title,
  className = "",
  onMaximize,
  onMinimize,
  onClone,
  onSetCenterOfRotation,
  onJump,
  tableIndex,
  downloadUrl,
  downloadFilename,
}) => {
  const icon = MEDIA_TYPE_ICON_MAP[mediaType] || MEDIA_TYPE_ICON_MAP.unknown;
  const label = MEDIA_TYPE_LABEL_MAP[mediaType] || MEDIA_TYPE_LABEL_MAP.unknown;
  const buttonTitle = title || `Media type: ${label}`;
  const dropdownId = useId();

  // PDF icon is slightly taller, so we reduce its size and shift it up a bit
  const iconStyle =
    mediaType === "pdf" ? { fontSize: "0.9em", transform: "translateY(-1px)" } : undefined;

  return (
    <div
      className={`dropup type-button frame-button ${className}`}
      // Stop event propagation to prevent frame from being dragged when interacting with the button and dropdown
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="btn btn-sm type-button-toggle"
        id={dropdownId}
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
        title={buttonTitle}
        aria-label={buttonTitle}
      >
        <Icon type={icon} style={iconStyle} />
        <span className="type-button-label">{label}</span>
        <Icon type="ellipsis-vertical" />
      </button>
      <div className="dropdown-menu" aria-labelledby={dropdownId}>
        <button
          type="button"
          className="dropdown-item maximize-item"
          onClick={(e) => onMaximize?.(e.nativeEvent)}
        >
          <Icon type="window-maximize" /> Maximize
        </button>
        <button
          type="button"
          className="dropdown-item minimize-item"
          onClick={(e) => onMinimize?.(e.nativeEvent)}
        >
          <Icon type="window-minimize" /> Minimize
        </button>
        {onClone && (
          <button
            type="button"
            className="dropdown-item"
            onClick={(e) => onClone(e.nativeEvent)}
          >
            <Icon type="clone" /> Clone
          </button>
        )}
        {onSetCenterOfRotation && (
          <button
            type="button"
            className="dropdown-item"
            onClick={() => onSetCenterOfRotation()}
          >
            <Icon type="crosshairs" /> Set center of rotation
          </button>
        )}
        {onJump && (
          <button
            type="button"
            className="dropdown-item"
            onClick={(e) => onJump(e.nativeEvent)}
          >
            <Icon type="table" /> Jump to row {tableIndex}
          </button>
        )}
        {downloadUrl && (
          <a className="dropdown-item" href={downloadUrl} download={downloadFilename}>
            <Icon type="download" /> Download
          </a>
        )}
      </div>
    </div>
  );
};

export default TypeButton;
