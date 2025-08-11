// Utility for storing and restoring file browser paths in localStorage

export type PathContext = { kind: "remote"; hostname: string; protocol: string };

const KEY_PREFIX = "slycat:filebrowser:path";

export function buildStorageKey(context: PathContext): string {
  // Example: slycat:filebrowser:path:remote:ssh:example.com
  return `${KEY_PREFIX}:remote:${context.protocol}:${context.hostname}`;
}

export function savePath(context: PathContext, path: string): void {
  try {
    localStorage.setItem(buildStorageKey(context), path);
  } catch (err) {
    // Ignore storage failures (ex: Safari private mode)
  }
}

export function loadPath(context: PathContext): string | null {
  try {
    return localStorage.getItem(buildStorageKey(context));
  } catch (err) {
    return null;
  }
}
