import React, { useId } from "react";
import Icon, { type IconName } from "components/Icons/Icon";
import { type MediaType } from "../constants/media-types";

// Map media types to display labels
const MEDIA_TYPE_LABEL_MAP: Record<MediaType, string> = {
  link: "Link",
  image: "Image",
  video: "Video",
  pdf: "PDF",
  vtp: "3D",
  stl: "3D",
  unknown: "Unknown Type",
};

interface TypeLabelProps {
  mediaType: MediaType;
  tableIndex?: number | string;
  className?: string;
}

/**
 * Displays the media type label and row index in the frame footer.
 */
export const TypeLabel: React.FC<TypeLabelProps> = ({ mediaType, tableIndex, className = "" }) => {
  const label = MEDIA_TYPE_LABEL_MAP[mediaType] || MEDIA_TYPE_LABEL_MAP.unknown;

  return (
    <span className={`type-label ${className}`}>
      <span className="type-label-text">{label}</span>
      {tableIndex != null && <span className="type-label-index">Row {tableIndex}</span>}
    </span>
  );
};

interface FrameMenuProps {
  className?: string;
  onMaximize?: (event: Event) => void;
  onMinimize?: (event: Event) => void;
  onPin?: (event: Event) => void;
  onClone?: (event: Event) => void;
  onSetCenterOfRotation?: () => void;
  onJump?: (event: Event) => void;
  tableIndex?: number | string;
  downloadUrl?: string;
  downloadFilename?: string;
}

/**
 * Ellipsis menu button that opens a dropdown with frame actions.
 * Renders as a Bootstrap dropup since it sits in the frame footer at the bottom.
 */
type MenuItem = {
  icon: IconName;
  label: string;
  className?: string;
  href?: string;
  download?: string;
  onClick?: (e: React.MouseEvent) => void;
};

export const FrameMenu: React.FC<FrameMenuProps> = ({
  className = "",
  onMaximize,
  onMinimize,
  onPin,
  onClone,
  onSetCenterOfRotation,
  onJump,
  tableIndex,
  downloadUrl,
  downloadFilename,
}) => {
  const dropdownId = useId();

  const items: MenuItem[] = [
    { icon: "thumbtack", label: "Pin", onClick: (e) => onPin?.(e.nativeEvent) },
    { icon: "window-maximize", label: "Maximize", className: "maximize-item", onClick: (e) => onMaximize?.(e.nativeEvent) },
    { icon: "window-minimize", label: "Minimize", className: "minimize-item", onClick: (e) => onMinimize?.(e.nativeEvent) },
    ...(onClone ? [{ icon: "clone" as IconName, label: "Clone", onClick: (e: React.MouseEvent) => onClone(e.nativeEvent) }] : []),
    ...(onSetCenterOfRotation ? [{ icon: "crosshairs" as IconName, label: "Set Center of Rotation", onClick: () => onSetCenterOfRotation() }] : []),
    ...(onJump ? [{ icon: "table" as IconName, label: `Jump to Row ${tableIndex}`, onClick: (e: React.MouseEvent) => onJump(e.nativeEvent) }] : []),
    ...(downloadUrl ? [{ icon: "download" as IconName, label: "Download", href: downloadUrl, download: downloadFilename }] : []),
  ];

  return (
    <div
      className={`dropup frame-menu frame-button ${className}`}
    >
      <button
        type="button"
        className="btn btn-sm frame-menu-toggle"
        id={dropdownId}
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
        title="Frame actions"
        aria-label="Frame actions"
      >
        <Icon type="ellipsis-vertical" />
      </button>
      <div className="dropdown-menu" aria-labelledby={dropdownId}>
        {items.map((item) =>
          item.href ? (
            <a key={item.label} className="dropdown-item px-3" href={item.href} download={item.download}>
              <Icon type={item.icon} /> {item.label}
            </a>
          ) : (
            <button
              key={item.label}
              type="button"
              className={`dropdown-item px-3 ${item.className || ""}`}
              onClick={item.onClick}
            >
              <Icon type={item.icon} /> {item.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
};
