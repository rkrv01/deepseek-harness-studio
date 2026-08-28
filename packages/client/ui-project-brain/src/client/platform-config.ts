/**
 * Configurable Project Brain platform addresses. The business origin and the
 * demo-status API base are maintained separately (the business origin may sit
 * behind a proxy that is awkward to debug locally), each repointable from the
 * developer settings section.
 */

export const DEFAULT_PLATFORM_BASE_URL = 'https://7koxhpk4.ipyingshe.net:54928'

/** Default demo-status API base, maintained separately from the business origin so local debugging can repoint it. */
export const DEFAULT_DEMO_API_BASE_URL = 'https://7koxhpk4.ipyingshe.net:54928/demo-control'

/** Business-app path prefix served under the platform origin. */
export const PROJECT_BRAIN_APP_PATH = '/business-xmzn'

/** Endpoint path appended to the demo-status API base. */
export const PROJECT_BRAIN_DEMO_STATUS_PATH = '/api/demo/config'

/** Window event name announcing a developer-mode change. */
export const PROJECT_BRAIN_DEV_MODE_EVENT = 'starlight:dev-mode'

// Developer mode is strictly temporary: session-resident only, so a reload or
// re-open always starts closed and there is no persistent "leave it on" state.
let devMode = false

/** Whether the console-activated developer mode is currently on (session-resident). */
export function isProjectBrainDevMode(): boolean {
  return devMode
}

/** Turn the temporary developer mode on for one settings access session. */
export function enableProjectBrainDevMode(): void {
  devMode = true
  window.dispatchEvent(new Event(PROJECT_BRAIN_DEV_MODE_EVENT))
}

/** Revoke the current developer settings access session. */
export function disableProjectBrainDevMode(): void {
  if (!devMode) return
  devMode = false
  window.dispatchEvent(new Event(PROJECT_BRAIN_DEV_MODE_EVENT))
}

let baseProvider: () => string = () => DEFAULT_PLATFORM_BASE_URL
let demoApiBaseProvider: () => string = () => DEFAULT_DEMO_API_BASE_URL

/** Install the runtime source of the configured platform base (settings-backed). */
export function setPlatformBaseProvider(provider: () => string): void {
  baseProvider = provider
}

/** Install the runtime source of the configured demo-status API base (settings-backed). */
export function setDemoApiBaseProvider(provider: () => string): void {
  demoApiBaseProvider = provider
}

/** Resolve the currently configured platform origin. */
export function platformBaseUrl(): string {
  return baseProvider()
}

/** Resolve the currently configured demo-status API base. */
export function demoApiBaseUrl(): string {
  return demoApiBaseProvider()
}

/**
 * Resolve one business URL on the platform origin.
 * @param route - Hash route inside the business app, e.g. `#/projectAdmin`.
 * @returns `${base}/business-xmzn/<route>`.
 */
export function platformBusinessUrl(route: string): string {
  return `${platformBaseUrl()}${PROJECT_BRAIN_APP_PATH}/${route.replace(/^\//u, '')}`
}

/** Resolve the full demo-status endpoint from the configured API base. */
export function platformDemoStatusUrl(): string {
  return `${demoApiBaseUrl().replace(/\/+$/u, '')}${PROJECT_BRAIN_DEMO_STATUS_PATH}`
}
