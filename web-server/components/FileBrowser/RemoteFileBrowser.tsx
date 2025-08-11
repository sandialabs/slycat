import * as React from "react";
import { useEffect, useCallback } from "react";
import SlycatSelector, { Option } from "components/SlycatSelector";
import FileBrowserPathInput from "./FileBrowserPathInput";
import FileBrowserTable from "./FileBrowserTable";
import { useFileBrowser } from "./useFileBrowser";
import { useBrowseAPI } from "./useBrowseAPI";
import { usePathNavigation } from "./usePathNavigation";
import { FileMetaData } from "./FileBrowserTypes";

/**
 * @member hostname name of the host we are connecting
 * (assumes we have a connection already to the host)
 * @member onSelectFileCallBack called every time a file is selected
 * returns the files info (path, file.type, file:FileMetaData)
 * @member onSelectParserCallBack called every time a parser is selected
 * returns the parser type
 * @member onReauthCallBack called every time we lose connection to the host
 * @member selectedOption optional string for parser selection (required when showSelector is true)
 * @member showSelector optional boolean to control whether selector is shown (defaults to true)
 * @member useSMB optional boolean to use SMB browsing instead of regular SSH browsing (defaults to false)
 * @export
 * @interface RemoteFileBrowserProps
 */
export interface RemoteFileBrowserProps {
  hostname: string;
  onSelectFileCallBack: Function;
  onSelectParserCallBack: Function;
  onReauthCallBack: Function;
  selectedOption?: string;
  showSelector?: boolean;
  useSMB?: boolean;
}

/**
 * used to create a file browsing window like using 'ls' and 'cd' in a linux terminal
 *
 * @export
 * @param props RemoteFileBrowserProps
 */
export default function RemoteFileBrowser(props: RemoteFileBrowserProps) {
  // Initialize hooks
  const fileBrowser = useFileBrowser({
    type: "remote",
    defaultPath: "/",
    hostname: props.hostname,
    protocol: props.useSMB ? "smb" : "ssh",
  });

  const browseAPI = useBrowseAPI("remote");
  const pathNav = usePathNavigation("remote");

  /**
   * Browse files using the remote API
   */
  const browse = useCallback(
    async (pathInput: string) => {
      try {
        // Check connection first
        const connection = await browseAPI.checkConnection(props.hostname);

        if (connection.status) {
          const normalizedPath = pathInput === "" ? "/" : pathInput;

          fileBrowser.startBrowsing();
          fileBrowser.setPath(normalizedPath);
          fileBrowser.setPathInput(normalizedPath);

          try {
            const results = await browseAPI.browse({
              hostname: props.hostname,
              path: normalizedPath,
              useSMB: props.useSMB,
            });

            const files = fileBrowser.createFileList(results, normalizedPath, false);
            fileBrowser.completeBrowsing(files, normalizedPath);
          } catch (error: any) {
            fileBrowser.handleBrowseError(fileBrowser.path, normalizedPath, error);
          }
        } else {
          // No session, trigger reauth callback
          if (props.onReauthCallBack) {
            props.onReauthCallBack();
          }
        }
      } catch (error) {
        console.error("Connection check failed:", error);
        if (props.onReauthCallBack) {
          props.onReauthCallBack();
        }
      }
    },
    [browseAPI, fileBrowser, props.hostname, props.useSMB, props.onReauthCallBack],
  );

  /**
   * Handle file navigation (double-click)
   */
  const handleFileNavigation = useCallback(
    (file: FileMetaData) => {
      fileBrowser.setSelected(-1);

      const navigation = pathNav.navigateToFile(file.name, file.type, fileBrowser.path);
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
      const fullPath = pathNav.buildFilePath(fileBrowser.path, file.name);
      fileBrowser.setSelected(index);
      props.onSelectFileCallBack(fullPath, file.type, file);
    },
    [fileBrowser, pathNav, props.onSelectFileCallBack],
  );

  /**
   * Handle up navigation
   */
  const handleNavigateUp = useCallback(() => {
    const parentPath = pathNav.pathDirname(fileBrowser.path);
    browse(parentPath);
  }, [pathNav, fileBrowser.path, browse]);

  // Get file list with SMB filtering
  const filteredFiles = fileBrowser.getFilteredFiles(
    props.useSMB ? (file: FileMetaData) => !!file.mtime : undefined,
  );

  // Load stored path on mount
  useEffect(() => {
    const storedPath = fileBrowser.loadStoredPath();
    if (storedPath != null) {
      browse(storedPath);
    } else if (fileBrowser.pathInput != null) {
      // Fall back to default path when nothing is stored
      browse(fileBrowser.pathInput);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Parser options
  let options: Option[] = [];
  if (props.selectedOption == "xyce") {
    options = [
      {
        text: "Dakota tabular",
        value: "slycat-dakota-parser",
      },
    ];
  } else {
    options = [
      {
        text: "Comma separated values (CSV)",
        value: "slycat-csv-parser",
      },
      {
        text: "Dakota tabular",
        value: "slycat-dakota-parser",
      },
    ];
  }

  return (
    <div className="slycat-remote-browser">
      <FileBrowserPathInput
        hostname={props.hostname}
        pathInput={fileBrowser.pathInput}
        onBrowse={browse}
        onPathChange={fileBrowser.setPathInput}
        onNavigateUp={handleNavigateUp}
        disabled={fileBrowser.browserUpdating}
        hasError={fileBrowser.pathError}
        errorMessage={fileBrowser.pathErrorMessage}
        isAtRoot={fileBrowser.isAtRoot(false)}
      />

      <FileBrowserTable
        files={filteredFiles}
        loading={fileBrowser.browserUpdating}
        selected={fileBrowser.selected}
        onSelectRow={handleRowSelection}
        onDoubleClick={handleFileNavigation}
      />

      {props.showSelector !== false && props.selectedOption && (
        <SlycatSelector
          onSelectCallBack={props.onSelectParserCallBack}
          label={"Filetype"}
          options={options}
        />
      )}
    </div>
  );
}
