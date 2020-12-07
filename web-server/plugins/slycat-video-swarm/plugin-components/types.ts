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

export interface LoadButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export interface LoadingPageProps {
  modelId: string;
}
export interface LoadingPageState {
  jid: string;
  finished: boolean;
  sessionExists: boolean;
  progressBarHidden: boolean;
  modalId: string;
  progressBarProgress: number;
  linkColumn: number;
  modelMessage: string;
  modelShow: boolean;
  hostname: string;
  workdir: string,
  jobStatus: string;
  showVerboseLog: boolean
  vsLog: logMap;
  log: logMap;
};
