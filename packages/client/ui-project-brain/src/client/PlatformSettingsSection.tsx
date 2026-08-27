import { useEffect, useState } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import {
  DEFAULT_DEMO_API_BASE_URL,
  DEFAULT_PLATFORM_BASE_URL,
  PROJECT_BRAIN_DEV_MODE_EVENT,
  PROJECT_BRAIN_DEV_MODE_KEY,
  isProjectBrainDevMode,
} from './platform-config.ts'
import css from './PlatformSettingsSection.module.css'

export interface SettingsValues {
  readonly platformBaseUrl?: string
  readonly demoApiBaseUrl?: string
}

/** Injected dependency of the developer settings section. */
export interface PlatformSettingsInjected {
  readonly scope: SettingsScope<SettingsValues | undefined> | undefined
}

/**
 * Settings → 开发者配置: hidden until `toStarlightDev()` runs in the console.
 * Edits the business platform origin and the separate demo-status API base;
 * closing the section hides it until the console command runs again.
 */
export function PlatformSettingsSection({ scope }: PlatformSettingsInjected): JSX.Element | null {
  const [devMode, setDevMode] = useState(isProjectBrainDevMode)
  const [base, setBase] = useState<string>(() => scope?.getSnapshot().value?.platformBaseUrl ?? DEFAULT_PLATFORM_BASE_URL)
  const [apiBase, setApiBase] = useState<string>(() => scope?.getSnapshot().value?.demoApiBaseUrl ?? DEFAULT_DEMO_API_BASE_URL)
  const appliedBase = scope?.getSnapshot().value?.platformBaseUrl ?? DEFAULT_PLATFORM_BASE_URL
  const appliedApiBase = scope?.getSnapshot().value?.demoApiBaseUrl ?? DEFAULT_DEMO_API_BASE_URL

  useEffect(() => {
    const sync = (): void => { setDevMode(isProjectBrainDevMode()) }
    window.addEventListener(PROJECT_BRAIN_DEV_MODE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(PROJECT_BRAIN_DEV_MODE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => scope?.subscribe(() => {
    const resolved = scope.getSnapshot().value
    if (resolved?.platformBaseUrl !== undefined) setBase(resolved.platformBaseUrl)
    if (resolved?.demoApiBaseUrl !== undefined) setApiBase(resolved.demoApiBaseUrl)
  }), [scope])

  if (!devMode) return null

  const commitBase = (): void => {
    const next = base.trim() === '' ? DEFAULT_PLATFORM_BASE_URL : base.trim()
    setBase(next)
    void scope?.set('platformBaseUrl', next)
  }
  const commitApiBase = (): void => {
    const next = apiBase.trim() === '' ? DEFAULT_DEMO_API_BASE_URL : apiBase.trim()
    setApiBase(next)
    void scope?.set('demoApiBaseUrl', next)
  }
  const closeDevMode = (): void => {
    window.localStorage.removeItem(PROJECT_BRAIN_DEV_MODE_KEY)
    window.dispatchEvent(new Event(PROJECT_BRAIN_DEV_MODE_EVENT))
  }

  return (
    <section className={css.section} aria-label="开发者配置">
      <div className={css.intro}>
        <strong>开发者配置</strong>
        <small>智脑业务地址与 demo-status 接口地址分开维护；本地调试可分别改写。</small>
      </div>
      <label className={css.field}>
        <span>智脑平台地址</span>
        <input
          type="url"
          aria-label="智脑平台地址"
          value={base}
          placeholder={DEFAULT_PLATFORM_BASE_URL}
          onChange={(event) => { setBase(event.target.value) }}
          onBlur={commitBase}
          onKeyDown={(event) => { if (event.key === 'Enter') commitBase() }}
        />
        <em>已应用：{appliedBase}</em>
      </label>
      <label className={css.field}>
        <span>接口地址</span>
        <input
          type="url"
          aria-label="接口地址"
          value={apiBase}
          placeholder={DEFAULT_DEMO_API_BASE_URL}
          onChange={(event) => { setApiBase(event.target.value) }}
          onBlur={commitApiBase}
          onKeyDown={(event) => { if (event.key === 'Enter') commitApiBase() }}
        />
        <em>已应用：{appliedApiBase}</em>
      </label>
      <button type="button" className={css.closeDev} onClick={closeDevMode}>关闭开发者模式</button>
    </section>
  )
}
