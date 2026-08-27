/**
 * Configurable origin of the independent Project Brain platform. Every
 * business URL and the demo-status connector derive from one runtime base so a
 * deployment can repoint the whole demo from 设置 → 智脑平台.
 */

export const DEFAULT_PLATFORM_BASE_URL = 'https://7koxhpk4.ipyingshe.net:54928'

/** Business-app path prefix served under the platform origin. */
export const PROJECT_BRAIN_APP_PATH = '/business-xmzn'

/** Demo-data switch base path under the platform origin; the status endpoint appends `api/demo/config`. */
export const PROJECT_BRAIN_DEMO_STATUS_BASE_PATH = '/demo-control/'

/** Full demo-data switch endpoint path under the platform origin, shared by server calls and client debug logging. */
export const PROJECT_BRAIN_DEMO_STATUS_PATH = `${PROJECT_BRAIN_DEMO_STATUS_BASE_PATH}api/demo/config`

let baseProvider: () => string = () => DEFAULT_PLATFORM_BASE_URL

/** Install the runtime source of the configured platform base (settings-backed). */
export function setPlatformBaseProvider(provider: () => string): void {
  baseProvider = provider
}

/** Resolve the currently configured platform origin. */
export function platformBaseUrl(): string {
  return baseProvider()
}

/**
 * Resolve one business URL on the platform origin.
 * @param route - Hash route inside the business app, e.g. `#/projectAdmin`.
 * @returns `${base}/business-xmzn/<route>`.
 */
export function platformBusinessUrl(route: string): string {
  return `${platformBaseUrl()}${PROJECT_BRAIN_APP_PATH}/${route.replace(/^\//u, '')}`
}

/** Resolve the full demo-status endpoint on the currently configured platform origin. */
export function platformDemoStatusUrl(): string {
  return `${platformBaseUrl()}${PROJECT_BRAIN_DEMO_STATUS_PATH}`
}
