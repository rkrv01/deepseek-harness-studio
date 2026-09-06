import { useSyncExternalStore } from 'react'
import { FishLogo } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

type OfficialBrandMarkProps = HeroBrandMarkOwnerProps & SidebarBrandMarkOwnerProps

/** Module-level active locale, kept in sync by the client plugin. */
let activeLocale: 'zh' | 'en' = 'zh'
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** Install the brand-locale subscription onto a client context; returns the disposer. */
export function mountBrandLocale(ctx: ClientContext): () => void {
  const sync = (): void => {
    const next = ctx.locale.getLocale().active === 'en' ? 'en' : 'zh'
    if (next === activeLocale) return
    activeLocale = next
    emit()
  }
  sync()
  const off = ctx.on('locale/change', sync)
  return () => { off(); listeners.clear() }
}

function useBrandLocale(): 'zh' | 'en' {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    () => activeLocale,
  )
  return activeLocale
}

/**
 * Render the official mark with the presentation requested by its host surface.
 * @param props - Host-supplied mark presentation.
 * @returns the official whale mark.
 */
export function OfficialBrandMark({ size, className }: OfficialBrandMarkProps) {
  return <FishLogo size={size} className={className} />
}

/**
 * Render the official name artwork without its independently slotted mark.
 * @returns the official name wordmark in the active locale.
 */
export function OfficialBrandName() {
  const locale = useBrandLocale()
  return <span>{locale === 'en' ? 'Starlight AI Assistant' : 'Starlight AI 助手'}</span>
}
