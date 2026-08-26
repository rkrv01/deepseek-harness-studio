/** Deterministic, tool-free LLM adapter used only by the project-brain preset. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  LlmAdapter,
  type GenerateOptions,
  type LlmModelInfo,
  type LlmResolvedModelInfo,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { resolveProjectBrainReply } from './scenario.ts'
import type { ProjectBrainReply } from './scenario.ts'
import { createDemoStatusFetch, DemoStatusSynchronizer } from './demo-status.ts'

export { PROJECT_BRAIN_PLAN, resolveProjectBrainReply } from './scenario.ts'
export type { ProjectBrainPlanData, ProjectBrainReply, ProjectBrainReplyKind } from './scenario.ts'

const PROVIDER = 'project-brain-demo'
const MODEL = 'project-brain-demo'
const DEFAULT_DEMO_STATUS_API_URL = 'https://7koxhpk4.ipyingshe.net:54928/demo-control/'
const PROJECT_EXECUTION_SYNC_DELAY_MS = 4_000
/** Presentation pacing for the scripted project launch response. */
export const PROJECT_BRAIN_STREAM_CONFIG = {
  introDelayMs: 1_000,
  chunkChars: 128,
  intervalMs: 300,
} as const

class ProjectBrainDemoAdapter extends LlmAdapter {
  constructor(private readonly synchronizeDemoStatus: (enabled: boolean) => Promise<void>) { super() }
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
    const reply = resolveProjectBrainReply(prompt)
    return streamProjectBrainReply(reply, options.signal ?? new AbortController().signal, this.synchronizeDemoStatus)
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
  const demoStatusApiUrl = config.demoStatusApiUrl ?? DEFAULT_DEMO_STATUS_API_URL
  const synchronizer = new DemoStatusSynchronizer(demoStatusApiUrl, createDemoStatusFetch(config.demoStatusAllowSelfSignedCertificate ?? true))
  const registration = ctx.llm.registerAdapter([PROVIDER], new ProjectBrainDemoAdapter(enabled => synchronizer.ensure(enabled)))
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
    // Filter out framework-injected system-reminder and runtime-context texts —
    // they are not user prompts and their keywords would skew the routing heuristics.
    const texts = options.messages
      .filter(message => message.role === 'user')
      .flatMap(message => message.content.filter(block => block.type === 'text').map(block => block.text))
      .filter(text => !text.startsWith('<system-reminder>') && !text.startsWith('Current runtime context'))
    const latest = texts.at(-1) ?? ''
    // Title generation requests must pass through to the real LLM — the JSON
    // payload contains user prompt keywords that would falsely match scenario
    // regexes and return full demo text as the session title.
    if (latest.startsWith('Generate the session title')) return next()
    const hasLaunch = texts.some(text => /启动|创建|新建|初始化/u.test(text) && /项目/u.test(text))
    const hasConfirmation = texts.some(text => text.includes('<!-- project-brain:confirm ') || /确认方案，开始执行/u.test(text) || /确认执行会议方案/u.test(text))
    // Check for meeting analysis FIRST — before the hasLaunch fallback — so a
    // meeting prompt in a new conversation (or after a launch) routes correctly.
    const meetingMatch = /会议纪要|开完.*会|整理.*项目会议|帮我把会议纪要里的事项落到项目/u.test(latest)
    const reply = meetingMatch
      ? resolveProjectBrainReply(latest)
      : latest.includes('<!-- project-brain:revision ') || latest.includes('<!-- project-brain:confirm ')
        ? resolveProjectBrainReply(latest)
        : hasLaunch && !hasConfirmation
          ? resolveProjectBrainReply('帮我启动智慧园区建设项目。')
          : resolveProjectBrainReply(latest)
    return reply.kind === 'fallback'
      ? next()
      : streamProjectBrainReply(reply, options.signal ?? new AbortController().signal, enabled => synchronizer.ensure(enabled))
  })
}

export const name = 'project-brain-demo'
export const inject = ['llm']

function latestUserText(options: GenerateOptions): string {
  for (let i = options.messages.length - 1; i >= 0; i -= 1) {
    const message = options.messages[i]
    if (message?.role !== 'user') continue
    return message.content.filter(block => block.type === 'text').map(block => block.text).join('')
  }
  return ''
}

async function* streamReply(text: string, signal: AbortSignal, showLaunchThinking = false): AsyncIterable<StreamChunk> {
  if (signal.aborted) return
  if (showLaunchThinking) {
    const thinking = '正在识别项目目标与建设范围，梳理阶段、关键路径和初始风险…'
    yield { type: 'block-start', index: 0, blockType: 'reasoning' }
    await delay(700, signal)
    if (signal.aborted) return
    yield { type: 'reasoning-delta', index: 0, text: thinking }
    await delay(1_300, signal)
    if (signal.aborted) return
    yield { type: 'block-end', index: 0, block: { type: 'reasoning', text: thinking } }
  }
  const textIndex = showLaunchThinking ? 1 : 0
  yield { type: 'block-start', index: textIndex, blockType: 'text' }
  for (let offset = 0; offset < text.length; offset += PROJECT_BRAIN_STREAM_CONFIG.chunkChars) {
    await delay(offset === 0 ? PROJECT_BRAIN_STREAM_CONFIG.introDelayMs : PROJECT_BRAIN_STREAM_CONFIG.intervalMs, signal)
    if (signal.aborted) return
    yield { type: 'text-delta', index: textIndex, text: text.slice(offset, offset + PROJECT_BRAIN_STREAM_CONFIG.chunkChars) }
  }
  if (signal.aborted) return
  yield { type: 'block-end', index: textIndex, block: { type: 'text', text } }
  yield { type: 'usage', usage: { inputTokens: 128, outputTokens: text.length } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

/** Synchronize the platform data switch around the scripted launch lifecycle. */
async function* streamProjectBrainReply(reply: ProjectBrainReply, signal: AbortSignal, synchronizeDemoStatus: (enabled: boolean) => Promise<void>): AsyncIterable<StreamChunk> {
  if (reply.kind === 'launch-plan') {
    try {
      await synchronizeDemoStatus(false)
    } catch (error) {
      yield* streamReply('## 平台模拟数据暂不可用\n\n未能在初始化前关闭平台模拟数据，请确认服务连接后重新发起项目导入。\n\n<!-- project-brain:platform-failed -->', signal)
      return
    }
    yield* streamReply(reply.text, signal, true)
    return
  }
  if (reply.kind === 'launch-receipt') {
    yield* streamExecutionReceipt(reply.text, signal, synchronizeDemoStatus)
    return
  }
  if (reply.kind === 'platform-retry') {
    yield* streamPlatformRetry(signal, synchronizeDemoStatus)
    return
  }
  if (reply.kind === 'meeting-analysis') {
    yield* streamMeetingAnalysis(reply.text, signal)
    return
  }
  if (reply.kind === 'meeting-receipt') {
    yield* streamMeetingExecution(reply.text, signal)
    return
  }
  yield* streamReply(reply.text, signal)
}

/** Stream the meeting analysis with a thinking preamble and timed chunks. */
async function* streamMeetingAnalysis(text: string, signal: AbortSignal): AsyncIterable<StreamChunk> {
  const thinking = '正在阅读会议纪要，识别关键讨论、决策与行动事项…'
  yield { type: 'block-start', index: 0, blockType: 'reasoning' }
  await delay(800, signal)
  if (signal.aborted) return
  yield { type: 'reasoning-delta', index: 0, text: thinking }
  await delay(1_200, signal)
  if (signal.aborted) return
  yield { type: 'block-end', index: 0, block: { type: 'reasoning', text: thinking } }
  // Text block at index 1 (reasoning occupies index 0) — using index 0 here
  // would overwrite the reasoning block and the text would vanish on finish.
  yield { type: 'block-start', index: 1, blockType: 'text' }
  for (let offset = 0; offset < text.length; offset += PROJECT_BRAIN_STREAM_CONFIG.chunkChars) {
    await delay(offset === 0 ? PROJECT_BRAIN_STREAM_CONFIG.introDelayMs : PROJECT_BRAIN_STREAM_CONFIG.intervalMs, signal)
    if (signal.aborted) return
    yield { type: 'text-delta', index: 1, text: text.slice(offset, offset + PROJECT_BRAIN_STREAM_CONFIG.chunkChars) }
  }
  if (signal.aborted) return
  yield { type: 'block-end', index: 1, block: { type: 'text', text } }
  yield { type: 'usage', usage: { inputTokens: 128, outputTokens: text.length } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

/** Stream the meeting execution progress with simulated steps. */
async function* streamMeetingExecution(_text: string, signal: AbortSignal): AsyncIterable<StreamChunk> {
  const progress = ['收到，开始按会议分析结果执行。', '1. ✓ 已创建 5 项新任务，分配负责人与截止时间', '2. ✓ 已更新 1 项已有任务（安防摄像头采购到货时间调整）', '3. ✓ 已新增 1 项风险（设备采购延期风险升级）', '4. ✓ 已配置任务到期提醒与负责人通知']
  let output = ''
  yield { type: 'block-start', index: 0, blockType: 'text' }
  for (const item of progress) {
    const delta = `${output === '' ? '' : '\n'}${item}`
    output += delta
    await delay(650, signal)
    if (signal.aborted) return
    yield { type: 'text-delta', index: 0, text: delta }
  }
  await delay(1_000, signal)
  if (signal.aborted) return
  const summary = '\n\n**本次会议共处理 7 项行动事项**\n\n- 📋 新建任务：5 项\n- 🔄 更新任务：1 项\n- ⚠️ 新增风险：1 项\n\n> 已创建的任务将在截止日前自动提醒负责人，风险状态已同步至项目风险台账，可在项目智脑平台中查看详情。\n\n<!-- project-brain:meeting-executed -->'
  output += summary
  yield { type: 'text-delta', index: 0, text: summary }
  yield { type: 'block-end', index: 0, block: { type: 'text', text: output } }
  yield { type: 'usage', usage: { inputTokens: 128, outputTokens: output.length } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

/** Retry the external-platform synchronization without replaying initialization steps. */
async function* streamPlatformRetry(signal: AbortSignal, synchronizeDemoStatus: (enabled: boolean) => Promise<void>): AsyncIterable<StreamChunk> {
  let text = '正在重新加载项目智脑平台模拟数据…'
  yield { type: 'block-start', index: 0, blockType: 'text' }
  yield { type: 'text-delta', index: 0, text }
  await delay(1_000, signal)
  if (signal.aborted) return
  try {
    await synchronizeDemoStatus(true)
    const delta = '\n\n## 平台模拟数据已加载\n\n项目已同步到项目智脑平台，可以继续进入项目查看详情。\n\n<!-- project-brain:platform-ready -->'
    text += delta
    yield { type: 'text-delta', index: 0, text: delta }
  } catch {
    const delta = '\n\n## 平台模拟数据尚未加载\n\n仍未能开启平台模拟数据，请确认服务连接后再次重试。\n\n<!-- project-brain:platform-failed -->'
    text += delta
    yield { type: 'text-delta', index: 0, text: delta }
  }
  yield { type: 'block-end', index: 0, block: { type: 'text', text } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

/** Stream four business steps, wait for platform synchronization, then expose the final state. */
async function* streamExecutionReceipt(receipt: string, signal: AbortSignal, synchronizeDemoStatus: (enabled: boolean) => Promise<void>): AsyncIterable<StreamChunk> {
  const progress = ['收到，开始按当前方案完成项目初始化。', '1. ✓ 创建项目管理空间', '2. ✓ 初始化阶段与项目计划', '3. ✓ 建立任务、责任关系与风险台账', '4. ✓ 配置项目知识空间与协同规则']
  let text = ''
  yield { type: 'block-start', index: 0, blockType: 'text' }
  for (const item of progress) {
    const delta = `${text === '' ? '' : '\n'}${item}`
    text += delta
    await delay(650, signal)
    if (signal.aborted) return
    yield { type: 'text-delta', index: 0, text: delta }
  }
  const syncing = '\n\n> 正在同步项目数据到项目智脑平台，请稍候…'
  text += syncing
  yield { type: 'text-delta', index: 0, text: syncing }
  await delay(PROJECT_EXECUTION_SYNC_DELAY_MS, signal)
  if (signal.aborted) return
  try {
    await synchronizeDemoStatus(true)
    const ready = receipt.slice(receipt.indexOf('## 项目已就绪'))
    const delta = `\n\n${ready}\n\n<!-- project-brain:platform-ready -->`
    text += delta
    yield { type: 'text-delta', index: 0, text: delta }
  } catch {
    const delta = '\n\n## 平台模拟数据尚未加载\n\n项目方案已保留，但平台模拟数据未能开启。请检查服务连接后重试加载。\n\n<!-- project-brain:platform-failed -->'
    text += delta
    yield { type: 'text-delta', index: 0, text: delta }
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
