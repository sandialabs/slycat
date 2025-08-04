import { useCallback } from "react";
import client from "js/slycat-web-client";
import {
  BrowserType,
  BrowseParams,
  BrowseResult,
  HDF5BrowseResult,
  ConnectionResult,
} from "./FileBrowserTypes";

/**
 * Hook that abstracts different browse API calls based on browser type
 */
export function useBrowseAPI(type: BrowserType) {
  /**
   * Browse files/directories using the appropriate API
   */
  const browse = useCallback(
    (params: BrowseParams): Promise<BrowseResult | HDF5BrowseResult> => {
      return new Promise((resolve, reject) => {
        const commonParams = {
          hostname: params.hostname,
          path: params.path,
          success: (results: any) => {
            if (type === "hdf5") {
              // HDF5 returns JSON string that needs parsing
              const parsedResults = JSON.parse(results);
              resolve(parsedResults);
            } else {
              resolve(results);
            }
          },
          error: (results: any) => {
            reject(results);
          },
        };

        switch (type) {
          case "remote":
            if (params.useSMB) {
              client.post_remote_browse_smb(commonParams);
            } else {
              client.post_remote_browse(commonParams);
            }
            break;

          case "hdf5":
            if (!params.pid || !params.mid) {
              reject(new Error("HDF5 browse requires pid and mid parameters"));
              return;
            }
            client.post_browse_hdf5({
              ...commonParams,
              pid: params.pid,
              mid: params.mid,
            });
            break;

          default:
            reject(new Error(`Unsupported browser type: ${type}`));
        }
      });
    },
    [type],
  );

  /**
   * Check if we have a valid connection (only needed for remote browsing)
   */
  const checkConnection = useCallback(
    async (hostname: string): Promise<ConnectionResult> => {
      if (type === "remote") {
        try {
          const result = await client.get_remotes_fetch(hostname);
          return result;
        } catch (error) {
          return { status: false };
        }
      } else {
        // HDF5 doesn't need connection checking
        return { status: true };
      }
    },
    [type],
  );

  /**
   * Determines if this browser type requires authentication checking
   */
  const requiresAuth = useCallback((): boolean => {
    return type === "remote";
  }, [type]);

  return {
    browse,
    checkConnection,
    requiresAuth,
  };
}
