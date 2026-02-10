import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";

/* import all the free icons (Solid, Regular, and Brands) */
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";

library.add(fas, far, fab);

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
} satisfies Record<string, FontAwesomeIconProps>;

export type IconName = keyof typeof ICON_NAME_MAP;
type IconProps = Omit<FontAwesomeIconProps, "icon"> & { type: IconName };

const Icon = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => {
  const { type, ...rest } = props;
  const mapEntry = ICON_NAME_MAP[type];
  if (!mapEntry) {
    throw new Error(`Unknown Icon type: "${String(type)}". Add it to ICON_NAME_MAP.`);
  }
  return <FontAwesomeIcon ref={ref} {...mapEntry} {...rest} />;
});

export default Icon;
