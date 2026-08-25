/** Project Brain demo plugin, browser half. */
import type { ClientContext, ObservableSnapshot, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConversationSubmitHandler, IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { createProjectBrainStore, launchProjectScenario, markProjectExecuted, markProjectExecutionFailed, markProjectPlanReady, prepareNextProjectAction, projectPlanConfirmationPayload, projectPlanRevision, projectPlanRevisionDetailsPayload, projectPlanRevisionPayload, restoreProjectLaunchPlan, retryProjectPlatformData, startProjectExecution, submitProjectPlanRevision } from './state.ts'
import type { ProjectBrainNextAction, ProjectBrainState } from './state.ts'
import { ProjectBrainMessageDock } from './ProjectBrainMessageDock.tsx'
import type { ProjectBrainMessageDockInjected } from './ProjectBrainMessageDock.tsx'
import { ProjectBrainWorkbench } from './ProjectBrainWorkbench.tsx'
import type { ProjectBrainWorkbenchInjected } from './ProjectBrainWorkbench.tsx'
import { ProjectBrainTurnTail } from './ProjectBrainTurnTail.tsx'
import { isProjectBrainPlatformUrl, openProjectBrainPlatform } from './platform-window.ts'

/** Mirrors the deterministic launch response's presentation duration. */
export const PROJECT_BRAIN_PLAN_READY_DELAY_MS = 14_000

export type {
  ProjectBrainFileMeta, ProjectBrainLaunchPlan, ProjectBrainMessage,
  ProjectBrainNextAction, ProjectBrainProject, ProjectBrainRisk, ProjectBrainScenarioId,
  ProjectBrainStage, ProjectBrainState, ProjectBrainTask,
} from './state.ts'

/** Services required by the browser plugin. */
export const inject = ['slots', 'sessions', 'layout', 'conversation']

/** Register Project Brain demo surfaces and the deterministic submit handler. */
export function apply(ctx: ClientContext): void {
  const handle = createProjectBrainStore()
  const brain = handle.create()
  const source: ObservableSnapshot<ProjectBrainState> = brain.store

  const registerSubmit = (): (() => void) => {
    const conversation = ctx.get('conversation') as IConversation
    const handler: ConversationSubmitHandler = (request) => {
      if (ctx.sessions.list.getSnapshot().byId[request.sessionId]?.agentPreset !== 'project-brain') return undefined
      if (request.text.includes('<!-- project-brain:revision ')) {
        window.setTimeout(() => { markProjectPlanReady(brain) }, PROJECT_BRAIN_PLAN_READY_DELAY_MS)
        return undefined
      }
      if (request.text.includes('<!-- project-brain:confirm ')) {
        startProjectExecution(brain)
        return undefined
      }
      if (request.text.includes('<!-- project-brain:retry-platform -->')) {
        retryProjectPlatformData(brain)
        return undefined
      }
      const outcome = launchProjectScenario(brain, { text: request.text, files: [] })
      if (outcome.kind === 'ignored') return undefined
      window.setTimeout(() => { markProjectPlanReady(brain) }, PROJECT_BRAIN_PLAN_READY_DELAY_MS)
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

  const hooks = { projectBrain: source }

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'project-brain-messages',
    order: -20,
    inject: (sessionId: SessionId): ProjectBrainMessageDockInjected => ({
      hooks,
      enabled: () => ctx.sessions.list.getSnapshot().byId[sessionId]?.agentPreset === 'project-brain',
      openDetails: () => { ctx.layout.openDetails(840, 400) },
    }),
  }, ProjectBrainMessageDock))

  ctx.slots.inject('conversation.details.workbench', () => ctx.slots.register({
    name: 'conversation.details.workbench',
    inject: (sessionId: SessionId): ProjectBrainWorkbenchInjected => ({
      hooks,
      submitRevision: async (plan) => {
        const current = brain.getSnapshot().plan
        if (current === null) return
        const revision = projectPlanRevision(current, plan)
        submitProjectPlanRevision(brain, plan)
        ctx.layout.closeDetails()
        window.setTimeout(() => { markProjectPlanReady(brain) }, PROJECT_BRAIN_PLAN_READY_DELAY_MS)
        await ctx.sessions.binding(sessionId)?.session.prompt([{
          type: 'text',
          text: `${revision.summary}\n\n<!-- project-brain:revision-summary ${projectPlanRevisionDetailsPayload(revision.details)} -->\n<!-- project-brain:revision ${projectPlanRevisionPayload(plan)} -->`,
        }], 'queue')
      },
    }),
  }, ProjectBrainWorkbench))

  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    select: () => true,
    priority: 20,
    inject: () => ({
      hooks,
      enabled: () => {
        const current = ctx.sessions.list.getSnapshot().current
        return current !== undefined && ctx.sessions.list.getSnapshot().byId[current]?.agentPreset === 'project-brain'
      },
      openDetails: () => { ctx.layout.openDetails(840, 400) },
      restorePlan: () => { restoreProjectLaunchPlan(brain) },
      confirmPlan: () => {
        const sessionId = ctx.sessions.list.getSnapshot().current
        const plan = brain.getSnapshot().plan
        if (sessionId === undefined || plan === null || brain.getSnapshot().phase !== 'plan-ready') return
        startProjectExecution(brain)
        void ctx.sessions.binding(sessionId)?.session.prompt([{
          type: 'text', text: `确认方案，开始执行项目。\n\n<!-- project-brain:confirm ${projectPlanConfirmationPayload(plan)} -->`,
        }], 'queue')
      },
      retryPlatformData: () => {
        const sessionId = ctx.sessions.list.getSnapshot().current
        if (sessionId === undefined || brain.getSnapshot().phase !== 'execution-failed') return
        retryProjectPlatformData(brain)
        void ctx.sessions.binding(sessionId)?.session.prompt([{ type: 'text', text: '重新加载平台模拟数据。\n\n<!-- project-brain:retry-platform -->' }], 'queue')
      },
      continueProjectAction: (actionId: ProjectBrainNextAction['id']) => {
        const sessionId = ctx.sessions.list.getSnapshot().current
        if (sessionId === undefined || brain.getSnapshot().phase !== 'executed') return
        prepareNextProjectAction(brain, actionId)
        const action = brain.getSnapshot().preparedAction
        if (action === null) return
        void ctx.sessions.binding(sessionId)?.session.prompt([{ type: 'text', text: action.prompt }], 'queue')
      },
      markExecuted: () => { markProjectExecuted(brain) },
      markExecutionFailed: () => { markProjectExecutionFailed(brain) },
    }),
  }, ProjectBrainTurnTail))
}
