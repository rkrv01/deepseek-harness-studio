import registryJson from './scenarios.json' with { type: 'json' }

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

interface ProjectBrainScenarioRegistry {
  readonly version: 1
  readonly scenarios: readonly ProjectBrainScenarioDefinition[]
}

const registry = registryJson as ProjectBrainScenarioRegistry

if (registry.version !== 1) throw new Error(`Unsupported Project Brain scenario registry version: ${String(registry.version)}`)

export const PROJECT_BRAIN_SCENARIOS = registry.scenarios

export function projectBrainScenario(id: ProjectBrainScenarioId): ProjectBrainScenarioDefinition {
  const scenario = PROJECT_BRAIN_SCENARIOS.find(candidate => candidate.id === id)
  if (scenario === undefined) throw new Error(`Unknown Project Brain scenario: ${id}`)
  return scenario
}

export function matchProjectBrainScenario(text: string): ProjectBrainScenarioDefinition | undefined {
  return [...PROJECT_BRAIN_SCENARIOS].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0)).find(scenario => scenario.triggers.some((trigger) => {
    const all = trigger.all?.every(keyword => text.includes(keyword)) ?? true
    const any = trigger.any?.some(keyword => text.includes(keyword)) ?? true
    return all && any
  }))
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
