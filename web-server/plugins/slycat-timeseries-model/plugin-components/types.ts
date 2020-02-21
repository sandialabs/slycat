
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
  pending: [string]
  failed: [string]
  running: [string]
  complete: [string]
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
}