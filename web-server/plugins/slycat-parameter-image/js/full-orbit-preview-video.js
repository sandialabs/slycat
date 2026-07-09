const FULL_ORBIT_PREVIEW_FILENAME = "fullorbitpreview.mp4";
const FULL_ORBIT_PREVIEW_GRID_SIZE = 11;
// The video opens with static preview frames before the orbit scrub range.
const PREVIEW_FRAME_COUNT = 3;
const PREVIEW_FRAME_RATE = 25;
const PREVIEW_SKIP_DURATION = PREVIEW_FRAME_COUNT / PREVIEW_FRAME_RATE;
const FRAME_DURATION = 1 / PREVIEW_FRAME_RATE;
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
 * The video is split into 11 equal segments. The first 3 frames at 25 fps at
 * time 0 are a global preview image; horizontal scrubbing in the first segment
 * skips that prefix. Row ends are clamped to one frame duration so seeks do
 * not snap into the next segment.
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
  const previewSkip = Math.min(
    PREVIEW_SKIP_DURATION,
    Math.max(duration - FRAME_DURATION, 0),
  );
  const segmentDuration = duration / FULL_ORBIT_PREVIEW_GRID_SIZE;
  const rowIndex = clamp(
    Math.round(perY * FULL_ORBIT_PREVIEW_GRID_SIZE),
    0,
    FULL_ORBIT_PREVIEW_GRID_SIZE - 1,
  );
  const rowStartTime = rowIndex * segmentDuration;
  const rowEndTime = Math.min(
    rowStartTime + segmentDuration - FRAME_DURATION,
    duration - FRAME_DURATION,
  );
  const segmentMinTime =
    rowIndex === 0 ? Math.min(previewSkip, rowEndTime) : rowStartTime;
  const scrubbableDuration = Math.max(rowEndTime - segmentMinTime, 0);
  const time = clamp(
    segmentMinTime + perX * scrubbableDuration,
    segmentMinTime,
    rowEndTime,
  );

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

  const isAtDefaultFrame = () =>
    Math.abs(videoElement.currentTime - FULL_ORBIT_PREVIEW_DEFAULT_TIME) < MAX_TIME_EPSILON;

  const showDefaultFrame = () => {
    if (isAtDefaultFrame()) {
      return;
    }
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
