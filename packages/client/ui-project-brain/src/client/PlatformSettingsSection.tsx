import { useEffect, useState } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import {
  DEFAULT_DEMO_API_BASE_URL,
  DEFAULT_PLATFORM_BASE_URL,
  PROJECT_BRAIN_DEV_MODE_EVENT,
  isProjectBrainDevMode,
} from './platform-config.ts'
import css from './PlatformSettingsSection.module.css'

export interface SettingsValues {
  readonly platformBaseUrl?: string
  readonly demoApiBaseUrl?: string
  readonly fixedWorkspace?: boolean
}

/** Injected dependency of the developer settings section. */
export interface PlatformSettingsInjected {
  readonly scope: SettingsScope<SettingsValues | undefined> | undefined
}

/**
 * Settings → 开发者配置: visible only while the temporary dev mode is on
 * (`toStarlightDev()` in the console; it fades after a reload — no close
 * button, nothing persists). Edits the business platform origin, the separate
 * demo-status API base, and the fixed-workspace toggle.
 */
export function PlatformSettingsSection({ scope }: PlatformSettingsInjected): JSX.Element | null {
  const [devMode, setDevMode] = useState(isProjectBrainDevMode)
  const [base, setBase] = useState<string>(() => scope?.getSnapshot().value?.platformBaseUrl ?? DEFAULT_PLATFORM_BASE_URL)
  const [apiBase, setApiBase] = useState<string>(() => scope?.getSnapshot().value?.demoApiBaseUrl ?? DEFAULT_DEMO_API_BASE_URL)
  const [fixed, setFixed] = useState<boolean>(() => scope?.getSnapshot().value?.fixedWorkspace ?? false)
  const appliedBase = scope?.getSnapshot().value?.platformBaseUrl ?? DEFAULT_PLATFORM_BASE_URL
  const appliedApiBase = scope?.getSnapshot().value?.demoApiBaseUrl ?? DEFAULT_DEMO_API_BASE_URL

  useEffect(() => {
    const sync = (): void => { setDevMode(isProjectBrainDevMode()) }
    window.addEventListener(PROJECT_BRAIN_DEV_MODE_EVENT, sync)
    return () => { window.removeEventListener(PROJECT_BRAIN_DEV_MODE_EVENT, sync) }
  }, [])

  useEffect(() => scope?.subscribe(() => {
    const resolved = scope.getSnapshot().value
    if (resolved?.platformBaseUrl !== undefined) setBase(resolved.platformBaseUrl)
    if (resolved?.demoApiBaseUrl !== undefined) setApiBase(resolved.demoApiBaseUrl)
    if (resolved?.fixedWorkspace !== undefined) setFixed(resolved.fixedWorkspace)
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
  const commitFixed = (checked: boolean): void => {
    setFixed(checked)
    void scope?.set('fixedWorkspace', checked)
  }

  return (
    <section className={css.section} aria-label="开发者配置">
      <div className={css.intro}>
        <strong>开发者配置</strong>
        <small>临时开发模式：刷新页面后自动关闭，不会残留。智脑业务地址与 demo-status 接口地址分开维护。</small>
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
      <label className={css.toggle}>
        <input
          type="checkbox"
          aria-label="固定唯一工作区"
          checked={fixed}
          onChange={(event) => { commitFixed(event.target.checked) }}
        />
        <span>
          <strong>固定唯一工作区</strong>
          <small>仅保留「项目智脑」工作区，固定到 {`${'主目录'}/starlight_xmzn`}；隐藏历史工作区并禁止新增/删除/重命名。</small>
        </span>
      </label>
    </section>
  )
}
