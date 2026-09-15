/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

import * as React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap";
import client from "js/slycat-web-client";
import ispasswordrequired from "js/slycat-server-ispasswordrequired";
import SmbAuthentication from "components/SmbAuthentication";
import SshAuthentication from "components/SshAuthentication";
import {
  formatRemoteAuthError,
  postSmbSession,
  remoteAuthErrorFromResponse,
  type SmbAuthValues,
  type SshAuthValues,
} from "utils/remote-auth";
import { REMOTE_AUTH_LABELS } from "utils/ui-labels";

declare const $: any;

export type RemoteLoginParams = {
  smb?: boolean;
  hostname: string;
  collab_name?: string | null;
  title?: string;
  message?: string;
  success?: (sid: unknown) => void;
  cancel?: () => void;
};

type RemoteLoginModalProps = {
  smb: boolean;
  hostname: string;
  collabName?: string | null;
  title: string;
  message: string;
  onSuccess: (sid: unknown) => void;
  onCancel: () => void;
  onHidden: () => void;
};

type AuthValues = SshAuthValues | SmbAuthValues;

const useSshPasswordRequired = (): boolean => {
  const [required, setRequired] = React.useState(() =>
    Boolean(ispasswordrequired.ssh_passwordrequired()),
  );

  React.useEffect(() => {
    const subscription = ispasswordrequired.ssh_passwordrequired.subscribe((value: boolean) => {
      setRequired(Boolean(value));
    });
    return () => {
      subscription.dispose();
    };
  }, []);

  return required;
};

const RemoteLoginModal = (props: RemoteLoginModalProps) => {
  const passwordRequired = useSshPasswordRequired();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const modalRef = React.useRef<HTMLDivElement>(null);
  const formHostRef = React.useRef<HTMLDivElement>(null);
  const valuesRef = React.useRef<AuthValues | null>(null);
  const outcomeRef = React.useRef<"open" | "success" | "cancel">("open");
  const loadingRef = React.useRef(false);
  const onHiddenRef = React.useRef(props.onHidden);
  onHiddenRef.current = props.onHidden;

  const hideModal = React.useCallback(() => {
    const el = modalRef.current;
    if (!el) {
      return;
    }
    $(el).modal("hide");
  }, []);

  const focusBlankCredentialField = React.useCallback((): boolean => {
    const root = formHostRef.current;
    if (!root) {
      return false;
    }
    const username = root.querySelector<HTMLInputElement>('input[id$="-username"]');
    const password = root.querySelector<HTMLInputElement>('input[type="password"]');
    if (!username && !password) {
      return false;
    }
    const target = username && !username.value.trim() ? username : password ?? username;
    target?.focus();
    return true;
  }, []);

  React.useEffect(() => {
    const el = modalRef.current;
    if (!el) {
      return;
    }
    const $el = $(el);
    let observer: MutationObserver | null = null;

    const stopWatchingForm = () => {
      observer?.disconnect();
      observer = null;
    };

    const handleShown = () => {
      if (focusBlankCredentialField()) {
        return;
      }
      const root = formHostRef.current;
      if (!root || observer) {
        return;
      }
      observer = new MutationObserver(() => {
        if (focusBlankCredentialField()) {
          stopWatchingForm();
        }
      });
      observer.observe(root, { childList: true, subtree: true });
    };

    const handleHidden = () => {
      stopWatchingForm();
      onHiddenRef.current();
    };
    $el.on("shown.bs.modal", handleShown);
    $el.on("hidden.bs.modal", handleHidden);
    $el.modal("show");
    return () => {
      stopWatchingForm();
      $el.off("shown.bs.modal", handleShown);
      $el.off("hidden.bs.modal", handleHidden);
    };
  }, [focusBlankCredentialField]);

  const setAuthValues = React.useCallback((values: AuthValues) => {
    valuesRef.current = values;
  }, []);

  const onRemoteLoginError = React.useCallback((message?: string) => {
    setError(message);
  }, []);

  const connect = React.useCallback(
    async (values?: AuthValues) => {
      if (loadingRef.current || outcomeRef.current !== "open") {
        return;
      }
      const creds = values ?? valuesRef.current;
      loadingRef.current = true;
      setLoading(true);
      setError(undefined);

      if (props.smb) {
        const smb = (creds ?? {}) as Partial<SmbAuthValues>;
        try {
          const response = await postSmbSession({
            username: smb.username || "",
            password: smb.password || "",
            domain: smb.domain || "",
            server: smb.hostname || props.hostname,
            share: smb.share || "",
          });
          if (outcomeRef.current !== "open") {
            return;
          }
          if (response.ok) {
            outcomeRef.current = "success";
            hideModal();
            props.onSuccess(response.status);
            return;
          }
          const authError = await remoteAuthErrorFromResponse(response);
          if (outcomeRef.current !== "open") {
            return;
          }
          setError(formatRemoteAuthError(authError));
        } catch {
          if (outcomeRef.current !== "open") {
            return;
          }
          setError(formatRemoteAuthError());
        }
        loadingRef.current = false;
        setLoading(false);
        return;
      }

      const ssh = (creds ?? {}) as Partial<SshAuthValues>;
      try {
        const result = await client.post_remotes_fetch({
          parameters: {
            hostname: props.hostname,
            username: ssh.username || "",
            password: ssh.password || "",
          },
        });
        if (outcomeRef.current !== "open") {
          return;
        }
        outcomeRef.current = "success";
        hideModal();
        props.onSuccess(result?.sid);
      } catch (errorResponse: any) {
        if (outcomeRef.current !== "open") {
          return;
        }
        setError(
          formatRemoteAuthError({
            status: errorResponse?.status,
            statusText: errorResponse?.statusText,
            hostnameHidden: true,
          }),
        );
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [hideModal, props],
  );

  const onAuthEnter = React.useCallback(
    (values: AuthValues) => {
      setAuthValues(values);
      void connect(values);
    },
    [connect, setAuthValues],
  );

  const submitLogin = () => {
    if (loadingRef.current) {
      return;
    }
    const form = formHostRef.current?.querySelector(
      "form.SshAuthentication, form.SmbAuthentication",
    );
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
      return;
    }
    if (passwordRequired) {
      return;
    }
    void connect();
  };

  const handleClose = () => {
    if (outcomeRef.current !== "open") {
      return;
    }
    outcomeRef.current = "cancel";
    props.onCancel();
  };

  return (
    <div className="bootstrap-styles">
      <div ref={modalRef} className="modal fade" data-bs-backdrop="static">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{props.title}</h3>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={handleClose}
              />
            </div>
            <div className="modal-body">
              {props.message ? <p>{props.message}</p> : null}
              {passwordRequired ? (
                <div ref={formHostRef}>
                  {props.smb ? (
                    <SmbAuthentication
                      loadingData={loading}
                      error={error}
                      onError={onRemoteLoginError}
                      smbInfo={{
                        hostname: props.hostname,
                        collab: props.collabName ?? undefined,
                      }}
                      onChange={setAuthValues}
                      onEnter={onAuthEnter}
                    />
                  ) : (
                    <SshAuthentication
                      hostnameMode="hidden"
                      hostname={props.hostname}
                      loadingData={loading}
                      error={error}
                      onError={onRemoteLoginError}
                      onChange={setAuthValues}
                      onEnter={onAuthEnter}
                    />
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                disabled={loading}
                onClick={submitLogin}
              >
                <i
                  className="fa fa-spinner fa-pulse"
                  style={{ display: loading ? "inline-block" : "none", marginRight: loading ? "0.3em" : 0 }}
                />
                <span>{REMOTE_AUTH_LABELS.signIn}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const showRemoteLogin = (params: RemoteLoginParams): void => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const unmount = () => {
    root.unmount();
    container.remove();
  };

  root.render(
    <RemoteLoginModal
      smb={Boolean(params.smb)}
      hostname={params.hostname}
      collabName={params.collab_name}
      title={params.title || "Login"}
      message={params.message || ""}
      onSuccess={(sid) => {
        params.success?.(sid);
      }}
      onCancel={() => {
        params.cancel?.();
      }}
      onHidden={unmount}
    />,
  );
};

export default RemoteLoginModal;
