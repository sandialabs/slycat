import { useState, useCallback } from "react";
import { FileMetaData, FileBrowserConfig } from "./FileBrowserTypes";

/**
 * Return type for useFileBrowser hook
 */
interface UseFileBrowserReturn {
  // State
  path: string;
  pathInput: string;
  rawFiles: FileMetaData[];
  pathError: boolean;
  browseError: boolean;
  browserUpdating: boolean;
  selected: number;

  // State setters
  setPath: (value: string) => void;
  setPathInput: (value: string) => void;
  setSelected: (value: number) => void;

  // Actions
  clearErrors: () => void;
  startBrowsing: () => void;
  completeBrowsing: (files: FileMetaData[], newPath: string) => void;
  handleBrowseError: (currentPath: string, targetPath: string, status?: number) => void;
  selectRow: (file: FileMetaData, index: number, fullPath: string) => void;
  createFileList: (results: any, currentPath: string, isHDF5?: boolean) => FileMetaData[];
  getFilteredFiles: (filterFn?: (file: FileMetaData) => boolean) => FileMetaData[];
  loadStoredPath: () => string | null;
}

/**
 * Main file browser hook that manages shared state and common logic
 */
export function useFileBrowser(config: FileBrowserConfig): UseFileBrowserReturn {
  const [path, setPath] = useState(config.defaultPath);
  const [pathInput, setPathInput] = useState(config.defaultPath);
  const [rawFiles, setRawFiles] = useState<FileMetaData[]>([]);
  const [pathError, setPathError] = useState(false);
  const [browseError, setBrowseError] = useState(false);
  const [browserUpdating, setBrowserUpdating] = useState(false);
  const [selected, setSelected] = useState(-1);

  const persistenceId = config.persistenceId ?? "";

  /**
   * Resets error states
   */
  const clearErrors = useCallback(() => {
    setPathError(false);
    setBrowseError(false);
  }, []);

  /**
   * Sets loading state and resets selection
   */
  const startBrowsing = useCallback(() => {
    setRawFiles([]);
    setBrowserUpdating(true);
    setSelected(-1);
    clearErrors();
  }, [clearErrors]);

  /**
   * Completes browsing operation
   */
  const completeBrowsing = useCallback(
    (files: FileMetaData[], newPath: string) => {
      setRawFiles(files);
      setPath(newPath);
      setPathInput(newPath);
      setBrowserUpdating(false);

      // Store path in localStorage
      localStorage.setItem(
        "slycat-remote-browser-path-" + persistenceId + config.hostname,
        newPath,
      );
    },
    [persistenceId, config.hostname],
  );

  /**
   * Handles browse errors
   */
  const handleBrowseError = useCallback(
    (currentPath: string, targetPath: string, status?: number) => {
      if (currentPath !== targetPath) {
        setPathError(true);
      }
      if (status === 400) {
        alert("bad file path");
      }
      setBrowseError(true);
      setBrowserUpdating(false);
    },
    [],
  );

  /**
   * Select a file row and call the callback
   */
  const selectRow = useCallback((file: FileMetaData, index: number, fullPath: string) => {
    setSelected(index);
  }, []);

  /**
   * Creates file list with parent directory entry if needed
   */
  const createFileList = useCallback(
    (results: any, currentPath: string, isHDF5 = false): FileMetaData[] => {
      const files: FileMetaData[] = [];

      // Add parent directory entry if not at root
      const isAtRoot = isHDF5 ? currentPath === "//" : currentPath === "/";
      if (!isAtRoot) {
        files.push({
          type: "",
          name: "..",
          size: "",
          mtime: "",
          mimeType: "application/x-directory",
        });
      }

      // Add files from results
      const names = isHDF5 ? results.name : results.names;
      const sizes = isHDF5 ? results.sizes : results.sizes;
      const types = isHDF5 ? results.types : results.types;
      const mtimes = isHDF5 ? results.mtimes : results.mtimes;
      const mimeTypes = isHDF5 ? results["mime-types"] : results["mime-types"];

      for (let i = 0; i < names.length; i++) {
        files.push({
          name: names[i],
          size: sizes[i],
          type: types[i],
          mtime: mtimes[i],
          mimeType: mimeTypes[i],
        });
      }

      return files;
    },
    [],
  );

  /**
   * Returns filtered file list
   */
  const getFilteredFiles = useCallback(
    (filterFn?: (file: FileMetaData) => boolean): FileMetaData[] => {
      return rawFiles.filter((file) => !filterFn || filterFn(file));
    },
    [rawFiles],
  );

  /**
   * Loads stored path from localStorage
   */
  const loadStoredPath = useCallback((): string | null => {
    return localStorage.getItem("slycat-remote-browser-path-" + persistenceId + config.hostname);
  }, [persistenceId, config.hostname]);

  return {
    // State
    path,
    pathInput,
    rawFiles,
    pathError,
    browseError,
    browserUpdating,
    selected,

    // State setters
    setPath,
    setPathInput,
    setSelected,

    // Actions
    clearErrors,
    startBrowsing,
    completeBrowsing,
    handleBrowseError,
    selectRow,
    createFileList,
    getFilteredFiles,
    loadStoredPath,
  };
}
