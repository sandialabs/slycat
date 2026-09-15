/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

import * as React from "react";
import client from "js/slycat-web-client";
import {
  checkRemoteSession,
  SSH_STORAGE_KEYS,
  type HostnameMode,
  type SshAuthValues,
} from "utils/remote-auth";
import { REMOTE_AUTH_LABELS } from "utils/ui-labels";
import {
  RemoteAuthErrorAlert,
  useRemoteLoginError,
  type RemoteAuthErrorProps,
} from "components/RemoteAuthErrorAlert";

type RemoteHost = {
  hostname: string;
  agent?: boolean;
};

type SshAuthenticationBase = RemoteAuthErrorProps & {
  onChange: (values: SshAuthValues) => void;
  onEnter?: (values: SshAuthValues) => void;
  loadingData?: boolean;
};

export type SshAuthenticationProps =
  | (SshAuthenticationBase & {
      hostnameMode?: "editable";
      agent?: boolean;
      hostname?: never;
    })
  | (SshAuthenticationBase & {
      hostnameMode: "locked";
      agent?: boolean;
      hostname?: never;
    })
  | (SshAuthenticationBase & {
      hostnameMode: "hidden";
      hostname: string;
      agent?: never;
    });

const readStored = (key: string): string => {
  const value = localStorage.getItem(key);
  return value && value !== "null" ? value : "";
};

const persist = (key: string, value: string): void => {
  localStorage.setItem(key, value);
};

const SshAuthentication = (props: SshAuthenticationProps) => {
  const hostnameMode: HostnameMode = props.hostnameMode ?? "editable";
  const isHidden = hostnameMode === "hidden";
  const isLocked = hostnameMode === "locked";
  const agent = props.hostnameMode === "hidden" ? false : props.agent === true;
  const loadingData = Boolean(props.loadingData);
  const { errorMessage, clearError } = useRemoteLoginError(props.error, props.onError);

  const ids = React.useId();
  const hostnameId = `${ids}-hostname`;
  const usernameId = `${ids}-username`;
  const passwordId = `${ids}-password`;
  const dropdownId = `${ids}-hosts`;

  const [hosts, setHosts] = React.useState<RemoteHost[]>([]);
  const [hostname, setHostname] = React.useState(() =>
    props.hostnameMode === "hidden" ? props.hostname : readStored(SSH_STORAGE_KEYS.hostname),
  );
  const [username, setUsername] = React.useState(() => readStored(SSH_STORAGE_KEYS.username));
  const [password, setPassword] = React.useState("");
  const [sessionExists, setSessionExists] = React.useState(false);
  const [ready, setReady] = React.useState(isHidden);
  const [validated, setValidated] = React.useState(false);

  const hostnameRef = React.useRef(hostname);
  hostnameRef.current = hostname;
  const onChangeRef = React.useRef(props.onChange);
  onChangeRef.current = props.onChange;
  const onEnterRef = React.useRef(props.onEnter);
  onEnterRef.current = props.onEnter;
  const usernameInputRef = React.useRef<HTMLInputElement>(null);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);

  const currentValues = (): SshAuthValues => ({
    protocol: "ssh",
    hostname,
    username,
    password,
    sessionExists: isHidden ? false : sessionExists,
  });

  const hiddenHostname = props.hostnameMode === "hidden" ? props.hostname : undefined;

  React.useEffect(() => {
    if (hiddenHostname !== undefined) {
      setHostname(hiddenHostname);
    }
  }, [hiddenHostname]);

  React.useEffect(() => {
    if (!isHidden) {
      return;
    }
    if (username) {
      passwordInputRef.current?.focus();
    } else {
      usernameInputRef.current?.focus();
    }
    // Only auto-focus when the hidden form first appears.
  }, [isHidden]);

  React.useEffect(() => {
    if (!errorMessage || loadingData) {
      return;
    }
    const input = passwordInputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    if (input.value) {
      input.setSelectionRange(0, input.value.length);
    }
  }, [errorMessage, loadingData]);

  React.useEffect(() => {
    if (isHidden) {
      return;
    }

    let cancelled = false;

    const loadHosts = async () => {
      try {
        let result = (await client.get_configuration_remote_hosts_fetch()) as RemoteHost[];
        if (agent) {
          result = result.filter((host) => host.agent === true);
        }
        if (cancelled) {
          return;
        }
        setHosts(result);

        if (isLocked) {
          const validHostnames = result.map((host) => host.hostname);
          setHostname((current) => {
            if (current && validHostnames.includes(current)) {
              return current;
            }
            const fallback = validHostnames[0] || "";
            if (fallback) {
              persist(SSH_STORAGE_KEYS.hostname, fallback);
            }
            return fallback;
          });
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void loadHosts();
    return () => {
      cancelled = true;
    };
  }, [agent, isHidden, isLocked]);

  React.useEffect(() => {
    if (!ready || isHidden) {
      return;
    }

    let cancelled = false;
    void checkRemoteSession(hostname, {
      getCurrent: () => ({ hostname: hostnameRef.current }),
    }).then((result) => {
      if (cancelled || result.stale) {
        return;
      }
      setSessionExists(result.sessionExists);
    });

    return () => {
      cancelled = true;
    };
  }, [hostname, isHidden, ready]);

  React.useEffect(() => {
    if (!ready) {
      return;
    }
    onChangeRef.current({
      protocol: "ssh",
      hostname,
      username,
      password,
      sessionExists: isHidden ? false : sessionExists,
    });
  }, [hostname, username, password, sessionExists, ready, isHidden]);

  const setHostnameAndPersist = (value: string) => {
    if (!isHidden) {
      persist(SSH_STORAGE_KEYS.hostname, value);
    }
    setHostname(value);
  };

  const setUsernameAndPersist = (value: string) => {
    persist(SSH_STORAGE_KEYS.username, value);
    setUsername(value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    const form = event.currentTarget;
    setValidated(true);
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector(":invalid");
      if (firstInvalid instanceof HTMLElement) {
        firstInvalid.focus();
      }
      return;
    }
    onEnterRef.current?.(currentValues());
  };

  if (!ready) {
    return <div />;
  }

  const showCredentials = isHidden || !sessionExists;

  return (
    <form
      className={validated ? "SshAuthentication was-validated" : "SshAuthentication"}
      onSubmit={handleSubmit}
      noValidate
    >
      {!isHidden && (
        <div className="mb-3">
          <div className="input-group has-validation">
            <button
              className="btn btn-secondary dropdown-toggle"
              type="button"
              id={dropdownId}
              data-bs-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
              disabled={loadingData}
            />
            <ul className="dropdown-menu" aria-labelledby={dropdownId}>
              {hosts.map((host) => (
                <li key={host.hostname}>
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={() => setHostnameAndPersist(host.hostname)}
                  >
                    {host.hostname}
                  </button>
                </li>
              ))}
            </ul>
            <div className="form-floating">
              <input
                id={hostnameId}
                placeholder="Hostname"
                className="form-control"
                readOnly={isLocked}
                disabled={loadingData}
                value={hostname}
                type="text"
                required
                onChange={(event) => setHostnameAndPersist(event.target.value)}
              />
              <label className="form-label" htmlFor={hostnameId}>
                Hostname
              </label>
            </div>
            <div className={`invalid-feedback${validated && !hostname ? " d-block" : ""}`}>
              Please enter a hostname.
            </div>
          </div>
        </div>
      )}
      {showCredentials && (
        <div>
          <div className="form-floating mb-3">
            <input
              id={usernameId}
              ref={usernameInputRef}
              placeholder={REMOTE_AUTH_LABELS.username}
              disabled={loadingData}
              className="form-control"
              type="text"
              value={username}
              required
              onChange={(event) => setUsernameAndPersist(event.target.value)}
            />
            <label htmlFor={usernameId}>{REMOTE_AUTH_LABELS.username}</label>
            <div className="invalid-feedback">
              Please enter a {REMOTE_AUTH_LABELS.username.toLowerCase()}.
            </div>
          </div>
          <div className="form-floating mb-3">
            <input
              id={passwordId}
              ref={passwordInputRef}
              placeholder={REMOTE_AUTH_LABELS.password}
              disabled={loadingData}
              className="form-control"
              type="password"
              value={password}
              required
              onChange={(event) => setPassword(event.target.value)}
            />
            <label htmlFor={passwordId}>{REMOTE_AUTH_LABELS.password}</label>
            <div className="invalid-feedback">
              Please enter {REMOTE_AUTH_LABELS.password.toLowerCase()}.
            </div>
          </div>
        </div>
      )}
      <RemoteAuthErrorAlert message={errorMessage} />
      <button type="submit" hidden aria-hidden="true" disabled={loadingData} />
    </form>
  );
};

export default SshAuthentication;
