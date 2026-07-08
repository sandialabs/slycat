const FULL_ORBIT_PREVIEW_FILENAME = "fullorbitpreview.mp4";
const FULL_ORBIT_PREVIEW_GRID_SIZE = 11;
const FULL_ORBIT_PREVIEW_TIME_OFFSET = 0.1;
const MAX_TIME_EPSILON = 0.000001;
const DEBUG_PREFIX = "[full-orbit-preview]";

export const FULL_ORBIT_PREVIEW_VIDEO_TYPE = "full-orbit";
export const FULL_ORBIT_PREVIEW_VIDEO_SELECTOR = `[data-preview-video='${FULL_ORBIT_PREVIEW_VIDEO_TYPE}']`;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

export function calculateFullOrbitPreviewTime(videoElement, mouseEvent) {
  const duration = Number(videoElement.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    console.debug(DEBUG_PREFIX, "invalid duration", { duration });
    return null;
  }

  const rect = videoElement.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (width <= 0 || height <= 0) {
    console.debug(DEBUG_PREFIX, "invalid video dimensions", { width, height });
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
    Math.floor(perY * FULL_ORBIT_PREVIEW_GRID_SIZE),
    0,
    FULL_ORBIT_PREVIEW_GRID_SIZE - 1,
  );
  const rowStartTime = rowIndex * segmentDuration;
  const unclampedTime = rowStartTime + perX * segmentDuration - FULL_ORBIT_PREVIEW_TIME_OFFSET;
  const time = clamp(unclampedTime, 0, Math.max(duration - MAX_TIME_EPSILON, 0));

  console.debug(DEBUG_PREFIX, "calculate time", {
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
    unclampedTime,
    time,
    currentTime: videoElement.currentTime,
    seeking: videoElement.seeking,
  });

  return time;
}

export function installFullOrbitPreviewHover(videoElement) {
  console.debug(DEBUG_PREFIX, "install hover", {
    src: videoElement.currentSrc || videoElement.src,
    duration: videoElement.duration,
  });

  const handleMouseMove = (event) => {
    if (videoElement.seeking) {
      console.debug(DEBUG_PREFIX, "skip mousemove: video seeking");
      return;
    }

    const previousTime = videoElement.currentTime;
    const time = calculateFullOrbitPreviewTime(videoElement, event);
    if (time == null) {
      console.debug(DEBUG_PREFIX, "skip mousemove: no time calculated");
      return;
    }

    const delta = Math.abs(previousTime - time);
    if (delta < MAX_TIME_EPSILON) {
      console.debug(DEBUG_PREFIX, "skip mousemove: time unchanged", {
        previousTime,
        time,
        delta,
      });
      return;
    }

    console.debug(DEBUG_PREFIX, "set currentTime", {
      previousTime,
      time,
      delta,
    });
    videoElement.currentTime = time;
  };

  videoElement.addEventListener("mousemove", handleMouseMove);
  return () => videoElement.removeEventListener("mousemove", handleMouseMove);
}
