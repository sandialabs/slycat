export const SHARED_AUTH_LABELS = {
  username: "Username",
  password: "Authentication",
  signIn: "Log In",
  signOut: "Log Out",
  authErrorDescription: "Please check your username and authentication and try again.",
} as const;

export const SLYCAT_AUTH_LABELS = {
  username: SHARED_AUTH_LABELS.username,
  password: SHARED_AUTH_LABELS.password,
  signIn: SHARED_AUTH_LABELS.signIn,
  signOut: SHARED_AUTH_LABELS.signOut,
  authErrorDescription: SHARED_AUTH_LABELS.authErrorDescription,
} as const;

export const REMOTE_AUTH_LABELS = {
  username: SHARED_AUTH_LABELS.username,
  password: SHARED_AUTH_LABELS.password,
  signIn: SHARED_AUTH_LABELS.signIn,
  signOut: SHARED_AUTH_LABELS.signOut,
  authErrorForbiddenDescription: SHARED_AUTH_LABELS.authErrorDescription,
  authErrorForbiddenNote:
    "Note: you may have tried too many times with bad credentials and have been suspended for the next few minutes.",
  authErrorUnauthorizedDescription: "Make sure the Hostname is entered correctly.",
} as const;
