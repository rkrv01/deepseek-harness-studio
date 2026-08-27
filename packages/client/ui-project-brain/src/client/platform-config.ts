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

/** localStorage key and window event name gating the developer settings section. */
export const PROJECT_BRAIN_DEV_MODE_KEY = 'starlight:dev-mode'
export const PROJECT_BRAIN_DEV_MODE_EVENT = 'starlight:dev-mode'

/** Whether the console-activated developer mode is currently on. */
export function isProjectBrainDevMode(): boolean {
  return window.localStorage.getItem(PROJECT_BRAIN_DEV_MODE_KEY) === '1'
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
