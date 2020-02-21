
/**
 * @export
 * @interface LoadingPageProps
 */
export interface LoadingPageProps {
  jid: string
  hostname: string
  modelId: string
}
/**
 *
 * @export
 * @interface LoadingPageState
 */
export interface logMap {
  logLineArray: [string]
}
/**
 *
 * @export
 * @interface LoadingPageState
 */
export interface LoadingPageState {
  log: logMap
  sessionExists: boolean
  progressBarHidden: boolean
  progressBarProgress: number
  modalId: string
  modelId: string
  modelShow: boolean
  jobStatus: string
}