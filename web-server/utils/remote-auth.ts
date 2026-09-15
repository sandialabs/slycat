import client from "js/slycat-web-client";
import { REMOTE_AUTH_LABELS } from "utils/ui-labels";

export type HostnameMode = "editable" | "locked" | "hidden";

export type SshAuthValues = {
  protocol: "ssh";
  hostname: string;
  username: string;
  password: string;
  sessionExists: boolean;
};

export type SmbAuthValues = {
  protocol: "smb";
  hostname: string;
  username: string;
  password: string;
  share: string;
  domain: string;
  sessionExists: boolean;
};

export const SSH_STORAGE_KEYS = {
  hostname: "slycat-remote-controls-hostname",
  username: "slycat-remote-controls-username",
} as const;

export const SMB_STORAGE_KEYS = {
  hostname: "slycat-smb-remote-controls-hostname",
  username: "slycat-smb-remote-controls-username",
  share: "slycat-smb-remote-controls-share",
  domain: "slycat-smb-remote-controls-domain",
} as const;

export type RemoteSessionCheck = {
  sessionExists: boolean;
  stale: boolean;
};

type RemoteSessionSnapshot = {
  hostname: string;
  share?: string;
};

export type CheckRemoteSessionOptions = {
  share?: string;
  /** After the GET, discard the result if hostname/share no longer match. */
  getCurrent?: () => RemoteSessionSnapshot;
};

export type PostSmbSessionParams = {
  username: string;
  password: string;
  domain?: string;
  server: string;
  share: string;
};

type RemoteSessionJson = {
  status?: boolean;
  share?: string;
};

const isCheckableHostname = (hostname: string | null | undefined): hostname is string => {
  if (hostname == null || hostname === "") {
    return false;
  }
  return !hostname.includes("\\") && !hostname.includes("/") && !hostname.includes(" ");
};

const isStaleResponse = (
  requested: RemoteSessionSnapshot,
  options: CheckRemoteSessionOptions,
): boolean => {
  if (!options.getCurrent) {
    return false;
  }
  const current = options.getCurrent();
  if (current.hostname !== requested.hostname) {
    return true;
  }
  if (options.share !== undefined && current.share !== requested.share) {
    return true;
  }
  return false;
};

/**
 * Encode a string as base64, including Unicode.
 * Used by postSmbSession (and POST /login); not a security boundary.
 */
export const b64EncodeUnicode = (value: string): string => {
  return btoa(
    encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_match, p1: string) => {
      return String.fromCharCode(Number.parseInt(p1, 16));
    }),
  );
};

/**
 * GET /api/remotes/:hostname and decide whether a session exists.
 * SSH: json.status. SMB: json.status and json.share === share.
 * Skips the GET for empty hostnames or hostnames containing \, /, or space.
 */
export const checkRemoteSession = async (
  hostname: string | null | undefined,
  options: CheckRemoteSessionOptions = {},
): Promise<RemoteSessionCheck> => {
  if (!isCheckableHostname(hostname)) {
    return { sessionExists: false, stale: false };
  }

  const requested: RemoteSessionSnapshot = {
    hostname,
    share: options.share,
  };

  try {
    const json = (await client.get_remotes_fetch(hostname)) as RemoteSessionJson;
    if (isStaleResponse(requested, options)) {
      return { sessionExists: false, stale: true };
    }
    const sessionExists =
      options.share !== undefined
        ? Boolean(json.status) && json.share === options.share
        : Boolean(json.status);
    return { sessionExists, stale: false };
  } catch {
    if (isStaleResponse(requested, options)) {
      return { sessionExists: false, stale: true };
    }
    return { sessionExists: false, stale: false };
  }
};

/**
 * POST an SMB session. Encodes username (user@domain when domain is set) and password,
 * then calls the JSON POST helper.
 */
export const postSmbSession = (params: PostSmbSessionParams): Promise<Response> => {
  const username = params.username.trim();
  const domain = params.domain?.trim() ?? "";
  const userName = domain ? `${username}@${domain}` : username;

  return client.post_remotes_smb_fetch({
    user_name: b64EncodeUnicode(userName),
    password: b64EncodeUnicode(params.password),
    server: params.server.trim(),
    share: params.share.trim(),
  });
};

/**
 * Knockout-compatible helper: set the wizard status alert after a dropped session.
 */
export const remoteControlsReauth = (
  status: (message: string) => void,
  statusType: (type: string) => void,
): void => {
  status(
    `Oops, your session has disconnected. Please ${REMOTE_AUTH_LABELS.signIn.toLowerCase()} again.`,
  );
  statusType("danger");
};

/** Danger copy from Knockout `remote.status`, or undefined while connecting. */
export const remoteLoginDangerMessage = (
  statusType?: string | null,
  status?: string | null,
): string | undefined => {
  if (statusType !== "danger") {
    return undefined;
  }
  const message = typeof status === "string" ? status.trim() : "";
  return message || undefined;
};

export const applyRemoteLoginError = (
  status: (value: string | null) => void,
  statusType: (value: string | null) => void,
  message?: string | null,
): void => {
  const text = typeof message === "string" ? message.trim() : "";
  if (text) {
    status(text);
    statusType("danger");
    return;
  }
  status(null);
  statusType(null);
};

export type RemoteAuthErrorInput = {
  status?: number;
  statusText?: string;
  message?: string;
  /** The form has no hostname field (pin-media SSH), so 401 copy should not mention it. */
  hostnameHidden?: boolean;
};

const joinAlertLines = (parts: Array<string | undefined | null>): string => {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0)
    .join("\n\n");
};

/**
 * Build alert input from a failed fetch Response. The body is read only when
 * `!response.ok`; a non-JSON body (e.g. the 401 HTML page) is ignored.
 */
export const remoteAuthErrorFromResponse = async (
  response: Response,
): Promise<RemoteAuthErrorInput> => {
  let message: string | undefined;
  if (!response.ok) {
    try {
      const data = (await response.json()) as { msg?: unknown };
      if (typeof data?.msg === "string") {
        message = data.msg;
      }
    } catch {
      // Response body may not be JSON.
    }
  }
  return { status: response.status, statusText: response.statusText, message };
};

/**
 * Copy for a failed remote login, suitable for a Bootstrap alert (pre-line).
 */
export const formatRemoteAuthError = (error?: RemoteAuthErrorInput | null): string => {
  const status = error?.status;
  const statusText = typeof error?.statusText === "string" ? error.statusText.trim() : "";
  const message = typeof error?.message === "string" ? error.message.trim() : "";

  if (status === 403) {
    return joinAlertLines([
      statusText,
      REMOTE_AUTH_LABELS.authErrorForbiddenDescription,
      REMOTE_AUTH_LABELS.authErrorForbiddenNote,
    ]);
  }
  if (status === 401) {
    return joinAlertLines([
      statusText,
      error?.hostnameHidden
        ? REMOTE_AUTH_LABELS.authErrorRetryLater
        : REMOTE_AUTH_LABELS.authErrorUnauthorizedDescription,
    ]);
  }
  return joinAlertLines([message, statusText]) || "connection could not be established";
};
