/** Project Brain demo locale plumbing shared by the browser UI and the host adapter. */

/** Locale ids the demo surfaces localize to. */
export type ProjectBrainLocale = 'zh' | 'en'

/** The demo's default locale when no preference is available. */
export const DEFAULT_PROJECT_BRAIN_LOCALE: ProjectBrainLocale = 'zh'

/**
 * Normalize an arbitrary locale id to a supported demo locale.
 * @param id - raw locale id from the app preference (e.g. `zh-CN`, `en-US`).
 * @returns the closest supported demo locale, defaulting to Chinese.
 */
export function resolveProjectBrainLocale(id: string | undefined): ProjectBrainLocale {
  if (id === undefined) return DEFAULT_PROJECT_BRAIN_LOCALE
  if (id === 'zh' || id.startsWith('zh-')) return 'zh'
  if (id === 'en' || id.startsWith('en-')) return 'en'
  return DEFAULT_PROJECT_BRAIN_LOCALE
}
