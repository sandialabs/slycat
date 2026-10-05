const FULL_ORBIT_PREVIEW_FILENAME = "fullorbitpreview.mp4";
const SEQUENCE_COUNT = 11;
const PREVIEW_FRAME_COUNT = 3;
const PREVIEW_FRAME_RATE = 25;
// Used as (a) the global preview at t=0 and (b) an end-of-row margin so seeks
// do not land on the next sequence boundary.
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
 * The video is split into SEQUENCE_COUNT equal sequences. The first
 * PREVIEW_FRAME_COUNT frames at PREVIEW_FRAME_RATE fps are a static preview at
 * time 0. Horizontal scrubbing is continuous within each sequence, mapped
 * between the sequence start (skipping the preview in sequence 0) and
 * PREVIEW_SKIP_DURATION before the next sequence.
 *   - Y (up/down): selects which of the sequences
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
  const previewSkip = Math.min(PREVIEW_SKIP_DURATION, duration);
  const segmentDuration = duration / SEQUENCE_COUNT;
  const rowIndex = clamp(Math.round(perY * SEQUENCE_COUNT), 0, SEQUENCE_COUNT - 1);
  const rowStartTime = rowIndex * segmentDuration;
  const segmentMaxTime = rowStartTime + segmentDuration - previewSkip;
  const segmentMinTime =
    rowIndex === 0 ? Math.max(previewSkip, rowStartTime) : rowStartTime;
  const scrubbableDuration = Math.max(segmentMaxTime - segmentMinTime, 0);
  const time = clamp(
    segmentMinTime + perX * scrubbableDuration,
    segmentMinTime,
    segmentMaxTime,
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

  videoElement.addEventListener("mousemove", handleMouseMove);
  videoElement.addEventListener("mouseleave", handleMouseLeave);
  videoElement.addEventListener("seeked", handleSeeked);

  const cleanup = () => {
    hovering = false;
    videoElement.removeEventListener("mousemove", handleMouseMove);
    videoElement.removeEventListener("mouseleave", handleMouseLeave);
    videoElement.removeEventListener("seeked", handleSeeked);
    delete videoElement[HOVER_CLEANUP_KEY];
  };

  videoElement[HOVER_CLEANUP_KEY] = cleanup;
  return cleanup;
}
