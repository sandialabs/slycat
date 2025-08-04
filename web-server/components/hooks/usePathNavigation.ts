import { useCallback } from "react";
import { BrowserType } from "../FileBrowserTypes";

/**
 * Hook that handles path navigation and manipulation for different browser types
 */
export function usePathNavigation(type: BrowserType) {
  /**
   * Convert internal path to display path for user interface
   * HDF5 uses // internally but shows / to users
   */
  const pathToDisplay = useCallback(
    (internalPath: string): string => {
      if (type === "hdf5" && internalPath.startsWith("//")) {
        return internalPath.substring(1);
      }
      return internalPath;
    },
    [type],
  );

  /**
   * Convert user input path to internal path for internal logic
   * HDF5 needs // prefix internally
   */
  const pathFromDisplay = useCallback(
    (displayPath: string): string => {
      if (type === "hdf5") {
        if (displayPath === "/" || displayPath === "") {
          return "//";
        }
        // If user enters a path starting with single /, convert to //
        if (displayPath.startsWith("/") && !displayPath.startsWith("//")) {
          return "/" + displayPath;
        }
      }
      return displayPath;
    },
    [type],
  );

  /**
   * Get the parent directory path
   */
  const pathDirname = useCallback(
    (path: string): string => {
      let new_path = path.replace(/\/\.?(\w|\-|\.)*\/?$/, "");
      if (new_path === "") {
        new_path = type === "hdf5" ? "//" : "/";
      }
      return new_path;
    },
    [type],
  );

  /**
   * Join two path segments
   */
  const pathJoin = useCallback((left: string, right: string): string => {
    let new_path = left;
    if (new_path.slice(-1) !== "/") {
      new_path += "/";
    }
    new_path += right;
    return new_path;
  }, []);

  /**
   * Get the default/root path for this browser type
   */
  const getDefaultPath = useCallback((): string => {
    return type === "hdf5" ? "//" : "/";
  }, [type]);

  /**
   * Normalize path for API calls (HDF5 specific transformation)
   */
  const normalizePathForAPI = useCallback(
    (path: string): string => {
      if (type === "hdf5") {
        // Ensure path starts with /
        let first_char = Array.from(path)[0];
        if (first_char !== "/") {
          path = "/" + path;
        }
        // Replace slashes with dashes except the first one for HDF5 API
        return path.replace(/(?!^)\//g, "-");
      }
      return path;
    },
    [type],
  );

  /**
   * Handle navigation up from current path (HDF5 specific logic)
   */
  const browseUpDirectory = useCallback(
    (currentPath: string): string => {
      if (type === "hdf5") {
        let split_path = currentPath.split("/");
        let parent_directory = "";
        for (let i = 1; i < split_path.length - 1; i++) {
          parent_directory = parent_directory + "/" + split_path[i];
        }
        if (parent_directory === "/" || parent_directory === "") {
          parent_directory = "//";
        }
        return parent_directory;
      } else {
        return pathDirname(currentPath);
      }
    },
    [type, pathDirname],
  );

  /**
   * Handle navigation based on file selection (handles .. and directory navigation)
   */
  const navigateToFile = useCallback(
    (
      fileName: string,
      fileType: string,
      currentPath: string,
    ): { shouldNavigate: boolean; newPath: string } => {
      // Handle parent directory navigation
      if (fileName === "..") {
        return {
          shouldNavigate: true,
          newPath: type === "hdf5" ? browseUpDirectory(currentPath) : pathDirname(currentPath),
        };
      }

      // Handle directory navigation
      if (fileType === "d") {
        if (type === "hdf5") {
          let new_path = "";
          if (currentPath === "//") {
            new_path = currentPath.substring(1) + fileName;
          } else {
            new_path = currentPath + "/" + fileName;
          }
          // Clean up double slashes
          let substr = new_path.substring(0, 2);
          if (substr === "//") {
            new_path = new_path.substring(1);
          }
          return { shouldNavigate: true, newPath: new_path };
        } else {
          return { shouldNavigate: true, newPath: pathJoin(currentPath, fileName) };
        }
      }

      // Not a navigable item
      return { shouldNavigate: false, newPath: currentPath };
    },
    [type, pathDirname, pathJoin, browseUpDirectory],
  );

  /**
   * Build full file path for selection callback
   */
  const buildFilePath = useCallback(
    (currentPath: string, fileName: string): string => {
      const path_split = currentPath.split("/");

      // If the user types out the full path, including file name,
      // we don't want to join the file name with the path
      // (resulting in duplicate file names).
      if (path_split[path_split.length - 1] !== fileName) {
        if (type === "hdf5") {
          return currentPath + "/" + fileName;
        } else {
          return pathJoin(currentPath, fileName);
        }
      }

      return currentPath;
    },
    [type, pathJoin],
  );

  return {
    pathToDisplay,
    pathFromDisplay,
    pathDirname,
    pathJoin,
    getDefaultPath,
    normalizePathForAPI,
    browseUpDirectory,
    navigateToFile,
    buildFilePath,
  };
}
