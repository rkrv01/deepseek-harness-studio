/** Shared locale subscription for Project Brain browser components. */

import { useSyncExternalStore } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ProjectBrainLocale } from '../locale.ts'
import { resolveProjectBrainLocale } from '../locale.ts'

/** Module-level current demo locale; updated by the client plugin on locale changes. */
let currentLocale: ProjectBrainLocale = 'zh'

/** Snapshot readers for the shared locale store. */
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** Install the locale listener onto a client context; returns the disposer. */
export function mountProjectBrainLocale(
  ctx: ClientContext,
  onLocaleChange?: (locale: ProjectBrainLocale) => void,
): () => void {
  const sync = (): void => {
    const next = resolveProjectBrainLocale(ctx.locale.getLocale().active)
    if (next === currentLocale) return
    currentLocale = next
    onLocaleChange?.(next)
    emit()
  }
  sync()
  const off = ctx.on('locale/change', sync)
  return () => { off(); listeners.clear() }
}

/** Subscribe the browser components to the current demo locale. */
export function useProjectBrainLocale(): ProjectBrainLocale {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    () => currentLocale,
  )
  return currentLocale
}

/** Read the current demo locale without subscribing (for non-component code). */
export function currentProjectBrainLocale(): ProjectBrainLocale {
  return currentLocale
}
