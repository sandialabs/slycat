import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/*
 * Font Awesome 7 icons via `@fortawesome/free-*-svg-icons`.
 *
 * Import each icon from its pack subpath so webpack tree-shakes unused glyphs.
 * Do not use `library.add(fas|far|fab)` — that registers entire icon packs.
 *
 * Example:
 *   import { faTrashCan } from "@fortawesome/free-solid-svg-icons/faTrashCan";
 *   // ...then in ICON_NAME_MAP:
 *   "trash-can": { icon: faTrashCan },
 */
import { faArrowDownShortWide } from "@fortawesome/free-solid-svg-icons/faArrowDownShortWide";
import { faArrowDownWideShort } from "@fortawesome/free-solid-svg-icons/faArrowDownWideShort";
import { faBackwardFast } from "@fortawesome/free-solid-svg-icons/faBackwardFast";
import { faBackwardStep } from "@fortawesome/free-solid-svg-icons/faBackwardStep";
import { faCrosshairs } from "@fortawesome/free-solid-svg-icons/faCrosshairs";
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons/faEllipsisVertical";
import { faFastForward } from "@fortawesome/free-solid-svg-icons/faFastForward";
import { faFolder } from "@fortawesome/free-solid-svg-icons/faFolder";
import { faForwardStep } from "@fortawesome/free-solid-svg-icons/faForwardStep";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { faPause } from "@fortawesome/free-solid-svg-icons/faPause";
import { faPencil } from "@fortawesome/free-solid-svg-icons/faPencil";
import { faPlay } from "@fortawesome/free-solid-svg-icons/faPlay";
import { faTable } from "@fortawesome/free-solid-svg-icons/faTable";
import { faThumbtack } from "@fortawesome/free-solid-svg-icons/faThumbtack";
import { faToggleOn } from "@fortawesome/free-solid-svg-icons/faToggleOn";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons/faTrashCan";
import { faTurnUp } from "@fortawesome/free-solid-svg-icons/faTurnUp";
import { faUpload } from "@fortawesome/free-solid-svg-icons/faUpload";
import { faClone } from "@fortawesome/free-regular-svg-icons/faClone";
import { faFile } from "@fortawesome/free-regular-svg-icons/faFile";
import { faWindowMaximize } from "@fortawesome/free-regular-svg-icons/faWindowMaximize";
import { faWindowMinimize } from "@fortawesome/free-regular-svg-icons/faWindowMinimize";

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
import { PiTextAlignJustify, PiTextColumns, PiRulerBold } from "react-icons/pi";
import type { IconType } from "react-icons";

type FontAwesomeMapEntry = { icon: IconDefinition };
type ReactIconsMapEntry = { library: "react-icons"; component: IconType };
type IconMapEntry = FontAwesomeMapEntry | ReactIconsMapEntry;

export const ICON_NAME_MAP = {
  "trash-can": { icon: faTrashCan },
  gear: { icon: faGear },
  download: { icon: faDownload },
  upload: { icon: faUpload },
  "backward-fast": { icon: faBackwardFast },
  "backward-step": { icon: faBackwardStep },
  play: { icon: faPlay },
  pause: { icon: faPause },
  "forward-step": { icon: faForwardStep },
  "fast-forward": { icon: faFastForward },
  pencil: { icon: faPencil },
  "turn-up": { icon: faTurnUp },
  folder: { icon: faFolder },
  file: { icon: faFile },
  "toggle-on": { icon: faToggleOn },
  "window-maximize": { icon: faWindowMaximize },
  "window-minimize": { icon: faWindowMinimize },
  clone: { icon: faClone },
  table: { icon: faTable },
  crosshairs: { icon: faCrosshairs },
  "ellipsis-vertical": { icon: faEllipsisVertical },
  thumbtack: { icon: faThumbtack },
  // sort icons
  "arrow-down-wide-short": { icon: faArrowDownWideShort },
  "arrow-down-short-wide": { icon: faArrowDownShortWide },
  // react-icons icons
  "text-columns": { library: "react-icons", component: PiTextColumns },
  "text-align-justify": { library: "react-icons", component: PiTextAlignJustify },
  ruler: { library: "react-icons", component: PiRulerBold },
} satisfies Record<string, IconMapEntry>;

export type IconName = keyof typeof ICON_NAME_MAP;

/**
 * Rotation in degrees (45° steps), applied uniformly via a CSS transform.
 * `0` is treated as no rotation.
 */
export type IconRotation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

type IconProps = Omit<FontAwesomeIconProps, "icon" | "rotation"> & {
  type: IconName;
  rotation?: IconRotation;
};

const isReactIconsMapEntry = (entry: IconMapEntry): entry is ReactIconsMapEntry =>
  "library" in entry && entry.library === "react-icons";

/**
 * Merge a rotation into a caller-provided style, preserving any
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
    // explicit so a rotated icon always pivots around its visual center.
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
      icon={mapEntry.icon}
      {...rest}
      style={style as FontAwesomeIconProps["style"]}
    />
  );
});

export default Icon;
