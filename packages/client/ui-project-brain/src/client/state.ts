import { defineStore, type EngineStoreHandle, type EngineStoreInstance } from '@deepseek-ai/dsh-client-runtime/client'
import { MEETING_ANALYSIS_MOCK, PROJECT_BRAIN_PLAN } from '../project-data.ts'
import type { ProjectBrainMeetingActionItem, ProjectBrainPlanData, ProjectBrainProjectData, ProjectBrainRiskData, ProjectBrainStageData, ProjectBrainTaskData } from '../project-data.ts'
import type { ProjectBrainRunPhase, ProjectBrainScenarioId } from '../scenario-registry.ts'

export type { ProjectBrainScenarioId } from '../scenario-registry.ts'
export type ProjectBrainProject = ProjectBrainProjectData
export type ProjectBrainStage = ProjectBrainStageData
export type ProjectBrainTask = ProjectBrainTaskData
export type ProjectBrainRisk = ProjectBrainRiskData
export type { ProjectBrainPlanData }

/** Browser-retained document metadata; file bytes never leave the browser. */
export interface ProjectBrainFileMeta { readonly name: string; readonly type: string; readonly size: number; readonly lastModified?: number }
export interface ProjectBrainLaunchPlan extends ProjectBrainPlanData { readonly documents: readonly ProjectBrainFileMeta[] }
export interface ProjectBrainMessage { readonly id: string; readonly role: 'user' | 'assistant'; readonly text: string }
export interface ProjectBrainNextAction { readonly id: Exclude<ProjectBrainScenarioId, 'project-launch'>; readonly title: string; readonly description: string; readonly prompt: string }
export interface ProjectBrainState {
  activeScenario: ProjectBrainScenarioId | null
  phase: ProjectBrainRunPhase
  messages: ProjectBrainMessage[]
  plan: ProjectBrainLaunchPlan | null
  meetingItems: ProjectBrainMeetingActionItem[]
  nextActions: ProjectBrainNextAction[]
  preparedAction: ProjectBrainNextAction | null
}
export interface ProjectBrainLaunchOutcome { readonly kind: 'success' | 'ignored' }

const NEXT_ACTIONS: readonly ProjectBrainNextAction[] = [
  { id: 'meeting-actions', title: '帮我整理项目会议', description: '上传会议纪要后，把事项、责任人和截止时间落到项目里。', prompt: '帮我整理这个项目的会议纪要，把里面的事项落到项目里。' },
  { id: 'project-copilot', title: '帮我托管这个项目', description: '每天自动看进度、风险和阻塞，需要我处理时再提醒。', prompt: '从今天开始帮我托管这个项目，重点盯进度、风险和需要我协调的事项。' },
  { id: 'my-day', title: '看看我今天该做什么', description: '按角色、任务状态和紧急程度，整理今天的个人工作清单。', prompt: '基于这个项目，帮我看看我今天到底该干什么。' },
  { id: 'executive-briefing', title: '准备下一次领导汇报', description: '自动汇总项目进展、风险、决策点和汇报材料草稿。', prompt: '下周要给集团领导汇报，帮我准备这个项目的汇报材料。' },
]

const INITIAL_PROJECT_PLAN = PROJECT_BRAIN_PLAN

/** Create the Project Brain store handle. */
export function createProjectBrainStore(): EngineStoreHandle<ProjectBrainState, {}> {
  return defineStore({ init: (): ProjectBrainState => ({ activeScenario: null, phase: 'idle', messages: [], plan: null, meetingItems: [], nextActions: [], preparedAction: null }), actions: {} })
}

/** Start the fixed project-launch scenario when the user's prompt asks for it. */
export function launchProjectScenario(store: EngineStoreInstance<ProjectBrainState, {}>, input: { readonly text: string; readonly files: readonly ProjectBrainFileMeta[] }): ProjectBrainLaunchOutcome {
  if (!isLaunchPrompt(input.text)) return { kind: 'ignored' }
  store.store.update((draft) => {
    draft.activeScenario = 'project-launch'
    draft.phase = 'analyzing'
    draft.plan = clonePlan({ ...INITIAL_PROJECT_PLAN, documents: input.files })
    draft.nextActions = []
    draft.preparedAction = null
  })
  return { kind: 'success' }
}

/** Mark the native assistant response as complete without opening the editor. */
export function markProjectPlanReady(store: EngineStoreInstance<ProjectBrainState, {}>): void {
  store.store.update((draft) => { if (draft.activeScenario === 'project-launch' && (draft.phase === 'analyzing' || draft.phase === 'revising')) draft.phase = 'review-ready' })
}

/** Rehydrate the fixed demo plan when a historical launch response is opened. */
export function restoreProjectLaunchPlan(store: EngineStoreInstance<ProjectBrainState, {}>): void {
  store.store.update((draft) => {
    if (draft.plan !== null) return
    draft.activeScenario = 'project-launch'
    draft.phase = 'review-ready'
    draft.plan = clonePlan({ ...INITIAL_PROJECT_PLAN, documents: [] })
  })
}

/** Apply a user-edited plan before its native revision prompt begins streaming. */
export function submitProjectPlanRevision(store: EngineStoreInstance<ProjectBrainState, {}>, plan: ProjectBrainLaunchPlan): void {
  store.store.update((draft) => { draft.phase = 'revising'; draft.plan = clonePlan(plan); draft.nextActions = []; draft.preparedAction = null })
}

/** Mark the current confirmed plan as being initialized by the demo agent. */
export function startProjectExecution(store: EngineStoreInstance<ProjectBrainState, {}>): void {
  store.store.update((draft) => { if (draft.plan !== null && draft.activeScenario === 'project-launch' && draft.phase === 'review-ready') draft.phase = 'executing' })
}

/** Mark the deterministic initialization transcript as complete. */
export function markProjectExecuted(store: EngineStoreInstance<ProjectBrainState, {}>): void {
  store.store.update((draft) => { if (draft.activeScenario === 'project-launch' && (draft.phase === 'executing' || draft.phase === 'syncing')) draft.phase = 'completed' })
}

/** Keep the confirmed plan available when the external platform data did not load. */
export function markProjectExecutionFailed(store: EngineStoreInstance<ProjectBrainState, {}>): void {
  store.store.update((draft) => { if (draft.activeScenario === 'project-launch' && (draft.phase === 'executing' || draft.phase === 'syncing')) draft.phase = 'failed' })
}

/** Retry only the platform-demo synchronization after a prior execution failure. */
export function retryProjectPlatformData(store: EngineStoreInstance<ProjectBrainState, {}>): void {
  store.store.update((draft) => { if (draft.plan !== null && draft.activeScenario === 'project-launch' && draft.phase === 'failed') draft.phase = 'syncing' })
}

export interface ProjectBrainRevision { readonly summary: string; readonly details: readonly string[] }

/** Produce a concise human-readable summary for the user message appended after editing. */
export function projectPlanRevisionSummary(before: ProjectBrainLaunchPlan, after: ProjectBrainLaunchPlan): string {
  const changes: string[] = []
  if (before.project.name !== after.project.name) changes.push(`将项目名称调整为“${after.project.name}”`)
  if (before.project.owner !== after.project.owner) changes.push(`将项目负责人调整为“${after.project.owner}”`)
  if (before.project.startDate !== after.project.startDate || before.project.endDate !== after.project.endDate) changes.push(`调整项目周期为 ${after.project.startDate} 至 ${after.project.endDate}`)
  if (before.project.budget !== after.project.budget) changes.push(`调整项目预算为 ¥${after.project.budget.toLocaleString('zh-CN')}`)
  summarizeCollection('阶段', before.stages, after.stages, changes)
  summarizeCollection('任务', before.tasks, after.tasks, changes)
  summarizeCollection('风险', before.risks, after.risks, changes)
  if (before.knowledgeFolders.join('|') !== after.knowledgeFolders.join('|')) changes.push('调整项目知识目录')
  return changes.length === 0 ? '未修改项目方案。' : `请按以下调整重新生成项目方案：${changes.join('；')}。`
}

/** Produce user-readable summary and concise field-level revision details. */
export function projectPlanRevision(before: ProjectBrainLaunchPlan, after: ProjectBrainLaunchPlan): ProjectBrainRevision {
  const summary = projectPlanRevisionSummary(before, after)
  const details: string[] = []
  if (before.project.name !== after.project.name) details.push(`项目名称：${before.project.name} → ${after.project.name}`)
  if (before.project.owner !== after.project.owner) details.push(`项目负责人：${before.project.owner} → ${after.project.owner}`)
  const updatedStage = after.stages.find((item) => {
    const prior = before.stages.find(candidate => candidate.id === item.id)
    return prior !== undefined && JSON.stringify(prior) !== JSON.stringify(item)
  })
  const priorStage = updatedStage === undefined ? undefined : before.stages.find(item => item.id === updatedStage.id)
  if (updatedStage !== undefined && priorStage !== undefined) {
    const fields = [
      priorStage.owner !== updatedStage.owner ? `负责人 ${priorStage.owner} → ${updatedStage.owner}` : '',
      priorStage.startDate !== updatedStage.startDate || priorStage.endDate !== updatedStage.endDate ? `周期 ${updatedStage.startDate} 至 ${updatedStage.endDate}` : '',
      priorStage.deliverable !== updatedStage.deliverable ? '交付物已更新' : '',
    ].filter(Boolean)
    details.push(`${updatedStage.name}：${fields.join('；')}`)
  }
  const addedTasks = after.tasks.filter(item => !before.tasks.some(prior => prior.id === item.id)).length
  const removedTasks = before.tasks.filter(item => !after.tasks.some(next => next.id === item.id)).length
  const addedRisks = after.risks.filter(item => !before.risks.some(prior => prior.id === item.id)).length
  const removedRisks = before.risks.filter(item => !after.risks.some(next => next.id === item.id)).length
  if (addedTasks > 0) details.push(`新增 ${addedTasks} 项任务`)
  if (removedTasks > 0) details.push(`删除 ${removedTasks} 项任务`)
  if (addedRisks > 0) details.push(`新增 ${addedRisks} 项风险`)
  if (removedRisks > 0) details.push(`删除 ${removedRisks} 项风险`)
  return { summary, details: details.slice(0, 5) }
}

/** Return a mutable-safe copy that can become an editor draft. */
export function clonePlan(plan: ProjectBrainLaunchPlan): ProjectBrainLaunchPlan {
  return { project: { ...plan.project }, stages: plan.stages.map(stage => ({ ...stage })), tasks: plan.tasks.map(task => ({ ...task })), risks: plan.risks.map(risk => ({ ...risk })), knowledgeFolders: [...plan.knowledgeFolders], meeting: { ...plan.meeting, actions: plan.meeting.actions.map(action => ({ ...action })) }, knowledgeDocuments: plan.knowledgeDocuments.map(document => ({ ...document })), documents: [...plan.documents] }
}

/** Serialize a revision as an invisible payload carried by the native user message. */
export function projectPlanRevisionPayload(plan: ProjectBrainLaunchPlan): string { return encodeURIComponent(JSON.stringify(plan)) }
/** Serialize concise revision details for the transcript disclosure. */
export function projectPlanRevisionDetailsPayload(details: readonly string[]): string { return encodeURIComponent(JSON.stringify(details)) }
/** Serialize the current plan for the confirmation flow. */
export function projectPlanConfirmationPayload(plan: ProjectBrainLaunchPlan): string { return projectPlanRevisionPayload(plan) }

/** Prepare a later daily-use scenario without simulating its full flow. */
export function prepareNextProjectAction(store: EngineStoreInstance<ProjectBrainState, {}>, actionId: ProjectBrainNextAction['id']): void {
  const action = NEXT_ACTIONS.find(candidate => candidate.id === actionId)
  if (action === undefined) return
  store.store.update((draft) => { draft.activeScenario = action.id; draft.phase = 'next-action-ready'; draft.preparedAction = action; draft.nextActions = [...NEXT_ACTIONS] })
}

/** Start the meeting-actions scenario when the user prompt asks for meeting minutes. */
export function launchMeetingScenario(store: EngineStoreInstance<ProjectBrainState, {}>, items: readonly ProjectBrainMeetingActionItem[] = MEETING_ANALYSIS_MOCK.actionItems): void {
  store.store.update((draft) => {
    draft.activeScenario = 'meeting-actions'
    draft.phase = 'analyzing'
    if (draft.plan === null) draft.plan = clonePlan({ ...INITIAL_PROJECT_PLAN, documents: [] })
    draft.meetingItems = cloneMeetingItems(items)
    draft.nextActions = []
    draft.preparedAction = null
  })
}

/** Mark the meeting analysis as complete and the execution plan as ready. */
export function markMeetingPlanReady(store: EngineStoreInstance<ProjectBrainState, {}>): void {
  store.store.update((draft) => { if (draft.activeScenario === 'meeting-actions' && (draft.phase === 'analyzing' || draft.phase === 'revising')) draft.phase = 'review-ready' })
}

/** Replace the current meeting draft before the revised response begins. */
export function submitMeetingRevision(store: EngineStoreInstance<ProjectBrainState, {}>, items: readonly ProjectBrainMeetingActionItem[]): void {
  store.store.update((draft) => {
    draft.activeScenario = 'meeting-actions'
    draft.phase = 'revising'
    draft.meetingItems = cloneMeetingItems(items)
  })
}

/** Restore the meeting review state from a historical assistant response. */
export function restoreMeetingPlan(store: EngineStoreInstance<ProjectBrainState, {}>, items: readonly ProjectBrainMeetingActionItem[]): void {
  store.store.update((draft) => {
    draft.activeScenario = 'meeting-actions'
    draft.phase = 'review-ready'
    if (draft.plan === null) draft.plan = clonePlan({ ...INITIAL_PROJECT_PLAN, documents: [] })
    draft.meetingItems = cloneMeetingItems(items)
  })
}

/** Confirm the meeting execution plan and start executing. */
export function confirmMeetingExecution(store: EngineStoreInstance<ProjectBrainState, {}>): void {
  store.store.update((draft) => { if (draft.activeScenario === 'meeting-actions' && draft.phase === 'review-ready') draft.phase = 'executing' })
}

/** Mark the meeting execution as complete. */
export function markMeetingExecuted(store: EngineStoreInstance<ProjectBrainState, {}>): void {
  store.store.update((draft) => {
    if (draft.activeScenario !== 'meeting-actions' || draft.phase !== 'executing' || draft.plan === null) return
    draft.plan = applyMeetingItems(draft.plan, draft.meetingItems)
    draft.phase = 'completed'
  })
}

/** Return a mutable-safe meeting action list for cards and editors. */
export function cloneMeetingItems(items: readonly ProjectBrainMeetingActionItem[]): ProjectBrainMeetingActionItem[] {
  return items.map(item => ({ ...item, subtasks: item.subtasks.map(subtask => ({ ...subtask })) }))
}

function applyMeetingItems(plan: ProjectBrainLaunchPlan, items: readonly ProjectBrainMeetingActionItem[]): ProjectBrainLaunchPlan {
  const tasks = plan.tasks.map(task => ({ ...task }))
  const risks = plan.risks.map(risk => ({ ...risk }))
  for (const item of items) {
    if (item.type === 'new-task') {
      if (tasks.some(task => task.id === item.id)) continue
      tasks.push({ id: item.id, title: item.title, owner: item.owner, startDate: '2026-08-22', endDate: item.dueDate, dependency: '—', progress: 0, deliverable: item.description, packageId: 'meeting-actions' })
      continue
    }
    if (item.type === 'update-task') {
      const task = tasks.find(candidate => candidate.id === item.relatedTaskId)
      if (task !== undefined) { task.endDate = item.dueDate; task.owner = item.owner }
      continue
    }
    const risk = risks.find(candidate => candidate.relatedTaskId === item.relatedTaskId)
    if (risk !== undefined) { risk.title = item.title; risk.level = '高'; risk.description = item.description; risk.owner = item.owner }
    else risks.push({ id: item.id, title: item.title, type: '延期', level: '高', owner: item.owner, description: item.description, impact: '影响关联任务与项目计划。', mitigation: '持续跟踪会议行动项并及时升级。', relatedTaskId: item.relatedTaskId ?? '' })
  }
  return { ...plan, tasks, risks }
}

function isLaunchPrompt(text: string): boolean { return /启动|创建|新建|初始化/u.test(text) && /项目/u.test(text) }
function summarizeCollection(label: string, before: readonly { readonly id: string }[], after: readonly { readonly id: string }[], changes: string[]): void {
  const beforeIds = new Set(before.map(item => item.id)); const afterIds = new Set(after.map(item => item.id))
  const added = after.filter(item => !beforeIds.has(item.id)).length; const removed = before.filter(item => !afterIds.has(item.id)).length
  if (added > 0) changes.push(`新增 ${added} 项${label}`)
  if (removed > 0) changes.push(`删除 ${removed} 项${label}`)
  if (added === 0 && removed === 0 && JSON.stringify(before) !== JSON.stringify(after)) changes.push(`调整${label}信息`)
}
