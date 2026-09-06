import { useEffect, useState } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import {
  DEFAULT_DEMO_API_BASE_URL,
  DEFAULT_PLATFORM_BASE_URL,
  PROJECT_BRAIN_DEV_MODE_EVENT,
  isProjectBrainDevMode,
} from './platform-config.ts'
import { useProjectBrainLocale } from './use-project-brain-locale.ts'
import css from './PlatformSettingsSection.module.css'

export interface SettingsValues {
  readonly platformBaseUrl?: string
  readonly demoApiBaseUrl?: string
  readonly fixedWorkspace?: boolean
  readonly showPluginCenter?: boolean
  readonly showPluginDiscovery?: boolean
  readonly showPresetSquare?: boolean
  readonly showAppCenter?: boolean
}

/** Line tone of the connectivity probe output: ok/error carry the green/red accents. */
type ProbeTone = 'ok' | 'error' | 'neutral'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface ProbeLine {
  readonly tone: ProbeTone
  readonly text: string
}

/** Injected dependency of the developer settings section. */
export interface PlatformSettingsInjected {
  readonly scope: SettingsScope<SettingsValues | undefined> | undefined
}

/**
 * Settings → 开发者配置 is visible only after the desktop menu password is
 * accepted. It edits platform endpoints, demo switches, workspace policy, and
 * desktop product-entry visibility.
 */
export function PlatformSettingsSection({ scope }: PlatformSettingsInjected): JSX.Element | null {
  const locale = useProjectBrainLocale()
  const [devMode, setDevMode] = useState(isProjectBrainDevMode)
  const [base, setBase] = useState<string>(() => scope?.getSnapshot().value?.platformBaseUrl ?? DEFAULT_PLATFORM_BASE_URL)
  const [apiBase, setApiBase] = useState<string>(() => scope?.getSnapshot().value?.demoApiBaseUrl ?? DEFAULT_DEMO_API_BASE_URL)
  const [fixed, setFixed] = useState<boolean>(() => scope?.getSnapshot().value?.fixedWorkspace ?? true)
  const [entries, setEntries] = useState(() => ({
    showPluginCenter: scope?.getSnapshot().value?.showPluginCenter ?? false,
    showPluginDiscovery: scope?.getSnapshot().value?.showPluginDiscovery ?? false,
    showPresetSquare: scope?.getSnapshot().value?.showPresetSquare ?? false,
    showAppCenter: scope?.getSnapshot().value?.showAppCenter ?? false,
  }))
  const [probeLines, setProbeLines] = useState<readonly ProbeLine[]>([])
  const [probing, setProbing] = useState(false)
  const [saveStates, setSaveStates] = useState<Record<'platformBaseUrl' | 'demoApiBaseUrl', SaveState>>({
    platformBaseUrl: 'idle',
    demoApiBaseUrl: 'idle',
  })
  const [saveErrors, setSaveErrors] = useState<Record<'platformBaseUrl' | 'demoApiBaseUrl', string | undefined>>({
    platformBaseUrl: undefined,
    demoApiBaseUrl: undefined,
  })
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
    setEntries({
      showPluginCenter: resolved?.showPluginCenter ?? false,
      showPluginDiscovery: resolved?.showPluginDiscovery ?? false,
      showPresetSquare: resolved?.showPresetSquare ?? false,
      showAppCenter: resolved?.showAppCenter ?? false,
    })
  }), [scope])

  if (!devMode) return null

  const commit = async (field: 'platformBaseUrl' | 'demoApiBaseUrl', value: string): Promise<void> => {
    const next = value.trim() === ''
      ? field === 'platformBaseUrl' ? DEFAULT_PLATFORM_BASE_URL : DEFAULT_DEMO_API_BASE_URL
      : value.trim()
    setSaveStates(current => ({ ...current, [field]: 'saving' }))
    setSaveErrors(current => ({ ...current, [field]: undefined }))
    try {
      await scope?.set(field, next)
      setSaveStates(current => ({ ...current, [field]: 'saved' }))
    } catch (error) {
      setSaveStates(current => ({ ...current, [field]: 'error' }))
      setSaveErrors(current => ({ ...current, [field]: error instanceof Error ? error.message : String(error) }))
    }
  }
  const commitBase = (): void => {
    const next = base.trim() === '' ? DEFAULT_PLATFORM_BASE_URL : base.trim()
    setBase(next)
    void commit('platformBaseUrl', next)
  }
  const commitApiBase = (): void => {
    const next = apiBase.trim() === '' ? DEFAULT_DEMO_API_BASE_URL : apiBase.trim()
    setApiBase(next)
    void commit('demoApiBaseUrl', next)
  }
  const commitFixed = (checked: boolean): void => {
    setFixed(checked)
    void scope?.set('fixedWorkspace', checked)
  }
  const commitEntry = (field: keyof typeof entries, checked: boolean): void => {
    setEntries(current => ({ ...current, [field]: checked }))
    void scope?.set(field, checked)
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
    lines.push({ tone: 'ok', text: locale === 'en'
      ? `GET /api/demo/config → HTTP 200, demoEnabled=${String(record.demoEnabled)}, aiTaskCreated=${String(record.aiTaskCreated)}`
      : `GET /api/demo/config → HTTP 200，demoEnabled=${String(record.demoEnabled)}，aiTaskCreated=${String(record.aiTaskCreated)}` })
  }

  const runProbe = async (): Promise<void> => {
    setProbing(true)
    const base = probeBase()
    const lines: ProbeLine[] = [{ tone: 'neutral', text: locale === 'en' ? `Test URL: ${base}` : `测试地址：${base}` }]
    try {
      await probeRead(base, lines)
    } catch (error) {
      lines.push({ tone: 'error', text: locale === 'en' ? `Connection failed: ${error instanceof Error ? error.message : String(error)}` : `连接失败：${error instanceof Error ? error.message : String(error)}` })
    }
    setProbeLines(lines)
    setProbing(false)
  }

  const toggleProbe = async (key: 'master' | 'ai-task'): Promise<void> => {
    setProbing(true)
    const base = probeBase()
    const lines: ProbeLine[] = [{ tone: 'neutral', text: locale === 'en' ? `Test URL: ${base}` : `测试地址：${base}` }]
    try {
      if (key === 'master') {
        const response = await fetch(`${base}/api/demo/config`, { method: 'POST' })
        lines.push({ tone: response.ok ? 'ok' : 'error', text: locale === 'en'
          ? `POST /api/demo/config (toggle demo data) → HTTP ${response.status}`
          : `POST /api/demo/config（切换模拟数据）→ HTTP ${response.status}` })
      } else {
        const response = await fetch(`${base}/api/demo/toggle`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: 'aiTaskCreated' }),
        })
        lines.push({ tone: response.ok ? 'ok' : 'error', text: locale === 'en'
          ? `POST /api/demo/toggle (toggle AI task creation) → HTTP ${response.status}`
          : `POST /api/demo/toggle（切换AI任务创建）→ HTTP ${response.status}` })
      }
      await probeRead(base, lines)
    } catch (error) {
      lines.push({ tone: 'error', text: locale === 'en' ? `Operation failed: ${error instanceof Error ? error.message : String(error)}` : `操作失败：${error instanceof Error ? error.message : String(error)}` })
    }
    setProbeLines(lines)
    setProbing(false)
  }

  return (
    <section className={css.section} aria-label={locale === 'en' ? 'Developer Settings' : '开发者配置'}>
      <div className={css.intro}>
        <strong>{locale === 'en' ? 'Developer Settings' : '开发者配置'}</strong>
        <small>{locale === 'en' ? 'Temporary dev mode: turns off automatically after a page refresh and leaves no residue. The Project Brain business URL and the demo-status API URL are maintained separately.' : '临时开发模式：刷新页面后自动关闭，不会残留。智脑业务地址与 demo-status 接口地址分开维护。'}</small>
      </div>
      <label className={css.field}>
        <span>{locale === 'en' ? 'Project Brain Platform URL' : '智脑平台地址'}</span>
        <input
          type="url"
          aria-label={locale === 'en' ? 'Project Brain Platform URL' : '智脑平台地址'}
          value={base}
          placeholder={DEFAULT_PLATFORM_BASE_URL}
          onChange={(event) => { setBase(event.target.value) }}
          onBlur={commitBase}
          onKeyDown={(event) => { if (event.key === 'Enter') commitBase() }}
        />
        <em>{locale === 'en' ? 'Applied: ' : '已应用：'}{appliedBase}</em>
        {saveStates.platformBaseUrl === 'saving' && <small>{locale === 'en' ? 'Saving...' : '保存中...'}</small>}
        {saveStates.platformBaseUrl === 'saved' && <small>{locale === 'en' ? 'Saved' : '已保存'}</small>}
        {saveErrors.platformBaseUrl !== undefined && <small className={css.saveError}>{locale === 'en' ? 'Save failed: ' : '保存失败：'}{saveErrors.platformBaseUrl}</small>}
      </label>
      <label className={css.field}>
        <span>{locale === 'en' ? 'API URL' : '接口地址'}</span>
        <input
          type="url"
          aria-label={locale === 'en' ? 'API URL' : '接口地址'}
          value={apiBase}
          placeholder={DEFAULT_DEMO_API_BASE_URL}
          onChange={(event) => { setApiBase(event.target.value) }}
          onBlur={commitApiBase}
          onKeyDown={(event) => { if (event.key === 'Enter') commitApiBase() }}
        />
        <em>{locale === 'en' ? 'Applied: ' : '已应用：'}{appliedApiBase}</em>
        {saveStates.demoApiBaseUrl === 'saving' && <small>{locale === 'en' ? 'Saving...' : '保存中...'}</small>}
        {saveStates.demoApiBaseUrl === 'saved' && <small>{locale === 'en' ? 'Saved' : '已保存'}</small>}
        {saveErrors.demoApiBaseUrl !== undefined && <small className={css.saveError}>{locale === 'en' ? 'Save failed: ' : '保存失败：'}{saveErrors.demoApiBaseUrl}</small>}
      </label>
      <div className={css.probe}>
        <strong>{locale === 'en' ? 'API connectivity test' : '接口连通性测试'}</strong>
        <div className={css.probeActions}>
          <button type="button" className={css.testButton} disabled={probing} onClick={() => { void runProbe() }}>
            {locale === 'en' ? 'Test connection' : '测试连接'}
          </button>
          <button type="button" className={css.testButton} disabled={probing} onClick={() => { void toggleProbe('master') }}>
            {locale === 'en' ? 'Toggle demo data' : '切换模拟数据'}
          </button>
          <button type="button" className={css.testButton} disabled={probing} onClick={() => { void toggleProbe('ai-task') }}>
            {locale === 'en' ? 'Toggle AI task creation' : '切换AI任务创建'}
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
      <div aria-label={locale === 'en' ? 'Desktop entry visibility settings' : '桌面入口显示设置'}>
        <strong>{locale === 'en' ? 'Desktop entries' : '桌面入口显示'}</strong>
        {([
          ['showPluginCenter', locale === 'en' ? 'Plugin Center' : '插件中心'],
          ['showPluginDiscovery', locale === 'en' ? 'Plugin Discovery' : '插件发现'],
          ['showPresetSquare', locale === 'en' ? 'Preset Plaza' : 'Preset 广场'],
          ['showAppCenter', locale === 'en' ? 'App Center' : '应用中心'],
        ] as const).map(([field, label]) => (
          <label className={css.toggle} key={field}>
            <input type="checkbox" checked={entries[field]} onChange={(event) => { commitEntry(field, event.target.checked) }} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <label className={css.toggle}>
        <input
          type="checkbox"
          aria-label={locale === 'en' ? 'Pin the single workspace' : '固定唯一工作区'}
          checked={fixed}
          onChange={(event) => { commitFixed(event.target.checked) }}
        />
        <span>
          <strong>{locale === 'en' ? 'Pin the single workspace' : '固定唯一工作区'}</strong>
          <small>{locale === 'en'
            ? `Keep only the "Project Brain" workspace, pinned to ${`${'Home'}/starlight_xmzn`}; hide historical workspaces and disallow create/delete/rename.`
            : `仅保留「项目智脑」工作区，固定到 ${`${'主目录'}/starlight_xmzn`}；隐藏历史工作区并禁止新增/删除/重命名。`}</small>
        </span>
      </label>
    </section>
  )
}
