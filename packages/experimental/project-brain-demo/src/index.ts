/** Deterministic, tool-free LLM adapter used only by the project-brain preset. */

import { mkdirSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-workspace'
import { FIXED_WORKSPACE_TITLE, starlightFixedWorkspaceDir } from '@deepseek-ai/dsh-host-apiproxy'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  LlmAdapter,
  type GenerateOptions,
  type LlmModelInfo,
  type LlmResolvedModelInfo,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { resolveProjectBrainReply, setDemoPlatformBase } from './scenario.ts'
import type { ProjectBrainReply, ProjectBrainReplyKind } from './scenario.ts'
import { createDemoStatusFetch, DemoStatusSynchronizer } from './demo-status.ts'
import {
  DEFAULT_DEMO_API_BASE_URL,
  DEFAULT_PLATFORM_BASE_URL,
  projectBrainScenario,
  resolveProjectBrainLocale,
} from '@deepseek-ai/dsh-client-ui-project-brain/scenario'
import type { ProjectBrainLocale, ProjectBrainScenarioDefinition, ProjectBrainScenarioId } from '@deepseek-ai/dsh-client-ui-project-brain/scenario'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import '@deepseek-ai/dsh-settings'

export { PROJECT_BRAIN_PLAN, resolveProjectBrainReply } from './scenario.ts'
export type { ProjectBrainPlanData, ProjectBrainReply, ProjectBrainReplyKind } from './scenario.ts'

const PROVIDER = 'project-brain-demo'
const MODEL = 'project-brain-demo'
const PROJECT_EXECUTION_SYNC_DELAY_MS = 4_000

/** Demo item key for the platform's AI task-creation switch (protocol constant). */
const DEMO_TASK_CREATION_KEY = 'aiTaskCreated'

/** Settings namespace owning the configurable platform origin. */
export const PROJECT_BRAIN_SETTINGS_NS = 'project-brain'

class ProjectBrainDemoAdapter extends LlmAdapter {
  constructor(
    private readonly synchronizeDemoStatus: (enabled: boolean) => Promise<void>,
    private readonly synchronizeDemoItem: (key: string, enabled: boolean) => Promise<void>,
    private readonly locale: () => ProjectBrainLocale,
  ) { super() }
  override providerInfo(provider: string) {
    return { id: provider, name: '项目智脑演示模型' }
  }

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([{ provider, id: MODEL, name: '项目智脑演示模型', inputModalities: ['text'] }])
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({ provider, id: model, name: '项目智脑演示模型', inputModalities: ['text'] })
  }

  override stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const prompt = latestUserText(options)
    const locale = this.locale()
    const reply = resolveProjectBrainReply(prompt, locale)
    return streamProjectBrainReply(reply, options.signal ?? new AbortController().signal, locale, this.synchronizeDemoStatus, this.synchronizeDemoItem)
  }
}

/** Register the adapter and force only this preset's requests onto it. */
export interface ProjectBrainDemoConfig {
  readonly demoStatusApiUrl?: string
  /** Enables self-signed TLS only for the configured platform demo-status endpoint. */
  readonly demoStatusAllowSelfSignedCertificate?: boolean
}

/** Register the deterministic adapter with the platform demo-status endpoint. */
export function apply(ctx: Context, config: ProjectBrainDemoConfig = {}): void {
  // The platform origin is user-configurable through 设置 → 开发者配置. Without a
  // mounted settings provider the demo keeps resolving its defaults.
  const platformScope = ctx.settings?.register(settingsNamespace(PROJECT_BRAIN_SETTINGS_NS), z.object({
    platformBaseUrl: z.string().default(DEFAULT_PLATFORM_BASE_URL),
    demoApiBaseUrl: z.string().default(DEFAULT_DEMO_API_BASE_URL),
    fixedWorkspace: z.boolean().default(true),
    showPluginCenter: z.boolean().default(false),
    showPluginDiscovery: z.boolean().default(false),
    showPresetSquare: z.boolean().default(false),
    showAppCenter: z.boolean().default(false),
    // Mirrored from the app locale by the browser plugin; drives reply language.
    language: z.union(['zh', 'en']).required(false),
  }))
  // The app language (set in 设置 → 通用 → Language) is mirrored into this
  // namespace's `language` field by the browser plugin, so the scripted
  // replies and their streamed status lines match the UI locale.
  const demoLocale = (): ProjectBrainLocale => resolveProjectBrainLocale(platformScope?.get()?.language)
  // Server-side sync of the scripted-reply links; the demo-status getter reads the scope live below.
  const syncPlatformBase = (): void => {
    const configured = platformScope?.get()?.platformBaseUrl
    console.info('[project-brain-demo] platform base:', configured)
    setDemoPlatformBase(configured)
  }
  // Fixed-workspace switch: ensure the one directory/registry row exists FIRST,
  // then arm the gateway enforcement (list/create filter against a real record).
  const syncFixedWorkspace = async (): Promise<void> => {
    const enabled = platformScope?.get()?.fixedWorkspace ?? true
    if (enabled) {
      try {
        mkdirSync(starlightFixedWorkspaceDir(), { recursive: true })
        const existing = await ctx.workspaceRegistry.resolveByPath(starlightFixedWorkspaceDir())
        if (existing === undefined) {
          await ctx.workspaceRegistry.create(starlightFixedWorkspaceDir(), FIXED_WORKSPACE_TITLE)
        }
      } catch (error: unknown) {
        console.warn('[project-brain-demo] fixed workspace ensure failed:', error)
      }
    }
    ctx.fixedWorkspaceControl?.setEnabled(enabled)
  }
  const syncSettings = (): void => {
    syncPlatformBase()
    void syncFixedWorkspace()
  }
  ctx.effect(() => {
    syncSettings()
    const off = platformScope?.watch(() => { syncSettings() })
    return () => { off?.() }
  }, 'project-brain: platform + workspace sync')

  // Resolved per call from the settings scope so a developer-config change repoints synchronization without a restart.
  // Returns the API base; DemoStatusSynchronizer appends the endpoint path.
  const demoStatusBase = (): string => {
    if (config.demoStatusApiUrl !== undefined) return config.demoStatusApiUrl
    return platformScope?.get()?.demoApiBaseUrl ?? DEFAULT_DEMO_API_BASE_URL
  }
  const synchronizer = new DemoStatusSynchronizer(
    demoStatusBase,
    createDemoStatusFetch(config.demoStatusAllowSelfSignedCertificate ?? true),
  )
  const synchronizeDemoStatus = (enabled: boolean) => synchronizer.ensure(enabled)
  const synchronizeDemoItem = (key: string, enabled: boolean) => synchronizer.ensureItem(key, enabled)
  const registration = ctx.llm.registerAdapter([PROVIDER], new ProjectBrainDemoAdapter(synchronizeDemoStatus, synchronizeDemoItem, demoLocale))
  ctx.effect(() => registration, 'project-brain-demo: adapter')
  const mounted = new WeakSet<Agent>()
  const mount = (agent: Agent): void => {
    if (agent.session.header.agentPreset !== 'project-brain') return
    if (mounted.has(agent)) return
    mounted.add(agent)
    agent.ctx.on('agent/request', async (_payload, next) => ({
      ...(await next()),
      provider: PROVIDER,
      model: MODEL,
    }))
  }
  if (ctx.agent !== undefined) mount(ctx.agent)
  ctx.on('agent/session-start', ({ agent }: { agent: Agent }) => { mount(agent) })
  ctx.on('llm/stream', (options, next) => {
    const latest = latestUserText(options)
    if (latest.startsWith('Generate the session title')) return next()
    const locale = demoLocale()
    const reply = resolveProjectBrainReply(latest, locale)
    return reply.kind === 'fallback'
      ? next()
      : streamProjectBrainReply(reply, options.signal ?? new AbortController().signal, locale, synchronizeDemoStatus, synchronizeDemoItem)
  })
}

export const name = 'project-brain-demo'
export const inject = ['llm', 'settings', 'workspaceRegistry', 'fixedWorkspaceControl']

function latestUserText(options: GenerateOptions): string {
  for (let i = options.messages.length - 1; i >= 0; i -= 1) {
    const message = options.messages[i]
    if (message?.role !== 'user') continue
    const texts = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .filter(text => !text.startsWith('<system-reminder>') && !text.startsWith('Current runtime context'))
    if (texts.length > 0) return texts.join('')
  }
  return ''
}

/** Replies whose scripted presentation opens with the scenario's thinking preamble. */
const THINKING_REPLY_KINDS: ReadonlySet<ProjectBrainReplyKind> = new Set(['launch-plan', 'meeting-analysis', 'handoff', 'executive-briefing'])

/** Owning scenario for reply kinds that do not carry a scenario id. */
const REPLY_KIND_SCENARIOS: Partial<Record<ProjectBrainReplyKind, ProjectBrainScenarioId>> = {
  'launch-plan': 'project-launch',
  'launch-receipt': 'project-launch',
  'meeting-analysis': 'meeting-actions',
  'meeting-receipt': 'meeting-actions',
  'executive-briefing': 'executive-briefing',
  'briefing-receipt': 'executive-briefing',
  note: 'my-day',
  'platform-retry': 'project-launch',
  fallback: 'project-launch',
}

/** Resolve the scenario whose registered stream pacing applies to one reply. */
export function replyStreamScenario(reply: Pick<ProjectBrainReply, 'kind' | 'scenarioId'>, locale: ProjectBrainLocale = 'zh'): ProjectBrainScenarioDefinition {
  if (reply.scenarioId !== undefined) return projectBrainScenario(reply.scenarioId, locale)
  return projectBrainScenario(REPLY_KIND_SCENARIOS[reply.kind] ?? 'project-launch', locale)
}

interface ScenarioTextOptions { readonly thinking?: string }

/** Split off a trailing run of invisible private payloads so they do not spend paced stream time after the visible reply.
 * Markers are `<kind> [space-encoded-payload]`, e.g. `<!-- project-brain:scenario %7B... -->` or a bare `<!-- project-brain:platform-ready -->`. */
export function splitTrailingPrivateMarkers(text: string): { readonly visible: string; readonly hidden: string } {
  const match = /(?:\s*<!-- project-brain:\S+(?: [A-Za-z0-9%._~-]+)? -->)+\s*$/u.exec(text)
  if (match?.index === undefined) return { visible: text, hidden: '' }
  return { visible: text.slice(0, match.index), hidden: text.slice(match.index) }
}

/**
 * Stream one deterministic document in chunks paced by the scenario registry.
 * @param text Complete document content including any private payloads.
 * @param scenario Scenario whose registered stream pacing applies.
 * @param signal Abort signal that stops the presentation early.
 * @param options Optional thinking preamble rendered before the document.
 */
export async function* streamScenarioText(text: string, scenario: ProjectBrainScenarioDefinition, signal: AbortSignal, options: ScenarioTextOptions = {}): AsyncIterable<StreamChunk> {
  const { introDelayMs, chunkChars, intervalMs } = scenario.stream
  // Leading private markers (inline-surface protocol) attach unpaced so the
  // board mounts before the first visible character; trailing ones stay
  // unpaced so the turn completes right after the last visible character.
  const leading = /^((?:<!-- project-brain:[a-z-]+ [A-Za-z0-9%._~-]+ -->\s*)+)/u.exec(text)
  const bodyStart = leading === null ? 0 : leading[1]?.length ?? 0
  const { visible, hidden } = splitTrailingPrivateMarkers(text)
  const visibleBody = visible.slice(bodyStart)
  let index = 0
  if (options.thinking !== undefined) {
    yield { type: 'block-start', index: 0, blockType: 'reasoning' }
    await delay(800, signal)
    if (signal.aborted) return
    yield { type: 'reasoning-delta', index: 0, text: options.thinking }
    await delay(1_200, signal)
    if (signal.aborted) return
    yield { type: 'block-end', index: 0, block: { type: 'reasoning', text: options.thinking } }
    index = 1
  }
  yield { type: 'block-start', index, blockType: 'text' }
  if (bodyStart > 0) {
    yield { type: 'text-delta', index, text: visible.slice(0, bodyStart) }
  }
  for (let offset = 0; offset < visibleBody.length; offset += chunkChars) {
    await delay(offset === 0 ? introDelayMs : intervalMs, signal)
    if (signal.aborted) return
    yield { type: 'text-delta', index, text: visibleBody.slice(offset, offset + chunkChars) }
  }
  if (hidden !== '') {
    // Invisible payloads carry no waiting experience: attach them immediately so the
    // turn completes right after the last visible character instead of crawling
    // through kilobytes of percent-encoded data at visible-presentation speed.
    if (signal.aborted) return
    yield { type: 'text-delta', index, text: hidden }
  }
  yield { type: 'block-end', index, block: { type: 'text', text } }
  yield { type: 'usage', usage: { inputTokens: 128, outputTokens: text.length } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

/** Stream a scripted reply with its optional thinking preamble and scenario pacing. */
async function* streamDeterministicReply(reply: ProjectBrainReply, signal: AbortSignal, locale: ProjectBrainLocale): AsyncIterable<StreamChunk> {
  const scenario = replyStreamScenario(reply, locale)
  const thinking = THINKING_REPLY_KINDS.has(reply.kind) ? scenario.thinking : undefined
  yield* streamScenarioText(reply.text, scenario, signal, thinking === undefined ? {} : { thinking })
}

/** Route one scripted reply through its streaming presentation and platform synchronization duties. */
async function* streamProjectBrainReply(
  reply: ProjectBrainReply,
  signal: AbortSignal,
  locale: ProjectBrainLocale,
  synchronizeDemoStatus: (enabled: boolean) => Promise<void>,
  synchronizeDemoItem: (key: string, enabled: boolean) => Promise<void>,
): AsyncIterable<StreamChunk> {
  if (reply.kind === 'meeting-receipt') {
    yield* streamMeetingExecutionReceipt(reply.text, signal, synchronizeDemoStatus, synchronizeDemoItem, locale)
    return
  }
  if (reply.kind === 'launch-receipt') {
    yield* streamExecutionReceipt(reply.text, signal, locale, synchronizeDemoStatus)
    return
  }
  if (reply.kind === 'platform-retry') {
    yield* streamPlatformRetry(signal, locale, synchronizeDemoStatus)
    return
  }
  if (reply.kind === 'launch-plan') {
    // Demo presentation never fails on the platform handshake: the pre-close
    // switch is best-effort, and an unreachable service only skips it.
    try {
      await synchronizeDemoStatus(false)
    } catch (error: unknown) {
      console.warn('[project-brain-demo] pre-close demo status skipped:', error)
    }
  }
  yield* streamDeterministicReply(reply, signal, locale)
}

/** Retry the external-platform synchronization without replaying initialization steps. */
async function* streamPlatformRetry(signal: AbortSignal, locale: ProjectBrainLocale, synchronizeDemoStatus: (enabled: boolean) => Promise<void>): AsyncIterable<StreamChunk> {
  const loading = locale === 'en' ? 'Reloading the Project Brain platform demo data…' : '正在重新加载项目智脑平台模拟数据…'
  let text = loading
  yield { type: 'block-start', index: 0, blockType: 'text' }
  yield { type: 'text-delta', index: 0, text }
  await delay(1_000, signal)
  if (signal.aborted) return
  // Demo presentation never fails on the platform handshake: the retry switch
  // is best-effort, and an unreachable service only skips it.
  try {
    await synchronizeDemoStatus(true)
  } catch (error: unknown) {
    console.warn('[project-brain-demo] retry demo status skipped:', error)
  }
  const delta = locale === 'en'
    ? '\n\n## Platform demo data loaded\n\nThe project has been synced to the Project Brain platform. You can now open it and view the details.\n\n<!-- project-brain:platform-ready -->'
    : '\n\n## 平台模拟数据已加载\n\n项目已同步到项目智脑平台，可以继续进入项目查看详情。\n\n<!-- project-brain:platform-ready -->'
  text += delta
  yield { type: 'text-delta', index: 0, text: delta }
  yield { type: 'block-end', index: 0, block: { type: 'text', text } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

/** Stream four business steps, wait for platform synchronization, then expose the final state. */
async function* streamExecutionReceipt(receipt: string, signal: AbortSignal, locale: ProjectBrainLocale, synchronizeDemoStatus: (enabled: boolean) => Promise<void>): AsyncIterable<StreamChunk> {
  const progress = locale === 'en'
    ? ['Understood, initializing the project with the current plan.', '1. ✓ Create the project workspace', '2. ✓ Initialize stages and the project plan', '3. ✓ Set up tasks, ownership, and the risk ledger', '4. ✓ Configure the knowledge space and collaboration rules']
    : ['收到，开始按当前方案完成项目初始化。', '1. ✓ 创建项目管理空间', '2. ✓ 初始化阶段与项目计划', '3. ✓ 建立任务、责任关系与风险台账', '4. ✓ 配置项目知识空间与协同规则']
  let text = ''
  yield { type: 'block-start', index: 0, blockType: 'text' }
  for (const item of progress) {
    const delta = `${text === '' ? '' : '\n'}${item}`
    text += delta
    await delay(650, signal)
    if (signal.aborted) return
    yield { type: 'text-delta', index: 0, text: delta }
  }
  const syncing = locale === 'en'
    ? '\n\n> Syncing project data to the Project Brain platform, please wait…'
    : '\n\n> 正在同步项目数据到项目智脑平台，请稍候…'
  text += syncing
  yield { type: 'text-delta', index: 0, text: syncing }
  await delay(PROJECT_EXECUTION_SYNC_DELAY_MS, signal)
  if (signal.aborted) return
  // Demo presentation never fails on the platform handshake: enabling the
  // switch is best-effort, and an unreachable service only skips it.
  try {
    await synchronizeDemoStatus(true)
  } catch (error: unknown) {
    console.warn('[project-brain-demo] execution demo status skipped:', error)
  }
  const readyMarker = locale === 'en' ? '## Project Ready' : '## 项目已就绪'
  const ready = receipt.includes(readyMarker)
    ? receipt.slice(receipt.indexOf(readyMarker))
    : locale === 'en'
      ? `## Project Ready\n\n**${receipt}**`
      : `## 项目已就绪\n\n**${receipt}**`
  const delta = `\n\n${ready}\n\n<!-- project-brain:platform-ready -->`
  text += delta
  yield { type: 'text-delta', index: 0, text: delta }
  yield { type: 'block-end', index: 0, block: { type: 'text', text } }
  yield { type: 'usage', usage: { inputTokens: 128, outputTokens: text.length } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

/**
 * Stream the meeting execution receipt with the platform switches synchronized
 * once the visible steps finish: the master demo switch and the AI task-creation
 * item both turn on, matching the initialization flow's platform hand-off.
 */
export async function* streamMeetingExecutionReceipt(
  receipt: string,
  signal: AbortSignal,
  synchronizeDemoStatus: (enabled: boolean) => Promise<void>,
  synchronizeDemoItem: (key: string, enabled: boolean) => Promise<void>,
  locale: ProjectBrainLocale = 'zh',
): AsyncIterable<StreamChunk> {
  const scenario = replyStreamScenario({ kind: 'meeting-receipt' }, locale)
  const { visible, hidden } = splitTrailingPrivateMarkers(receipt)
  let text = visible
  yield { type: 'block-start', index: 0, blockType: 'text' }
  for (let offset = 0; offset < text.length; offset += scenario.stream.chunkChars) {
    await delay(offset === 0 ? scenario.stream.introDelayMs : scenario.stream.intervalMs, signal)
    if (signal.aborted) return
    yield { type: 'text-delta', index: 0, text: text.slice(offset, offset + scenario.stream.chunkChars) }
  }
  const syncing = locale === 'en'
    ? '\n\n> Syncing meeting task data to the Project Brain platform, please wait…'
    : '\n\n> 正在同步会议任务数据到项目智脑平台，请稍候…'
  text += syncing
  yield { type: 'text-delta', index: 0, text: syncing }
  await delay(PROJECT_EXECUTION_SYNC_DELAY_MS, signal)
  if (signal.aborted) return
  // Demo presentation never fails on the platform handshake: enabling the
  // switches is best-effort, and an unreachable service only skips it.
  try {
    await synchronizeDemoStatus(true)
  } catch (error: unknown) {
    console.warn('[project-brain-demo] meeting demo status skipped:', error)
  }
  try {
    await synchronizeDemoItem(DEMO_TASK_CREATION_KEY, true)
  } catch (error: unknown) {
    console.warn('[project-brain-demo] meeting task-creation switch skipped:', error)
  }
  const ready = locale === 'en'
    ? '\n\n## Platform demo data loaded\n\nMeeting task data has been synced to the Project Brain platform. Tasks and the risk ledger are updated; you can open the project to view details.\n\n<!-- project-brain:platform-ready -->'
    : '\n\n## 平台模拟数据已加载\n\n会议任务数据已同步到项目智脑平台，任务与风险台账已更新，可以进入项目查看详情。\n\n<!-- project-brain:platform-ready -->'
  text += ready
  yield { type: 'text-delta', index: 0, text: ready }
  if (hidden !== '') {
    text += hidden
    yield { type: 'text-delta', index: 0, text: hidden }
  }
  yield { type: 'block-end', index: 0, block: { type: 'text', text } }
  yield { type: 'usage', usage: { inputTokens: 128, outputTokens: text.length } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds)
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
  })
}
