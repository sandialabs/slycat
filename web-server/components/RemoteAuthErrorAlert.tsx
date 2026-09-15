/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC.
Under the terms of Contract DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
retains certain rights in this software. */

import * as React from "react";

export type RemoteAuthErrorProps = {
  error?: string | null;
  onError?: (error: string | undefined) => void;
};

const trimError = (error?: string | null): string =>
  typeof error === "string" ? error.trim() : "";

/**
 * Controlled login-error state: the parent sets the message after a failed POST,
 * and submit clears it without waiting for a re-render.
 */
export const useRemoteLoginError = (
  error?: string | null,
  onError?: (error: string | undefined) => void,
) => {
  const message = trimError(error);
  const [dismissed, setDismissed] = React.useState(false);
  const onErrorRef = React.useRef(onError);
  onErrorRef.current = onError;

  React.useEffect(() => {
    setDismissed(false);
  }, [message]);

  const clearError = React.useCallback(() => {
    onErrorRef.current?.(undefined);
    setDismissed(true);
  }, []);

  return {
    errorMessage: message && !dismissed ? message : "",
    clearError,
  };
};

export const RemoteAuthErrorAlert = ({ message }: { message: string }) => {
  if (!message) {
    return null;
  }
  return (
    <div className="alert alert-danger slycat-big-scrolling-alert" role="alert">
      {message}
    </div>
  );
};
