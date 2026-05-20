import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";

/* import all the free icons (Solid, Regular, and Brands) */
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";

/*
 * Bootstrap Icons via `react-bootstrap-icons`.
 *
 * The whole icon pack is imported as a namespace so registering a Bootstrap
 * icon only requires adding an entry to ICON_NAME_MAP below — no extra
 * per-icon import. Use the PascalCase form of the icon name from
 * https://icons.getbootstrap.com/ as the `name` (e.g. "arrow-down" ->
 * `ArrowDown`; names starting with a digit are prefixed with `Icon`, e.g.
 * "1-circle" -> `Icon1Circle`). The `name` field is typed against the
 * library's exports so TypeScript will autocomplete valid icon names and
 * reject typos.
 *
 * Example:
 *   alarm: { library: "bootstrap", name: "Alarm" },
 */
import * as BootstrapIcons from "react-bootstrap-icons";
import type { IconProps as BootstrapIconProps } from "react-bootstrap-icons";

library.add(fas, far, fab);

/**
 * Names of every icon component exported by `react-bootstrap-icons`.
 * `keyof typeof BootstrapIcons` only sees value-space exports, so the
 * library's type-only exports (`Icon`, `IconProps`) are excluded.
 */
type BootstrapIconName = keyof typeof BootstrapIcons;

type FontAwesomeMapEntry = FontAwesomeIconProps;
type BootstrapMapEntry = { library: "bootstrap"; name: BootstrapIconName };
type IconMapEntry = FontAwesomeMapEntry | BootstrapMapEntry;

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
  // Bootstrap icons
  "layout-three-columns": { library: "bootstrap", name: "LayoutThreeColumns" },
} satisfies Record<string, IconMapEntry>;

export type IconName = keyof typeof ICON_NAME_MAP;

/**
 * Quarter-turn rotation in degrees, applied uniformly to FontAwesome and
 * Bootstrap icons via a CSS transform. `0` is treated as no rotation.
 */
export type IconRotation = 0 | 90 | 180 | 270;

type IconProps = Omit<FontAwesomeIconProps, "icon" | "rotation"> & {
  type: IconName;
  rotation?: IconRotation;
};

const isBootstrapMapEntry = (entry: IconMapEntry): entry is BootstrapMapEntry =>
  "library" in entry && entry.library === "bootstrap";

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
  if (isBootstrapMapEntry(mapEntry)) {
    // react-bootstrap-icons' published types use FC<IconProps>, but the icons
    // are implemented with React.forwardRef, so refs are forwarded at runtime.
    const BootstrapIconComponent = BootstrapIcons[
      mapEntry.name
    ] as React.ForwardRefExoticComponent<
      BootstrapIconProps & React.RefAttributes<SVGSVGElement>
    >;
    // react-bootstrap-icons components only understand a small set of props;
    // forward just the ones that are type-compatible with both libraries.
    const { className, title } = rest as {
      className?: string;
      title?: string;
    };
    return (
      <BootstrapIconComponent
        ref={ref}
        className={className}
        style={style}
        title={title}
      />
    );
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
