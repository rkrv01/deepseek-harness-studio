import { platformBaseUrl } from './platform-config.ts'

/** Stable window name that lets Project Brain return to its already-open platform page. */
export const PROJECT_BRAIN_PLATFORM_TARGET = 'project-brain-platform'

/** Business-app route prefix the link matcher recognises under any configured platform origin. */
const PLATFORM_APP_PATHNAME = '/business-xmzn/'

/** Match platform routes while allowing its hash-based child pages and query parameters to vary. */
export function isProjectBrainPlatformUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.origin === new URL(platformBaseUrl()).origin && url.pathname.startsWith(PLATFORM_APP_PATHNAME)
  } catch {
    return false
  }
}

/** Navigate the named platform tab, creating it only when this feature has not opened one yet. */
export function openProjectBrainPlatform(url: string): void {
  window.open(url, PROJECT_BRAIN_PLATFORM_TARGET)
}
