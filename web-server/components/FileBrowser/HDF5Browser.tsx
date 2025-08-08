import * as React from "react";
import { useEffect, useCallback } from "react";
import { Option } from "components/SlycatSelector";
import FileBrowserPathInput from "./FileBrowserPathInput";
import FileBrowserTable from "./FileBrowserTable";
import { useFileBrowser } from "./useFileBrowser";
import { useBrowseAPI } from "./useBrowseAPI";
import { usePathNavigation } from "./usePathNavigation";
import { FileMetaData } from "./FileBrowserTypes";

/**
 * @member hostname name of the host we are connecting
 * (assumes we have a connection already to the host)
 * @member persistenceId uuid for local storage
 * @member onSelectFileCallBack called every time a file is selected
 * returns the files info (path, file.type, file:FileMetaData)
 * @member onSelectParserCallBack called every time a parser is selected
 * returns the parser type
 * @member onReauthCallBack called every time we lose connection to the host
 * @export
 * @interface HDF5BrowserProps
 */
export interface HDF5BrowserProps {
  hostname: string;
  persistenceId?: string;
  onSelectFileCallBack: Function;
  onSelectParserCallBack: Function;
  onReauthCallBack: Function;
  pid: string;
  mid: string;
}

/**
 * used to create a file browsing window like using 'ls' and 'cd' in a linux terminal
 *
 * @export
 * @param props HDF5BrowserProps
 */
export default function HDF5Browser(props: HDF5BrowserProps) {
  // Initialize hooks
  const fileBrowser = useFileBrowser({
    type: "hdf5",
    defaultPath: "//",
    hostname: props.hostname,
    persistenceId: props.persistenceId,
  });

  const browseAPI = useBrowseAPI("hdf5");
  const pathNav = usePathNavigation("hdf5");

  /**
   * Browse files using the HDF5 API
   */
  const browse = useCallback(
    async (pathInput: string) => {
      try {
        const normalizedPath = pathNav.normalizePathForAPI(pathInput);

        fileBrowser.startBrowsing();
        fileBrowser.setPath(pathInput);
        fileBrowser.setPathInput(pathInput);

        try {
          const results = await browseAPI.browse({
            hostname: props.hostname,
            path: normalizedPath,
            pid: props.pid,
            mid: props.mid,
          });

          const files = fileBrowser.createFileList(results, pathInput, true);
          fileBrowser.completeBrowsing(files, pathInput);
        } catch (error: any) {
          fileBrowser.handleBrowseError(fileBrowser.path, pathInput, error);
        }
      } catch (error) {
        console.error("Browse failed:", error);
        fileBrowser.handleBrowseError(fileBrowser.path, pathInput, error);
      }
    },
    [browseAPI, fileBrowser, pathNav, props.hostname, props.pid, props.mid],
  );

  /**
   * Handle file navigation (double-click)
   */
  const handleFileNavigation = useCallback(
    (file: FileMetaData) => {
      fileBrowser.setSelected(-1);

      // Handle files
      if (file.type === "f") {
        // Add any special file handling logic here if needed
        return;
      }

      const navigation = pathNav.navigateToFile(file.name, file.type, fileBrowser.pathInput);
      if (navigation.shouldNavigate) {
        browse(navigation.newPath);
      }
    },
    [fileBrowser, pathNav, browse],
  );

  /**
   * Handle row selection
   */
  const handleRowSelection = useCallback(
    (file: FileMetaData, index: number) => {
      const fullPath = pathNav.buildFilePath(fileBrowser.pathInput, file.name);
      fileBrowser.setSelected(index);
      props.onSelectFileCallBack(fullPath, file.type, file);
    },
    [fileBrowser, pathNav, props.onSelectFileCallBack],
  );

  /**
   * Handle up navigation
   */
  const handleNavigateUp = useCallback(() => {
    const parentPath = pathNav.browseUpDirectory(fileBrowser.pathInput);
    browse(parentPath);
  }, [pathNav, fileBrowser.pathInput, browse]);

  /**
   * Handle path input changes (with display conversion)
   */
  const handlePathChange = useCallback(
    (displayPath: string) => {
      const internalPath = pathNav.pathFromDisplay(displayPath);
      fileBrowser.setPathInput(internalPath);
    },
    [pathNav, fileBrowser],
  );

  /**
   * Handle path browsing (with display conversion)
   */
  const handleBrowse = useCallback(
    (displayPath: string) => {
      const internalPath = pathNav.pathFromDisplay(displayPath);
      browse(internalPath);
    },
    [pathNav, browse],
  );

  // Get file list (no filtering needed for HDF5)
  const filteredFiles = fileBrowser.getFilteredFiles();

  // Load and browse initial path on mount
  useEffect(() => {
    if (fileBrowser.pathInput != null) {
      browse(fileBrowser.pathInput);
    }
  }, []); // Empty dependency array means this runs once on mount

  const options: Option[] = [
    {
      text: "Comma separated values (CSV)",
      value: "slycat-csv-parser",
    },
    {
      text: "Dakota tabular",
      value: "slycat-dakota-parser",
    },
  ];

  return (
    <div className="slycat-remote-browser">
      <FileBrowserPathInput
        pathInput={pathNav.pathToDisplay(fileBrowser.pathInput)}
        onBrowse={handleBrowse}
        onPathChange={handlePathChange}
        onNavigateUp={handleNavigateUp}
        disabled={fileBrowser.browserUpdating}
        hasError={fileBrowser.pathError}
        errorMessage={fileBrowser.pathErrorMessage}
        isAtRoot={fileBrowser.isAtRoot(true)}
      />

      <FileBrowserTable
        files={filteredFiles}
        loading={fileBrowser.browserUpdating}
        selected={fileBrowser.selected}
        onSelectRow={handleRowSelection}
        onDoubleClick={handleFileNavigation}
      />
    </div>
  );
}
