const FULL_ORBIT_PREVIEW_FILENAME = "fullorbitpreview.mp4";
const FULL_ORBIT_PREVIEW_GRID_SIZE = 11;
const FULL_ORBIT_PREVIEW_TIME_OFFSET = 0.1;

export const FULL_ORBIT_PREVIEW_VIDEO_TYPE = "full-orbit";
export const FULL_ORBIT_PREVIEW_VIDEO_SELECTOR = `[data-preview-video='${FULL_ORBIT_PREVIEW_VIDEO_TYPE}']`;

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
  const rect = videoElement.getBoundingClientRect();
  const x = mouseEvent.clientX - rect.left;
  const width = rect.width;
  const y = mouseEvent.clientY - rect.top;
  const height = rect.height;

  const duration = videoElement.duration || 0;
  const perY = (height - y) / height;
  const perX = (width - x) / width;

  return (
    Math.round(perY * FULL_ORBIT_PREVIEW_GRID_SIZE) * (duration / FULL_ORBIT_PREVIEW_GRID_SIZE) +
    perX * (duration / FULL_ORBIT_PREVIEW_GRID_SIZE) -
    FULL_ORBIT_PREVIEW_TIME_OFFSET
  );
}

export function installFullOrbitPreviewHover(videoElement) {
  const handleMouseMove = (event) => {
    if (videoElement.seeking) {
      return;
    }

    videoElement.currentTime = calculateFullOrbitPreviewTime(videoElement, event);
  };

  videoElement.addEventListener("mousemove", handleMouseMove);
  return () => videoElement.removeEventListener("mousemove", handleMouseMove);
}
