
/**
 * @export
 * @interface LoadingPageProps
 */
export interface LoadingPageProps {
  jid: string
  hostname: string
}

/**
 *
 * @export
 * @interface LoadingPageState
 */
export interface LoadingPageState {
  sessionExists: boolean
  progressBarHidden: boolean
  progressBarProgress: number
}