const FULL_ORBIT_PREVIEW_FILENAME = "fullorbitpreview.mp4";
const FULL_ORBIT_PREVIEW_GRID_SIZE = 11;
// Each sequence begins with static preview frames before the orbit scrub range.
const PREVIEW_FRAME_COUNT = 3;
const PREVIEW_FRAME_RATE = 25;
const PREVIEW_SKIP_DURATION = PREVIEW_FRAME_COUNT / PREVIEW_FRAME_RATE;
const MAX_TIME_EPSILON = 0.000001;

export const FULL_ORBIT_PREVIEW_DEFAULT_TIME = 0;
export const FULL_ORBIT_PREVIEW_VIDEO_TYPE = "full-orbit";
export const FULL_ORBIT_PREVIEW_VIDEO_SELECTOR = `[data-preview-video='${FULL_ORBIT_PREVIEW_VIDEO_TYPE}']`;
const HOVER_CLEANUP_KEY = "_fullOrbitPreviewHoverCleanup";

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

/**
 * Map pointer position to a seek time in a full-orbit preview video.
 *
 * The timeline is split into 11 equal segments (camera elevations). Each
 * sequence begins with 3 preview frames at 25 fps; horizontal scrubbing skips
 * that prefix and maps across the remaining orbit frames only.
 *   - Y (up/down): selects which of the 11 sequences
 *   - X (right-to-left): position within the selected sequence
 */
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
  const previewSkip = Math.min(PREVIEW_SKIP_DURATION, Math.max(segmentDuration - MAX_TIME_EPSILON, 0));
  const scrubbableDuration = Math.max(segmentDuration - previewSkip, 0);
  const segmentMinTime = rowStartTime + previewSkip;
  const timeInSegment = previewSkip + perX * scrubbableDuration;
  const time = clamp(rowStartTime + timeInSegment, segmentMinTime, rowEndTime);

  return time;
}

export function uninstallFullOrbitPreviewHover(videoElement) {
  const cleanup = videoElement[HOVER_CLEANUP_KEY];
  if (typeof cleanup === "function") {
    cleanup();
  }
}

export function installFullOrbitPreviewHover(videoElement) {
  uninstallFullOrbitPreviewHover(videoElement);

  let hovering = false;

  const showDefaultFrame = () => {
    videoElement.currentTime = FULL_ORBIT_PREVIEW_DEFAULT_TIME;
  };

  const handleMouseEnter = () => {
    hovering = true;
  };

  const handleMouseLeave = () => {
    hovering = false;
    showDefaultFrame();
  };

  const handleSeeked = () => {
    if (!hovering) {
      showDefaultFrame();
    }
  };

  const handleMouseMove = (event) => {
    hovering = true;

    if (videoElement.seeking) {
      return;
    }

    const previousTime = videoElement.currentTime;
    const time = calculateFullOrbitPreviewTime(videoElement, event);
    if (time == null) {
      return;
    }

    if (Math.abs(previousTime - time) < MAX_TIME_EPSILON) {
      return;
    }

    videoElement.currentTime = time;
  };

  videoElement.addEventListener("mouseenter", handleMouseEnter);
  videoElement.addEventListener("mousemove", handleMouseMove);
  videoElement.addEventListener("mouseleave", handleMouseLeave);
  videoElement.addEventListener("seeked", handleSeeked);

  const cleanup = () => {
    hovering = false;
    videoElement.removeEventListener("mouseenter", handleMouseEnter);
    videoElement.removeEventListener("mousemove", handleMouseMove);
    videoElement.removeEventListener("mouseleave", handleMouseLeave);
    videoElement.removeEventListener("seeked", handleSeeked);
    delete videoElement[HOVER_CLEANUP_KEY];
  };

  videoElement[HOVER_CLEANUP_KEY] = cleanup;
  return cleanup;
}
