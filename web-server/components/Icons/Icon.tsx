import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";

/* import all the free icons (Solid, Regular, and Brands) */
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";

/*
 * react-icons (multi-library) support.
 *
 * To keep bundles small, import each icon directly from its pack subpath
 * (e.g. "react-icons/pi" for Phosphor) — never `import * as` a whole pack.
 * react-icons sets `"sideEffects": false`, so a production webpack build
 * tree-shakes unused exports and bundles only the icons referenced here.
 * Store the imported component on the map entry's `component` field.
 *
 * Example:
 *   import { PiTextColumns } from "react-icons/pi";
 *   // ...then in ICON_NAME_MAP:
 *   "text-columns": { library: "react-icons", component: PiTextColumns },
 */
import { PiTextAlignJustify, PiTextColumns } from "react-icons/pi";
import type { IconType } from "react-icons";

library.add(fas, far, fab);

type FontAwesomeMapEntry = FontAwesomeIconProps;
type ReactIconsMapEntry = { library: "react-icons"; component: IconType };
type IconMapEntry = FontAwesomeMapEntry | ReactIconsMapEntry;

export const ICON_NAME_MAP = {
  trash: { icon: { prefix: "fas", iconName: "trash" } },
  "trash-can": { icon: { prefix: "fas", iconName: "trash-can" } },
  "trash-can-regular": { icon: { prefix: "far", iconName: "trash-can" } },
  gear: { icon: { prefix: "fas", iconName: "gear" } },
  download: { icon: { prefix: "fas", iconName: "download" } },
  upload: { icon: { prefix: "fas", iconName: "upload" } },
  "backward-fast": { icon: { prefix: "fas", iconName: "backward-fast" } },
  "backward-step": { icon: { prefix: "fas", iconName: "backward-step" } },
  play: { icon: { prefix: "fas", iconName: "play" } },
  pause: { icon: { prefix: "fas", iconName: "pause" } },
  "forward-step": { icon: { prefix: "fas", iconName: "forward-step" } },
  "fast-forward": { icon: { prefix: "fas", iconName: "fast-forward" } },
  pencil: { icon: { prefix: "fas", iconName: "pencil" } },
  "turn-up": { icon: { prefix: "fas", iconName: "turn-up" } },
  folder: { icon: { prefix: "fas", iconName: "folder" } },
  file: { icon: { prefix: "far", iconName: "file" } },
  "toggle-on": { icon: { prefix: "fas", iconName: "toggle-on" } },
  // Media type icons
  image: { icon: { prefix: "far", iconName: "image" } },
  video: { icon: { prefix: "fas", iconName: "video" } },
  "file-pdf": { icon: { prefix: "far", iconName: "file-pdf" } },
  cube: { icon: { prefix: "fas", iconName: "cube" } },
  link: { icon: { prefix: "fas", iconName: "link" } },
  "question-circle": { icon: { prefix: "fas", iconName: "circle-question" } },
  "window-maximize": { icon: { prefix: "far", iconName: "window-maximize" } },
  "window-minimize": { icon: { prefix: "far", iconName: "window-minimize" } },
  clone: { icon: { prefix: "far", iconName: "clone" } },
  table: { icon: { prefix: "fas", iconName: "table" } },
  crosshairs: { icon: { prefix: "fas", iconName: "crosshairs" } },
  "ellipsis-vertical": { icon: { prefix: "fas", iconName: "ellipsis-vertical" } },
  thumbtack: { icon: { prefix: "fas", iconName: "thumbtack" } },
  // sort icons
  "table-columns": { icon : { prefix: "fas", iconName: "table-columns" } },
  "arrow-down-wide-short": { icon: { prefix: "fas", iconName: "arrow-down-wide-short"} },
  "arrow-down-short-wide": { icon: { prefix: "fas", iconName: "arrow-down-short-wide"} },
  check: { icon: { prefix: "fas", iconName: "check" } },
  // react-icons icons
  "text-columns": { library: "react-icons", component: PiTextColumns },
  "text-align-justify": { library: "react-icons", component: PiTextAlignJustify },
} satisfies Record<string, IconMapEntry>;

export type IconName = keyof typeof ICON_NAME_MAP;

/**
 * Quarter-turn rotation in degrees, applied uniformly via a CSS transform.
 * `0` is treated as no rotation.
 */
export type IconRotation = 0 | 90 | 180 | 270;

type IconProps = Omit<FontAwesomeIconProps, "icon" | "rotation"> & {
  type: IconName;
  rotation?: IconRotation;
};

const isReactIconsMapEntry = (entry: IconMapEntry): entry is ReactIconsMapEntry =>
  "library" in entry && entry.library === "react-icons";

/**
 * Merge a quarter-turn rotation into a caller-provided style, preserving any
 * existing `transform` / `transformOrigin` they may have set.
 */
const applyRotationStyle = (
  rotation: IconRotation | undefined,
  callerStyle: React.CSSProperties | undefined,
): React.CSSProperties | undefined => {
  if (!rotation) {
    return callerStyle;
  }
  const rotateTransform = `rotate(${rotation}deg)`;
  return {
    ...callerStyle,
    transform: callerStyle?.transform
      ? `${callerStyle.transform} ${rotateTransform}`
      : rotateTransform,
    // Top-level SVGs default to a center origin in modern browsers, but be
    // explicit so a 90° icon always pivots around its visual center.
    transformOrigin: callerStyle?.transformOrigin ?? "center",
  };
};

const Icon = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => {
  const { type, rotation, style: callerStyle, ...rest } = props;
  const mapEntry: IconMapEntry | undefined = ICON_NAME_MAP[type];
  if (!mapEntry) {
    throw new Error(`Unknown Icon type: "${String(type)}". Add it to ICON_NAME_MAP.`);
  }
  const style = applyRotationStyle(rotation, callerStyle);
  if (isReactIconsMapEntry(mapEntry)) {
    // react-icons v5 icon components are plain function components and do not
    // forward refs, so `ref` is intentionally not passed here. They accept
    // standard SVG props, so className/style (incl. rotation) and title apply.
    const ReactIconComponent = mapEntry.component;
    const { className, title } = rest as {
      className?: string;
      title?: string;
    };
    return <ReactIconComponent className={className} style={style} title={title} />;
  }
  // FontAwesomeIcon types `style` as `CSSProperties & CSSVariables` to support
  // `--fa-*` custom properties; a plain `CSSProperties` is fine at runtime.
  return (
    <FontAwesomeIcon
      ref={ref}
      {...mapEntry}
      {...rest}
      style={style as FontAwesomeIconProps["style"]}
    />
  );
});

export default Icon;
