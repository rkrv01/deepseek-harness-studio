import registryJson from './scenarios.json' with { type: 'json' }
import type { ProjectBrainLocale } from './locale.ts'
import { resolveProjectBrainLocale } from './locale.ts'

export type ProjectBrainScenarioId = 'project-launch' | 'meeting-actions' | 'project-copilot' | 'my-day' | 'executive-briefing'
export type ProjectBrainRunPhase = 'idle' | 'analyzing' | 'review-ready' | 'revising' | 'executing' | 'syncing' | 'failed' | 'completed' | 'next-action-ready'

export interface ProjectBrainTrigger {
  readonly all?: readonly string[]
  readonly any?: readonly string[]
}

export interface ProjectBrainScenarioDefinition {
  readonly id: ProjectBrainScenarioId
  readonly priority?: number
  readonly title: string
  readonly suggestion: string
  readonly triggers: readonly ProjectBrainTrigger[]
  readonly thinking: string
  readonly presentation: { readonly mode: 'document' | 'surface'; readonly template: string }
  readonly stream: { readonly introDelayMs: number; readonly chunkChars: number; readonly intervalMs: number }
  readonly review: { readonly title: string; readonly summary: string; readonly confirmLabel: string; readonly editLabel: string }
  readonly execution: { readonly title: string; readonly steps: readonly string[] }
}

/** Raw scenario entry as stored in scenarios.json, with optional English variants. */
interface ProjectBrainScenarioRecord {
  readonly id: ProjectBrainScenarioId
  readonly priority?: number
  readonly title: string
  readonly titleEn?: string
  readonly suggestion: string
  readonly suggestionEn?: string
  readonly triggers: readonly ProjectBrainTrigger[]
  readonly triggersEn?: readonly ProjectBrainTrigger[]
  readonly thinking: string
  readonly thinkingEn?: string
  readonly presentation: { readonly mode: 'document' | 'surface'; readonly template: string }
  readonly stream: { readonly introDelayMs: number; readonly chunkChars: number; readonly intervalMs: number }
  readonly review: {
    readonly title: string
    readonly titleEn?: string
    readonly summary: string
    readonly summaryEn?: string
    readonly confirmLabel: string
    readonly confirmLabelEn?: string
    readonly editLabel: string
    readonly editLabelEn?: string
  }
  readonly execution: {
    readonly title: string
    readonly titleEn?: string
    readonly steps: readonly string[]
    readonly stepsEn?: readonly string[]
  }
}

interface ProjectBrainScenarioRegistry {
  readonly version: 1
  readonly scenarios: readonly ProjectBrainScenarioRecord[]
}

const registry = registryJson as ProjectBrainScenarioRegistry

if (registry.version !== 1) throw new Error(`Unsupported Project Brain scenario registry version: ${String(registry.version)}`)

export const PROJECT_BRAIN_SCENARIOS = registry.scenarios

/**
 * Resolve one scenario's definition for the requested locale, preferring the
 * locale-specific fields when present and falling back to the Chinese base.
 * @param id - scenario id.
 * @param locale - target locale; defaults to Chinese.
 * @returns the localized scenario definition.
 */
export function projectBrainScenario(id: ProjectBrainScenarioId, locale: ProjectBrainLocale = 'zh'): ProjectBrainScenarioDefinition {
  const scenario = PROJECT_BRAIN_SCENARIOS.find(candidate => candidate.id === id)
  if (scenario === undefined) throw new Error(`Unknown Project Brain scenario: ${id}`)
  if (locale === 'zh') return scenario
  return {
    id: scenario.id,
    ...scenario.priority === undefined ? {} : { priority: scenario.priority },
    title: scenario.titleEn ?? scenario.title,
    suggestion: scenario.suggestionEn ?? scenario.suggestion,
    triggers: scenario.triggersEn ?? scenario.triggers,
    thinking: scenario.thinkingEn ?? scenario.thinking,
    presentation: scenario.presentation,
    stream: scenario.stream,
    review: {
      title: scenario.review.titleEn ?? scenario.review.title,
      summary: scenario.review.summaryEn ?? scenario.review.summary,
      confirmLabel: scenario.review.confirmLabelEn ?? scenario.review.confirmLabel,
      editLabel: scenario.review.editLabelEn ?? scenario.review.editLabel,
    },
    execution: {
      title: scenario.execution.titleEn ?? scenario.execution.title,
      steps: scenario.execution.stepsEn ?? scenario.execution.steps,
    },
  }
}

/**
 * Match a user prompt against scenario triggers in the active locale.
 * @param text - user prompt text.
 * @param locale - locale whose trigger keywords apply; defaults to Chinese.
 * @returns the matched scenario definition, or undefined when no trigger hits.
 */
export function matchProjectBrainScenario(text: string, locale: ProjectBrainLocale = 'zh'): ProjectBrainScenarioDefinition | undefined {
  return [...PROJECT_BRAIN_SCENARIOS]
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))
    .find(scenario => projectBrainScenario(scenario.id, locale).triggers.some((trigger) => {
      const all = trigger.all?.every(keyword => text.toLowerCase().includes(keyword.toLowerCase())) ?? true
      const any = trigger.any?.some(keyword => text.toLowerCase().includes(keyword.toLowerCase())) ?? true
      return all && any
    }))
}

/** Match a user prompt against scenario triggers in the active locale, returning the raw record. */
export function matchProjectBrainScenarioRecord(text: string, locale: string | undefined): ProjectBrainScenarioDefinition | undefined {
  return matchProjectBrainScenario(text, resolveProjectBrainLocale(locale))
}

export interface ProjectBrainScenarioEnvelope<T = unknown> {
  readonly version: 1
  readonly scenarioId: ProjectBrainScenarioId
  readonly action: 'revision' | 'confirm'
  readonly payload: T
}

export interface ProjectBrainSurfaceEnvelope<T = unknown> {
  readonly version: 1
  readonly scenarioId: ProjectBrainScenarioId
  readonly template: string
  readonly data: T
}

export function projectBrainScenarioPayload<T>(scenarioId: ProjectBrainScenarioId, action: ProjectBrainScenarioEnvelope['action'], payload: T): string {
  return encodeURIComponent(JSON.stringify({ version: 1, scenarioId, action, payload } satisfies ProjectBrainScenarioEnvelope<T>))
}

export function parseProjectBrainScenarioPayload<T>(text: string): ProjectBrainScenarioEnvelope<T> | null {
  const match = /<!-- project-brain:scenario ([A-Za-z0-9%._~-]+) -->/u.exec(text)
  if (match?.[1] === undefined) return null
  try {
    const value = JSON.parse(decodeURIComponent(match[1])) as Partial<ProjectBrainScenarioEnvelope<T>>
    if (value.version !== 1 || typeof value.scenarioId !== 'string' || (value.action !== 'revision' && value.action !== 'confirm') || !('payload' in value)) return null
    return value as ProjectBrainScenarioEnvelope<T>
  } catch {
    return null
  }
}

export function projectBrainSurfacePayload<T>(scenarioId: ProjectBrainScenarioId, template: string, data: T): string {
  return encodeURIComponent(JSON.stringify({ version: 1, scenarioId, template, data } satisfies ProjectBrainSurfaceEnvelope<T>))
}

export function parseProjectBrainSurfacePayload<T>(text: string): ProjectBrainSurfaceEnvelope<T> | null {
  const match = /<!-- project-brain:surface ([A-Za-z0-9%._~-]+) -->/u.exec(text)
  if (match?.[1] === undefined) return null
  try {
    const value = JSON.parse(decodeURIComponent(match[1])) as Partial<ProjectBrainSurfaceEnvelope<T>>
    if (value.version !== 1 || typeof value.scenarioId !== 'string' || typeof value.template !== 'string' || !('data' in value)) return null
    return value as ProjectBrainSurfaceEnvelope<T>
  } catch {
    return null
  }
}
