/**
 * Shared types and interfaces for file browser components
 */

/**
 * @member type file type (d for directory, f for file, etc.)
 * @member name filename
 * @member size size of file
 * @member mtime last accessed time
 * @member mimeType MIME type of file
 * @interface FileMetaData
 */
export interface FileMetaData {
  type: string;
  name: string;
  size: string;
  mtime: string;
  mimeType: string;
}

/**
 * Configuration for different browser types
 */
export type BrowserType = "remote" | "hdf5";

/**
 * Common props shared by all file browsers
 */
export interface BaseFileBrowserProps {
  hostname: string;
  onSelectFileCallBack: Function;
  onSelectParserCallBack: Function;
  onReauthCallBack: Function;
}

/**
 * Configuration for the file browser hook
 */
export interface FileBrowserConfig {
  type: BrowserType;
  defaultPath: string;
  hostname: string;
  protocol?: string;
}

/**
 * Parameters for browse API calls
 */
export interface BrowseParams {
  hostname: string;
  path: string;
  // Remote specific
  useSMB?: boolean;
  // HDF5 specific
  pid?: string;
  mid?: string;
}

/**
 * Result structure from browse API calls
 */
export interface BrowseResult {
  names: string[];
  sizes: string[];
  types: string[];
  mtimes: string[];
  "mime-types": string[];
}

/**
 * HDF5 specific browse result (JSON parsed)
 */
export interface HDF5BrowseResult {
  path: string;
  name: string[];
  sizes: string[];
  types: string[];
  mtimes: string[];
  "mime-types": string[];
}

/**
 * Connection check result
 */
export interface ConnectionResult {
  status: boolean;
}
