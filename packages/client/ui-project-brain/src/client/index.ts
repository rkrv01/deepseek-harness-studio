/** Project Brain demo plugin, browser half. */
import { createElement } from 'react'
import type { ClientContext, EngineStoreInstance, ObservableSnapshot, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConversationSubmitHandler, IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { confirmMeetingExecution, createProjectBrainStore, launchMeetingScenario, launchProjectScenario, markMeetingExecuted, markMeetingPlanReady, markProjectExecuted, markProjectExecutionFailed, markProjectPlanReady, meetingRevision, prepareNextProjectAction, projectPlanRevision, projectPlanRevisionDetailsPayload, restoreMeetingPlan, restoreProjectLaunchPlan, retryProjectPlatformData, startProjectExecution, submitMeetingRevision, submitProjectPlanRevision } from './state.ts'
import type { ProjectBrainNextAction, ProjectBrainState } from './state.ts'
import { PROJECT_BRAIN_PLAN } from '../project-data.ts'
import type { ProjectBrainMeetingActionItem } from '../project-data.ts'
import { matchProjectBrainScenario, parseProjectBrainScenarioPayload, parseProjectBrainSurfacePayload, projectBrainScenarioPayload } from '../scenario-registry.ts'
import { ProjectBrainMessageDock } from './ProjectBrainMessageDock.tsx'
import type { ProjectBrainMessageDockInjected } from './ProjectBrainMessageDock.tsx'
import { ProjectBrainScenarioSurface } from './ProjectBrainScenarioSurface.tsx'
import { ProjectBrainWorkbench } from './ProjectBrainWorkbench.tsx'
import type { ProjectBrainWorkbenchInjected } from './ProjectBrainWorkbench.tsx'
import { ProjectBrainTurnTail } from './ProjectBrainTurnTail.tsx'
import { isProjectBrainPlatformUrl, openProjectBrainPlatform } from './platform-window.ts'
import { setPlatformBaseProvider, setDemoApiBaseProvider, DEFAULT_PLATFORM_BASE_URL, DEFAULT_DEMO_API_BASE_URL, PROJECT_BRAIN_DEV_MODE_EVENT, isProjectBrainDevMode } from './platform-config.ts'
import { PlatformSettingsSection } from './PlatformSettingsSection.tsx'
import { DeveloperModeGate } from './DeveloperModeGate.tsx'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

/** Settings namespace mirroring the host demo adapter's `projectBrain` namespace. */
const PROJECT_BRAIN_SETTINGS_NS = 'project-brain'

export type {
  ProjectBrainFileMeta, ProjectBrainLaunchPlan, ProjectBrainMessage,
  ProjectBrainNextAction, ProjectBrainProject, ProjectBrainRisk, ProjectBrainScenarioId,
  ProjectBrainStage, ProjectBrainState, ProjectBrainTask,
} from './state.ts'

/** Services required by the browser plugin. */
export const inject = ['slots', 'sessions', 'layout', 'conversation', 'settingsScope']

/** Register Project Brain demo surfaces and the deterministic submit handler. */
export function apply(ctx: ClientContext): void {
  const stores = new Map<SessionId, EngineStoreInstance<ProjectBrainState, {}>>()
  const platformScope = ctx.settingsScope?.bind({
    namespace: PROJECT_BRAIN_SETTINGS_NS,
    decode: (value: unknown) => (
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as { readonly platformBaseUrl?: string; readonly demoApiBaseUrl?: string }
        : undefined
    ),
  })
  setPlatformBaseProvider(() => platformScope?.getSnapshot().value?.platformBaseUrl ?? DEFAULT_PLATFORM_BASE_URL)
  setDemoApiBaseProvider(() => platformScope?.getSnapshot().value?.demoApiBaseUrl ?? DEFAULT_DEMO_API_BASE_URL)
  const brainFor = (sessionId: SessionId): EngineStoreInstance<ProjectBrainState, {}> => {
    const existing = stores.get(sessionId)
    if (existing !== undefined) return existing
    const created = createProjectBrainStore().create()
    stores.set(sessionId, created)
    return created
  }
  const hooksFor = (
    sessionId: SessionId,
  ): { projectBrain: ObservableSnapshot<ProjectBrainState> } => ({
    projectBrain: brainFor(sessionId).store,
  })
  const enabled = (sessionId: SessionId): boolean => ctx.sessions.list.getSnapshot().byId[sessionId]?.agentPreset === 'project-brain'
  const conversation = ctx.get('conversation') as IConversation

  const registerSubmit = (): (() => void) => {
    const handler: ConversationSubmitHandler = (request) => {
      if (!enabled(request.sessionId)) return undefined
      const brain = brainFor(request.sessionId)
      const envelope = parseProjectBrainScenarioPayload(request.text)
      if (envelope?.scenarioId === 'project-launch' && envelope.action === 'revision') return undefined
      if (envelope?.scenarioId === 'project-launch' && envelope.action === 'confirm') {
        startProjectExecution(brain)
        return undefined
      }
      if (envelope?.scenarioId === 'meeting-actions' && envelope.action === 'revision') return undefined
      if (envelope?.scenarioId === 'meeting-actions' && envelope.action === 'confirm') {
        confirmMeetingExecution(brain)
        return undefined
      }
      if (request.text.includes('<!-- project-brain:retry-platform -->')) {
        retryProjectPlatformData(brain)
        return undefined
      }
      const scenario = matchProjectBrainScenario(request.text)
      if (scenario?.id === 'meeting-actions') launchMeetingScenario(brain)
      if (scenario?.id === 'project-launch') launchProjectScenario(brain, { text: request.text, files: request.documentMetas.map(document => ({ ...document })) })
      return undefined
    }
    return conversation.registerSubmitHandler(handler)
  }
  ctx.effect(registerSubmit, 'ui-project-brain: submit handler')
  ctx.effect(() => {
    const reusePlatformTab = (event: MouseEvent): void => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const element = event.target
      if (!(element instanceof Element)) return
      const link = element.closest<HTMLAnchorElement>('a[href]')
      if (link === null || !isProjectBrainPlatformUrl(link.href)) return
      event.preventDefault()
      openProjectBrainPlatform(link.href)
    }
    document.addEventListener('click', reusePlatformTab, true)
    return () => { document.removeEventListener('click', reusePlatformTab, true) }
  }, 'ui-project-brain: platform-tab-reuse')

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'project-brain-messages',
    order: -20,
    inject: (sessionId: SessionId): ProjectBrainMessageDockInjected => ({
      hooks: hooksFor(sessionId),
      enabled: () => enabled(sessionId),
      openDetails: () => { ctx.layout.openDetails(840, 400) },
      // Simulated upload: register the demo files' metadata as draft
      // documents so the composer can show them as attached. Bytes never
      // leave the browser; the dock appends the returned ids via its own
      // session inputActions.
      attachDemoDocuments: async (files) => {
        const created = conversation.createDraftDocuments(
          files.map(file => new File([], file.name, { type: file.type, lastModified: Date.now() })),
        )
        return created.map(attachment => attachment.id)
      },
    }),
  }, ProjectBrainMessageDock))

  ctx.slots.inject('conversation.details.workbench', () => ctx.slots.register({
    name: 'conversation.details.workbench',
    inject: (sessionId: SessionId): ProjectBrainWorkbenchInjected => {
      const brain = brainFor(sessionId)
      return {
        hooks: hooksFor(sessionId),
        closeDetails: () => { ctx.layout.closeDetails() },
        submitMeetingRevision: async (items) => {
          const before = brain.getSnapshot().meetingItems
          const revision = meetingRevision(before, items)
          submitMeetingRevision(brain, items)
          ctx.layout.closeDetails()
          await ctx.sessions.binding(sessionId)?.session.prompt([{
            type: 'text',
            text: `${revision.summary}\n\n<!-- project-brain:revision-summary ${projectPlanRevisionDetailsPayload(revision.details)} -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('meeting-actions', 'revision', items)} -->`,
          }], 'queue')
        },
        submitRevision: async (plan) => {
          const current = brain.getSnapshot().plan
          if (current === null) return
          const revision = projectPlanRevision(current, plan)
          submitProjectPlanRevision(brain, plan)
          ctx.layout.closeDetails()
          await ctx.sessions.binding(sessionId)?.session.prompt([{
            type: 'text',
            text: `${revision.summary}\n\n<!-- project-brain:revision-summary ${projectPlanRevisionDetailsPayload(revision.details)} -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('project-launch', 'revision', plan)} -->`,
          }], 'queue')
        },
      }
    },
  }, ProjectBrainWorkbench))

  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    select: () => true,
    priority: 20,
    inject: (sessionId: SessionId) => {
      const brain = brainFor(sessionId)
      return {
        hooks: hooksFor(sessionId),
        enabled: () => enabled(sessionId),
        openDetails: () => { ctx.layout.openDetails(840, 400) },
        restorePlan: () => { restoreProjectLaunchPlan(brain) },
        restoreMeetingPlan: (items: readonly ProjectBrainMeetingActionItem[]) => { restoreMeetingPlan(brain, items) },
        markPlanReady: () => { markProjectPlanReady(brain) },
        confirmPlan: () => {
          const snapshot = brain.getSnapshot()
          if (snapshot.plan === null || snapshot.phase !== 'review-ready' || snapshot.activeScenario !== 'project-launch') return
          startProjectExecution(brain)
          void ctx.sessions.binding(sessionId)?.session.prompt([{
            type: 'text', text: `确认方案，开始执行项目。\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('project-launch', 'confirm', snapshot.plan)} -->`,
          }], 'queue')
        },
        retryPlatformData: () => {
          if (brain.getSnapshot().phase !== 'failed') return
          retryProjectPlatformData(brain)
          void ctx.sessions.binding(sessionId)?.session.prompt([{ type: 'text', text: '重新加载平台模拟数据。\n\n<!-- project-brain:retry-platform -->' }], 'queue')
        },
        continueProjectAction: (actionId: ProjectBrainNextAction['id']) => {
          if (brain.getSnapshot().phase !== 'completed') return
          prepareNextProjectAction(brain, actionId)
          const action = brain.getSnapshot().preparedAction
          if (action !== null) void ctx.sessions.binding(sessionId)?.session.prompt([{ type: 'text', text: action.prompt }], 'queue')
        },
        markExecuted: () => { markProjectExecuted(brain) },
        markExecutionFailed: () => { markProjectExecutionFailed(brain) },
        confirmMeetingPlan: () => {
          const snapshot = brain.getSnapshot()
          if (snapshot.activeScenario !== 'meeting-actions' || snapshot.phase !== 'review-ready') return
          confirmMeetingExecution(brain)
          void ctx.sessions.binding(sessionId)?.session.prompt([{
            type: 'text', text: `确认执行会议方案。\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('meeting-actions', 'confirm', snapshot.meetingItems)} -->`,
          }], 'queue')
        },
        markMeetingPlanReady: () => { markMeetingPlanReady(brain) },
        markMeetingExecuted: () => { markMeetingExecuted(brain) },
        confirmBriefing: (materials: readonly string[]) => {
          void ctx.sessions.binding(sessionId)?.session.prompt([{
            type: 'text', text: `确认生成所选汇报材料（${materials.length} 项）。\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', { projectId: PROJECT_BRAIN_PLAN.project.id, projectName: PROJECT_BRAIN_PLAN.project.name, progress: PROJECT_BRAIN_PLAN.project.progress, materials })} -->`,
          }], 'queue')
        },
      }
    },
  }, ProjectBrainTurnTail))

  // Inline board for assistant replies opening with a surface marker: the board
  // leads the message and the wrap-up prose streams beneath it.
  ctx.provide('assistantSurface', {
    renderLeading: (payload) => {
      const surface = parseProjectBrainSurfacePayload(`<!-- project-brain:surface ${payload} -->`)
      return surface === null ? null : createElement(ProjectBrainScenarioSurface, { surface })
    },
  })

  ctx.slots.inject('settings.footer', () => ctx.slots.register({
    name: 'settings.footer',
    id: 'project-brain-developer-mode',
  }, DeveloperModeGate))

  // The developer settings section only exists while the temporary dev mode is on;
  // it unregisters itself once the session ends.
  ctx.effect(() => {
    let unregister: (() => void) | undefined
    const sync = (): void => {
      if (isProjectBrainDevMode()) {
        unregister ??= ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'project-brain-platform',
          order: 80,
          label: () => '开发者配置',
          inject: (): { readonly scope: typeof platformScope } => ({ scope: platformScope }),
        }, PlatformSettingsSection))
        return
      }
      unregister?.()
      unregister = undefined
    }
    sync()
    window.addEventListener(PROJECT_BRAIN_DEV_MODE_EVENT, sync)
    return () => {
      window.removeEventListener(PROJECT_BRAIN_DEV_MODE_EVENT, sync)
      unregister?.()
    }
  }, 'project-brain: developer settings section')
}
