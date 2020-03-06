
/**
 * @export
 * @interface JobCodesProps
 */
export interface JobCodesProps {
}

/**
 * @export
 * @interface LoadingPageProps
 */
export interface LoadingPageProps {
  jid: string
  hostname: string
  modelId: string
  modelState: string
  callback?: VoidFunction
}
/**
 *
 * @export
 * @interface logMap
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
  modelMessage: string
  modelId: string
  modelShow: boolean
  jobStatus: string
  pullCalled: number
  modelState: string
}