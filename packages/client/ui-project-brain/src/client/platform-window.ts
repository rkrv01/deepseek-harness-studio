import { PROJECT_BRAIN_PLATFORM_URL } from '../project-data.ts'

/** Stable window name that lets Project Brain return to its already-open platform page. */
export const PROJECT_BRAIN_PLATFORM_TARGET = 'project-brain-platform'

const platformUrl = new URL(PROJECT_BRAIN_PLATFORM_URL)

/** Match platform routes while allowing its hash-based child pages and query parameters to vary. */
export function isProjectBrainPlatformUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.origin === platformUrl.origin && url.pathname.startsWith('/business-xmzn/')
  } catch {
    return false
  }
}

/** Navigate the named platform tab, creating it only when this feature has not opened one yet. */
export function openProjectBrainPlatform(url: string): void {
  window.open(url, PROJECT_BRAIN_PLATFORM_TARGET)
}
