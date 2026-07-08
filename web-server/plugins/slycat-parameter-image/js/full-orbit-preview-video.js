const FULL_ORBIT_PREVIEW_FILENAME = "fullorbitpreview.mp4";
const FULL_ORBIT_PREVIEW_GRID_SIZE = 11;
const FULL_ORBIT_PREVIEW_TIME_OFFSET = 0.1;
const MAX_TIME_EPSILON = 0.000001;

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
    return null;
  }

  const rect = videoElement.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (width <= 0 || height <= 0) {
    return null;
  }

  const x = clamp(mouseEvent.clientX - rect.left, 0, width);
  const y = clamp(mouseEvent.clientY - rect.top, 0, height);
  const perY = (height - y) / height;
  const perX = (width - x) / width;
  const segmentDuration = duration / FULL_ORBIT_PREVIEW_GRID_SIZE;
  const time =
    Math.round(perY * FULL_ORBIT_PREVIEW_GRID_SIZE) * segmentDuration +
    perX * segmentDuration -
    FULL_ORBIT_PREVIEW_TIME_OFFSET;

  return clamp(time, 0, Math.max(duration - MAX_TIME_EPSILON, 0));
}

export function installFullOrbitPreviewHover(videoElement) {
  const handleMouseMove = (event) => {
    if (videoElement.seeking) {
      return;
    }

    const time = calculateFullOrbitPreviewTime(videoElement, event);
    if (time == null || Math.abs(videoElement.currentTime - time) < MAX_TIME_EPSILON) {
      return;
    }

    videoElement.currentTime = time;
  };

  videoElement.addEventListener("mousemove", handleMouseMove);
  return () => videoElement.removeEventListener("mousemove", handleMouseMove);
}
