import { useEffect, useState } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import { DEFAULT_PLATFORM_BASE_URL } from './platform-config.ts'
import css from './PlatformSettingsSection.module.css'

/** Injected dependency of the 智脑平台 settings section. */
export interface PlatformSettingsInjected {
  readonly scope: SettingsScope<{ readonly platformBaseUrl?: string } | undefined> | undefined
}

/**
 * Settings → 智脑平台: edit the configurable platform origin once, and every
 * Project Brain link plus the demo-status connector resolves it.
 */
export function PlatformSettingsSection({ scope }: PlatformSettingsInjected): JSX.Element {
  const [base, setBase] = useState<string>(() => scope?.getSnapshot().value?.platformBaseUrl ?? DEFAULT_PLATFORM_BASE_URL)
  const applied = scope?.getSnapshot().value?.platformBaseUrl ?? DEFAULT_PLATFORM_BASE_URL

  useEffect(() => scope?.subscribe(() => {
    const resolved = scope.getSnapshot().value?.platformBaseUrl
    if (resolved !== undefined) setBase(resolved)
  }), [scope])

  const commit = (): void => {
    const next = base.trim() === '' ? DEFAULT_PLATFORM_BASE_URL : base.trim()
    setBase(next)
    void scope?.set('platformBaseUrl', next)
  }

  return (
    <section className={css.section} aria-label="智脑平台">
      <div className={css.intro}>
        <strong>智脑平台地址</strong>
        <small>项目智脑演示中的业务链接与初始化接口统一读取该前缀。</small>
      </div>
      <label className={css.field}>
        <span>平台地址</span>
        <input
          type="url"
          aria-label="平台地址"
          value={base}
          placeholder={DEFAULT_PLATFORM_BASE_URL}
          onChange={(event) => { setBase(event.target.value) }}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
        />
        <em>已应用：{applied}</em>
      </label>
    </section>
  )
}
