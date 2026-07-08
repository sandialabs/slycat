const FULL_ORBIT_PREVIEW_FILENAME = "fullorbitpreview.mp4";
const FULL_ORBIT_PREVIEW_GRID_SIZE = 11;
const MAX_TIME_EPSILON = 0.000001;
const DEBUG = false;
const DEBUG_PREFIX = "[full-orbit-preview]";

export const FULL_ORBIT_PREVIEW_DEFAULT_TIME = 0;
export const FULL_ORBIT_PREVIEW_VIDEO_TYPE = "full-orbit";
export const FULL_ORBIT_PREVIEW_VIDEO_SELECTOR = `[data-preview-video='${FULL_ORBIT_PREVIEW_VIDEO_TYPE}']`;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function debugLog(...args) {
  if (DEBUG) {
    console.debug(DEBUG_PREFIX, ...args);
  }
}

function getBasename(uri) {
  if (typeof uri !== "string") {
    return "";
  }
  return uri.split(/[?#]/)[0].split(/[\\/]/).pop();
}

export function isFullOrbitPreviewVideo(uri) {
  return getBasename(uri).toLowerCase().endsWith(FULL_ORBIT_PREVIEW_FILENAME);
}

/**
 * Map pointer position to a seek time in a full-orbit preview video.
 *
 * The timeline is split into 11 equal segments (camera elevations). Within each
 * segment, horizontal scrubbing simulates rotation around the object:
 *   - Y (up/down): selects which of the 11 sequences
 *   - X (right-to-left): position within the selected sequence
 */
export function calculateFullOrbitPreviewTime(videoElement, mouseEvent) {
  const duration = Number(videoElement.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    debugLog("invalid duration", { duration });
    return null;
  }

  const rect = videoElement.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (width <= 0 || height <= 0) {
    debugLog("invalid video dimensions", { width, height });
    return null;
  }

  const rawX = mouseEvent.clientX - rect.left;
  const rawY = mouseEvent.clientY - rect.top;
  const x = clamp(rawX, 0, width);
  const y = clamp(rawY, 0, height);
  const perY = (height - y) / height;
  const perX = (width - x) / width;
  const segmentDuration = duration / FULL_ORBIT_PREVIEW_GRID_SIZE;
  const rowIndex = clamp(
    Math.round(perY * FULL_ORBIT_PREVIEW_GRID_SIZE),
    0,
    FULL_ORBIT_PREVIEW_GRID_SIZE - 1,
  );
  const rowStartTime = rowIndex * segmentDuration;
  const rowEndTime = rowStartTime + segmentDuration - MAX_TIME_EPSILON;
  const timeInSegment = perX * segmentDuration;
  const time = clamp(rowStartTime + timeInSegment, rowStartTime, rowEndTime);

  debugLog("calculate time", {
    rawX,
    rawY,
    x,
    y,
    width,
    height,
    perX,
    perY,
    duration,
    segmentDuration,
    rowIndex,
    rowStartTime,
    rowEndTime,
    timeInSegment,
    time,
    currentTime: videoElement.currentTime,
    seeking: videoElement.seeking,
  });

  return time;
}

export function installFullOrbitPreviewHover(videoElement) {
  debugLog("install hover", {
    src: videoElement.currentSrc || videoElement.src,
    duration: videoElement.duration,
  });

  const resetToDefaultFrame = () => {
    if (videoElement.seeking) {
      debugLog("skip mouseleave: video seeking");
      return;
    }

    if (Math.abs(videoElement.currentTime - FULL_ORBIT_PREVIEW_DEFAULT_TIME) < MAX_TIME_EPSILON) {
      debugLog("skip mouseleave: already at default frame");
      return;
    }

    debugLog("reset to default frame", {
      previousTime: videoElement.currentTime,
      time: FULL_ORBIT_PREVIEW_DEFAULT_TIME,
    });
    videoElement.currentTime = FULL_ORBIT_PREVIEW_DEFAULT_TIME;
  };

  const handleMouseMove = (event) => {
    if (videoElement.seeking) {
      debugLog("skip mousemove: video seeking");
      return;
    }

    const previousTime = videoElement.currentTime;
    const time = calculateFullOrbitPreviewTime(videoElement, event);
    if (time == null) {
      debugLog("skip mousemove: no time calculated");
      return;
    }

    const delta = Math.abs(previousTime - time);
    if (delta < MAX_TIME_EPSILON) {
      debugLog("skip mousemove: time unchanged", {
        previousTime,
        time,
        delta,
      });
      return;
    }

    debugLog("set currentTime", {
      previousTime,
      time,
      delta,
    });
    videoElement.currentTime = time;
  };

  videoElement.addEventListener("mousemove", handleMouseMove);
  videoElement.addEventListener("mouseleave", resetToDefaultFrame);

  return () => {
    videoElement.removeEventListener("mousemove", handleMouseMove);
    videoElement.removeEventListener("mouseleave", resetToDefaultFrame);
  };
}
