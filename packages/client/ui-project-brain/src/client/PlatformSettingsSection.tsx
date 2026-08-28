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

/** Line tone of the connectivity probe output: ok/error carry the green/red accents. */
type ProbeTone = 'ok' | 'error' | 'neutral'

interface ProbeLine {
  readonly tone: ProbeTone
  readonly text: string
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
  const [probeLines, setProbeLines] = useState<readonly ProbeLine[]>([])
  const [probing, setProbing] = useState(false)
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

  /** Current 接口地址 input value, defaulted and trailing-slash-normalized for probing. */
  const probeBase = (): string => {
    const value = apiBase.trim() === '' ? DEFAULT_DEMO_API_BASE_URL : apiBase.trim()
    return value.replace(/\/+$/u, '')
  }

  const probeRead = async (base: string, lines: ProbeLine[]): Promise<void> => {
    const response = await fetch(`${base}/api/demo/config`)
    if (!response.ok) {
      lines.push({ tone: 'error', text: `GET /api/demo/config → HTTP ${response.status}` })
      return
    }
    const value: unknown = await response.json()
    const record = value as Record<string, unknown>
    lines.push({ tone: 'ok', text: `GET /api/demo/config → HTTP 200，demoEnabled=${String(record.demoEnabled)}，aiTaskCreated=${String(record.aiTaskCreated)}` })
  }

  const runProbe = async (): Promise<void> => {
    setProbing(true)
    const base = probeBase()
    const lines: ProbeLine[] = [{ tone: 'neutral', text: `测试地址：${base}` }]
    try {
      await probeRead(base, lines)
    } catch (error) {
      lines.push({ tone: 'error', text: `连接失败：${error instanceof Error ? error.message : String(error)}` })
    }
    setProbeLines(lines)
    setProbing(false)
  }

  const toggleProbe = async (key: 'master' | 'ai-task'): Promise<void> => {
    setProbing(true)
    const base = probeBase()
    const lines: ProbeLine[] = [{ tone: 'neutral', text: `测试地址：${base}` }]
    try {
      if (key === 'master') {
        const response = await fetch(`${base}/api/demo/config`, { method: 'POST' })
        lines.push({ tone: response.ok ? 'ok' : 'error', text: `POST /api/demo/config（切换模拟数据）→ HTTP ${response.status}` })
      } else {
        const response = await fetch(`${base}/api/demo/toggle`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: 'aiTaskCreated' }),
        })
        lines.push({ tone: response.ok ? 'ok' : 'error', text: `POST /api/demo/toggle（切换AI任务创建）→ HTTP ${response.status}` })
      }
      await probeRead(base, lines)
    } catch (error) {
      lines.push({ tone: 'error', text: `操作失败：${error instanceof Error ? error.message : String(error)}` })
    }
    setProbeLines(lines)
    setProbing(false)
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
      <div className={css.probe}>
        <strong>接口连通性测试</strong>
        <div className={css.probeActions}>
          <button type="button" className={css.testButton} disabled={probing} onClick={() => { void runProbe() }}>
            测试连接
          </button>
          <button type="button" className={css.testButton} disabled={probing} onClick={() => { void toggleProbe('master') }}>
            切换模拟数据
          </button>
          <button type="button" className={css.testButton} disabled={probing} onClick={() => { void toggleProbe('ai-task') }}>
            切换AI任务创建
          </button>
        </div>
        {probeLines.length > 0 && (
          <ul className={css.probeOutput}>
            {probeLines.map((line, index) => (
              <li
                key={index}
                className={`${css.probeLine} ${line.tone === 'ok' ? css.probeOk : line.tone === 'error' ? css.probeError : css.probeNeutral}`}
              >
                {line.text}
              </li>
            ))}
          </ul>
        )}
      </div>
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
