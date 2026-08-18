import React, { useLayoutEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { truncateString } from "js/slycat-string-truncate";
import { measureCssText } from "js/slycat-html-text";
import { selectFontFamily, selectFontSize } from "../scatterplotSlice";
import { RootState } from "../store";

const TIME_LABEL_LEFT_PX = 6;
const TIME_LABEL_RIGHT_PAD_PX = 8;
const SCALAR_BAR_GUTTER_MIN_PX = 80;
const SCALAR_BAR_GUTTER_FONT_FACTOR = 6;

interface VtpTimeLabelProps {
  timeValue: number;
  uid: string;
  className?: string;
}

function formatTimeLabel(timeValue: number): string {
  return `Time: ${timeValue}`;
}

function timeLabelMaxWidth(
  containerWidth: number,
  legendVisible: boolean,
  fontSize: number,
): number {
  const legendGutter = legendVisible
    ? Math.max(SCALAR_BAR_GUTTER_MIN_PX, fontSize * SCALAR_BAR_GUTTER_FONT_FACTOR)
    : 0;
  return Math.max(
    0,
    containerWidth - TIME_LABEL_LEFT_PX - TIME_LABEL_RIGHT_PAD_PX - legendGutter,
  );
}

/**
 * Overlay showing a VTP file's TimeValue in the top-left of the 3D viewer.
 * Truncates from the end to stay within the viewer and clear of the scalar bar.
 */
export const VtpTimeLabel: React.FC<VtpTimeLabelProps> = ({
  timeValue,
  uid,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const fullText = formatTimeLabel(timeValue);
  const [text, setText] = useState(fullText);
  const fontSize = useSelector(selectFontSize);
  const fontFamily = useSelector(selectFontFamily);
  const showLegends = useSelector((state: RootState) => state.show_threeD_legends);
  const colorBy = useSelector((state: RootState) => state.three_d_colorvars?.[uid]);
  const legendVisible = Boolean(showLegends && colorBy && colorBy !== ":");

  useLayoutEffect(() => {
    const node = ref.current;
    const container = node?.closest(".vtp");
    if (!node || !(container instanceof HTMLElement)) {
      return;
    }

    const update = () => {
      const measure = measureCssText(getComputedStyle(node));
      const maxWidth = timeLabelMaxWidth(
        container.clientWidth,
        legendVisible,
        fontSize,
      );
      const next = truncateString(fullText, {
        maxWidth,
        measure,
        position: "end",
      });
      setText(next);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [fullText, fontSize, fontFamily, legendVisible]);

  const truncated = text !== fullText;

  return (
    <div
      ref={ref}
      className={`vtp-time-label ${className}`}
      title={truncated ? fullText : undefined}
      style={truncated ? { pointerEvents: "auto" } : undefined}
    >
      {text}
    </div>
  );
};
