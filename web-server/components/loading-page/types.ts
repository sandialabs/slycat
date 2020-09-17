/**
 * @export
 * @interface JobCodesProps
 */
export interface JobCodesProps {}

/**
 *
 * @export
 * @interface logMap
 */
export interface logMap {
  logLineArray: string[];
}

export interface LogListProps {
  log: logMap;
  jobStatus: string;
  sessionExists: boolean;
}

export interface InfoBarProps {
  jid: string;
  hostname: string;
  sessionExists: boolean;
}
