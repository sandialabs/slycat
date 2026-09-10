/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

import * as React from "react";
import client from "js/slycat-web-client";
import { checkRemoteSession, SMB_STORAGE_KEYS, type SmbAuthValues } from "utils/remote-auth";
import { REMOTE_AUTH_LABELS } from "utils/ui-labels";

export type SmbInfo = {
  hostname: string;
  collab?: string;
};

export type SmbAuthenticationProps = {
  onChange: (values: SmbAuthValues) => void;
  onEnter?: (values: SmbAuthValues) => void;
  loadingData?: boolean;
  /** After a failed login, focus and select the password field. */
  focusPassword?: boolean;
  /** Pin-media: seed hostname/share from the URI and do not persist those keys. */
  smbInfo?: SmbInfo;
};

const readStored = (key: string): string => {
  const value = localStorage.getItem(key);
  return value && value !== "null" ? value : "";
};

const persist = (key: string, value: string): void => {
  localStorage.setItem(key, value);
};

const SmbAuthentication = (props: SmbAuthenticationProps) => {
  const loadingData = Boolean(props.loadingData);
  const focusPassword = Boolean(props.focusPassword);
  const smbInfo = props.smbInfo;
  const persistHostAndShare = smbInfo === undefined;

  const ids = React.useId();
  const hostnameId = `${ids}-hostname`;
  const shareId = `${ids}-share`;
  const usernameId = `${ids}-username`;
  const domainId = `${ids}-domain`;
  const passwordId = `${ids}-password`;
  const hostnameDropdownId = `${ids}-hosts`;
  const domainDropdownId = `${ids}-domains`;

  const [hostnames, setHostnames] = React.useState<string[]>([]);
  const [domains, setDomains] = React.useState<string[]>([]);
  const [hostname, setHostname] = React.useState(() =>
    smbInfo ? (smbInfo.hostname ?? "") : readStored(SMB_STORAGE_KEYS.hostname),
  );
  const [share, setShare] = React.useState(() =>
    smbInfo ? (smbInfo.collab ?? "") : readStored(SMB_STORAGE_KEYS.share),
  );
  const [username, setUsername] = React.useState(() => readStored(SMB_STORAGE_KEYS.username));
  const [domain, setDomain] = React.useState(() => readStored(SMB_STORAGE_KEYS.domain));
  const [password, setPassword] = React.useState("");
  const [sessionExists, setSessionExists] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [validated, setValidated] = React.useState(false);

  const hostnameRef = React.useRef(hostname);
  hostnameRef.current = hostname;
  const shareRef = React.useRef(share);
  shareRef.current = share;
  const onChangeRef = React.useRef(props.onChange);
  onChangeRef.current = props.onChange;
  const onEnterRef = React.useRef(props.onEnter);
  onEnterRef.current = props.onEnter;
  const passwordInputRef = React.useRef<HTMLInputElement>(null);

  const currentValues = (): SmbAuthValues => ({
    protocol: "smb",
    hostname,
    username,
    password,
    share,
    domain,
    sessionExists,
  });

  const pinMedia = smbInfo !== undefined;
  const smbHostname = smbInfo?.hostname;
  const smbShare = smbInfo?.collab;

  React.useEffect(() => {
    if (!pinMedia) {
      return;
    }
    setHostname(smbHostname ?? "");
    setShare(smbShare ?? "");
  }, [pinMedia, smbHostname, smbShare]);

  React.useEffect(() => {
    let cancelled = false;

    const loadLists = async () => {
      const [hostsResult, domainsResult] = await Promise.allSettled([
        client.get_configuration_smb_remote_hosts_fetch() as Promise<{ hostnames?: string[] }>,
        client.get_configuration_smb_domains_fetch() as Promise<{ domains?: string[] }>,
      ]);
      if (cancelled) {
        return;
      }
      if (hostsResult.status === "fulfilled") {
        setHostnames(hostsResult.value.hostnames ?? []);
      }
      if (domainsResult.status === "fulfilled") {
        setDomains(domainsResult.value.domains ?? []);
      }
      setReady(true);
    };

    void loadLists();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!ready) {
      return;
    }

    let cancelled = false;
    void checkRemoteSession(hostname, {
      share,
      getCurrent: () => ({ hostname: hostnameRef.current, share: shareRef.current }),
    }).then((result) => {
      if (cancelled || result.stale) {
        return;
      }
      setSessionExists(result.sessionExists);
    });

    return () => {
      cancelled = true;
    };
  }, [hostname, share, ready]);

  React.useEffect(() => {
    if (!ready) {
      return;
    }
    onChangeRef.current({
      protocol: "smb",
      hostname,
      username,
      password,
      share,
      domain,
      sessionExists,
    });
  }, [hostname, username, password, share, domain, sessionExists, ready]);

  React.useEffect(() => {
    if (!focusPassword || loadingData) {
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
  }, [focusPassword, loadingData]);

  const setHostnameAndMaybePersist = (value: string) => {
    if (persistHostAndShare) {
      persist(SMB_STORAGE_KEYS.hostname, value);
    }
    setHostname(value);
  };

  const setShareAndMaybePersist = (value: string) => {
    if (persistHostAndShare) {
      persist(SMB_STORAGE_KEYS.share, value);
    }
    setShare(value);
  };

  const setUsernameAndPersist = (value: string) => {
    persist(SMB_STORAGE_KEYS.username, value);
    setUsername(value);
  };

  const setDomainAndPersist = (value: string) => {
    persist(SMB_STORAGE_KEYS.domain, value);
    setDomain(value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

  return (
    <form
      className={validated ? "SmbAuthentication was-validated" : "SmbAuthentication"}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="mb-3">
        <div className="input-group has-validation">
          <button
            className="btn btn-secondary dropdown-toggle"
            type="button"
            id={hostnameDropdownId}
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
            disabled={loadingData}
          />
          <ul className="dropdown-menu" aria-labelledby={hostnameDropdownId}>
            {hostnames.map((host) => (
              <li key={host}>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => setHostnameAndMaybePersist(host)}
                >
                  {host}
                </button>
              </li>
            ))}
          </ul>
          <div className="form-floating">
            <input
              id={hostnameId}
              placeholder="Hostname"
              className="form-control"
              disabled={loadingData}
              value={hostname}
              type="text"
              required
              onChange={(event) => setHostnameAndMaybePersist(event.target.value)}
            />
            <label htmlFor={hostnameId}>Hostname</label>
          </div>
          <div className="invalid-feedback">Please enter a hostname.</div>
        </div>
      </div>
      <div className="form-floating mb-3">
        <input
          id={shareId}
          placeholder="Share Name"
          disabled={loadingData}
          className="form-control"
          type="text"
          value={share}
          onChange={(event) => setShareAndMaybePersist(event.target.value)}
        />
        <label htmlFor={shareId}>Share Name</label>
      </div>
      <div className="input-group has-validation mb-3">
        <div className="form-floating">
          <input
            id={usernameId}
            placeholder={REMOTE_AUTH_LABELS.username}
            disabled={loadingData}
            className="form-control"
            type="text"
            value={username}
            required={!sessionExists}
            onChange={(event) => setUsernameAndPersist(event.target.value)}
          />
          <label htmlFor={usernameId}>{REMOTE_AUTH_LABELS.username}</label>
        </div>
        <span className="input-group-text">@</span>
        <button
          className="btn btn-secondary dropdown-toggle"
          type="button"
          id={domainDropdownId}
          data-bs-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false"
          disabled={loadingData}
        />
        <ul className="dropdown-menu" aria-labelledby={domainDropdownId}>
          {domains.map((item) => (
            <li key={item}>
              <button
                className="dropdown-item"
                type="button"
                onClick={() => setDomainAndPersist(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
        <div className="form-floating">
          <input
            id={domainId}
            placeholder="Domain"
            className="form-control"
            disabled={loadingData}
            value={domain}
            type="text"
            onChange={(event) => setDomainAndPersist(event.target.value)}
          />
          <label htmlFor={domainId}>Domain</label>
        </div>
        <div className="invalid-feedback">
          Please enter a {REMOTE_AUTH_LABELS.username.toLowerCase()}.
        </div>
      </div>
      {!sessionExists && (
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
      )}
      <button type="submit" hidden aria-hidden="true" disabled={loadingData} />
    </form>
  );
};

export default SmbAuthentication;
