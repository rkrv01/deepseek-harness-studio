import { useEffect, useMemo, useRef, useState } from 'react'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ProjectBrainNextAction, ProjectBrainState } from './state.ts'
import { MEETING_ANALYSIS_MOCK, PROJECT_BRAIN_PLAN } from '../project-data.ts'
import type { ProjectBrainMeetingActionItem } from '../project-data.ts'
import { parseProjectBrainScenarioPayload, parseProjectBrainSurfacePayload, projectBrainScenario } from '../scenario-registry.ts'
import css from './ProjectBrainTurnTail.module.css'
import { ProjectInitializationProgress, ProjectPlatformSyncProgress, ProjectReadyCard } from './ProjectBrainMessageDock.tsx'
import { ProjectBrainScenarioSurface } from './ProjectBrainScenarioSurface.tsx'

export interface ProjectBrainTurnTailInjected {
  hooks: { projectBrain: import('@deepseek-ai/dsh-client-runtime/client').ObservableSnapshot<ProjectBrainState> }
  enabled: () => boolean
  openDetails: () => void
  restorePlan: () => void
  restoreMeetingPlan: (items: readonly ProjectBrainMeetingActionItem[]) => void
  confirmPlan: () => void
  retryPlatformData: () => void
  continueProjectAction: (actionId: ProjectBrainNextAction['id']) => void
  markExecuted: () => void
  markExecutionFailed: () => void
  confirmMeetingPlan: () => void
  markMeetingPlanReady: () => void
  markMeetingExecuted: () => void
  confirmBriefing: () => void
}

/** Render scenario controls only beneath the assistant turn that owns them. */
export function ProjectBrainTurnTail({ turn, useProjectBrain, enabled, openDetails, restorePlan, restoreMeetingPlan, confirmPlan, retryPlatformData, continueProjectAction, markExecuted, markExecutionFailed, confirmMeetingPlan, markMeetingPlanReady, markMeetingExecuted: markMeetingExecutedCb, confirmBriefing }: PropsRuntime<'conversation.chat.turnTail'> & InjectFace<ProjectBrainTurnTailInjected>) {
  const state = useProjectBrain(s => s)
  const cardRef = useRef<HTMLDivElement>(null)
  const turnText = turn?.steps.flatMap(step => step.data.get('assistant-step')?.blocks ?? []).filter(block => block.kind === 'text').map(block => block.text).join('') ?? ''
  const envelope = parseProjectBrainScenarioPayload<unknown>(turnText)
  const surface = parseProjectBrainSurfacePayload(turnText)
  const projectPlanTurn = turn === undefined
    ? state.activeScenario === 'project-launch' && state.phase === 'review-ready'
    : turnText.includes('project-brain:launch-plan') || turnText.includes('项目导入与初始化方案：') || envelope?.scenarioId === 'project-launch' && envelope.action === 'revision'
  const meetingPlanTurn = turnText.includes('project-brain:meeting-plan') || envelope?.scenarioId === 'meeting-actions' && envelope.action === 'revision'
  const projectExecutionTurn = /收到，开始按当前方案完成项目初始化|正在同步项目数据到项目智脑平台|正在重新加载项目智脑平台模拟数据|project-brain:platform-(?:ready|failed)/u.test(turnText)
  const meetingExecutionTurn = turnText.includes('project-brain:meeting-executed') || envelope?.scenarioId === 'meeting-actions' && envelope.action === 'confirm'
  const briefingReviewTurn = turnText.includes('project-brain:executive-briefing') || envelope?.scenarioId === 'executive-briefing' && envelope.action === 'confirm'
  const briefingReadyTurn = turnText.includes('project-brain:executive-briefing-ready')
  const meetingPayload = envelope?.scenarioId === 'meeting-actions' && Array.isArray(envelope.payload)
    ? envelope.payload as readonly ProjectBrainMeetingActionItem[]
    : MEETING_ANALYSIS_MOCK.actionItems

  useEffect(() => {
    if (enabled() && projectPlanTurn && state.plan === null) restorePlan()
  }, [enabled, projectPlanTurn, restorePlan, state.plan])
  useEffect(() => {
    if (!enabled() || !meetingPlanTurn) return
    if (state.activeScenario !== 'meeting-actions' || state.phase === 'idle' || state.meetingItems.length === 0 && meetingPayload.length > 0) restoreMeetingPlan(meetingPayload)
  }, [enabled, meetingPayload, meetingPlanTurn, restoreMeetingPlan, state.activeScenario, state.meetingItems.length, state.phase])
  useEffect(() => {
    if (state.phase !== 'review-ready') return
    const timers = [120, 700, 1_400, 2_200].map((delay, index) => window.setTimeout(() => {
      cardRef.current?.scrollIntoView?.({ behavior: index === 0 ? 'smooth' : 'auto', block: 'center' })
    }, delay))
    return () => { timers.forEach((timer) => { window.clearTimeout(timer) }) }
  }, [state.phase])
  useEffect(() => {
    if (turnText.includes('project-brain:platform-ready')) markExecuted()
    if (turnText.includes('project-brain:platform-failed')) markExecutionFailed()
    if (meetingPlanTurn && (state.phase === 'analyzing' || state.phase === 'revising')) markMeetingPlanReady()
    if (meetingExecutionTurn && turnText.includes('project-brain:meeting-executed')) markMeetingExecutedCb()
  }, [markExecuted, markExecutionFailed, markMeetingPlanReady, markMeetingExecutedCb, meetingExecutionTurn, meetingPlanTurn, state.phase, turnText])

  if (!enabled()) return null
  if (surface !== null) return <ProjectBrainScenarioSurface surface={surface} />
  if (briefingReadyTurn) return <ExecutiveBriefingReceiptCard />
  if (briefingReviewTurn) return <ExecutiveBriefingReviewCard onConfirm={confirmBriefing} />
  if (state.activeScenario === 'project-launch' && state.phase === 'review-ready' && projectPlanTurn) {
    const scenario = projectBrainScenario('project-launch')
    return (
      <div ref={cardRef} className={css.root}>
        <span className={css.label}>{scenario.review.title}</span>
        <span className={css.summary}>{scenario.review.summary}</span>
        <div className={css.actions}><button type="button" className={css.primary} onClick={confirmPlan}>{scenario.review.confirmLabel}</button><button type="button" className={css.button} onClick={openDetails}>{scenario.review.editLabel}</button></div>
      </div>
    )
  }
  if (state.activeScenario === 'meeting-actions' && state.phase === 'review-ready' && meetingPlanTurn) return <MeetingAnalysisCard items={state.meetingItems} onConfirm={confirmMeetingPlan} openDetails={openDetails} />
  if (state.activeScenario === 'meeting-actions' && state.phase === 'executing' && meetingExecutionTurn) return <MeetingExecutionProgress />
  if (state.activeScenario === 'meeting-actions' && state.phase === 'completed' && meetingExecutionTurn) return <MeetingResultCard items={state.meetingItems} onContinue={continueProjectAction} />
  if (!projectExecutionTurn) return null
  if (state.activeScenario === 'project-launch' && state.phase === 'executing') return <ProjectInitializationProgress />
  if (state.activeScenario === 'project-launch' && state.phase === 'syncing') return <ProjectPlatformSyncProgress />
  if (state.activeScenario === 'project-launch' && state.phase === 'failed') return <section className={css.failed} aria-live="polite"><strong>平台模拟数据尚未加载</strong><span>项目方案已保留，请检查服务连接后重新加载。</span><button type="button" onClick={retryPlatformData}>重试加载</button></section>
  if (state.activeScenario === 'project-launch' && state.phase === 'completed') return <ProjectReadyCard plan={state.plan} onContinue={continueProjectAction} />
  return null
}

function ExecutiveBriefingReviewCard({ onConfirm }: { readonly onConfirm: () => void }): JSX.Element {
  return <section className={css.briefingCard} aria-label="汇报材料确认">
    <div><span>汇报材料已就绪</span><p>确认后生成领导摘要、口头稿和 PPT 提纲演示包。</p></div>
    <button type="button" className={css.primary} onClick={onConfirm}>确认生成汇报包</button>
  </section>
}

function ExecutiveBriefingReceiptCard(): JSX.Element {
  return <section className={css.meetingResult} aria-label="汇报包已生成">
    <div className={css.meetingResultHead}><span className={css.meetingResultMark}>✓</span><div><p>汇报包已生成</p><h3>{PROJECT_BRAIN_PLAN.project.name}</h3><small>已整理为集团领导汇报口径</small></div></div>
    <div className={css.meetingResultStats}><div><strong>{PROJECT_BRAIN_PLAN.project.progress}%</strong><span>当前进度</span></div><div><strong>5</strong><span>PPT 提纲</span></div><div><strong>3</strong><span>协调事项</span></div></div>
    <div className={css.meetingResultNote}><p>包含领导摘要、风险说明、需集团协调事项、5 分钟口头稿和 PPT 汇报提纲。</p></div>
  </section>
}

/** Meeting execution plan confirmation card. */
function MeetingAnalysisCard({ items, onConfirm, openDetails }: { readonly items: readonly ProjectBrainMeetingActionItem[]; readonly onConfirm: () => void; readonly openDetails: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const stats = useMemo(() => meetingStats(items), [items])
  return (
    <section className={css.meetingCard} aria-label="会议任务拆解">
      <div className={css.meetingCardHeader}>
        <span className={css.meetingCardTitle}>会议任务拆解</span>
        <span className={css.meetingCardHint}>请确认以下事项后点击“确认执行”</span>
      </div>
      <div className={css.meetingStats}>
        <div className={css.meetingStatItem}><span className={css.meetingStatNumber}>{stats.newTasks}</span><span className={css.meetingStatLabel}>新建任务</span></div>
        <div className={css.meetingStatDivider} />
        <div className={css.meetingStatItem}><span className={css.meetingStatNumber}>{stats.updateTasks}</span><span className={css.meetingStatLabel}>更新任务</span></div>
        <div className={css.meetingStatDivider} />
        <div className={css.meetingStatItem}><span className={css.meetingStatNumber}>{stats.newRisks}</span><span className={css.meetingStatLabel}>新增风险</span></div>
      </div>
      <div className={css.meetingItemList}>
        {items.map((item) => {
          const tag = item.type === 'new-task' ? { label: '新建', cls: css.tagNew } : item.type === 'update-task' ? { label: '更新', cls: css.tagUpdate } : { label: '风险', cls: css.tagRisk }
          const isExpanded = expandedId === item.id
          return (
            <div key={item.id} className={css.meetingItem}>
              <button type="button" className={css.meetingItemHeader} onClick={() => { setExpandedId(isExpanded ? null : item.id) }}>
                <span className={`${css.meetingTag} ${tag.cls}`}>{tag.label}</span>
                <span className={css.meetingItemTitle}>{item.title}</span>
                <span className={css.meetingItemOwner}>{item.owner}</span>
                <span className={css.meetingItemDue}>{item.dueDate}</span>
                <span className={css.meetingItemArrow}>{isExpanded ? '▼' : '▶'}</span>
              </button>
              {isExpanded && <div className={css.meetingItemBody}><p className={css.meetingItemSource}>会议原文：<em>“{item.source}”</em></p>{item.subtasks.length > 0 && <div className={css.meetingSubtaskList}><span className={css.meetingSubtaskTitle}>子任务</span>{item.subtasks.map(subtask => <div key={subtask.id} className={css.meetingSubtaskRow}><span className={css.meetingSubtaskDot} aria-hidden="true" /><span className={css.meetingSubtaskName}>{subtask.title}</span><span className={css.meetingSubtaskOwner}>{subtask.owner}</span><span className={css.meetingSubtaskDue}>{subtask.dueDate}</span></div>)}</div>}</div>}
            </div>
          )
        })}
      </div>
      <div className={css.meetingCardActions}><button type="button" className={css.button} onClick={openDetails}>编辑任务方案</button><button type="button" className={css.primary} onClick={onConfirm}>确认执行</button></div>
    </section>
  )
}

/** Meeting execution progress indicator. */
function MeetingExecutionProgress() {
  const [activeStep, setActiveStep] = useState(0)
  const steps = projectBrainScenario('meeting-actions').execution.steps
  useEffect(() => {
    const timer = window.setInterval(() => { setActiveStep(current => Math.min(current + 1, steps.length - 1)) }, 1_500)
    return () => { window.clearInterval(timer) }
  }, [steps.length])
  return <section className={css.meetingProgress} aria-live="polite" aria-label="正在执行会议方案"><div className={css.meetingProgressHead}><span className={css.loadingDot} /><div><strong>正在执行会议方案</strong><p>正在根据分析结果创建任务、更新风险并配置提醒…</p></div><span className={css.percent}>{Math.min(95, 30 + activeStep * 30)}%</span></div><ol className={css.meetingProgressSteps}>{steps.map((step, index) => <li key={step} data-state={index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending'}><span>{index < activeStep ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>{step}</strong><small>{index < activeStep ? '已完成' : index === activeStep ? '正在处理' : '等待执行'}</small></div></li>)}</ol></section>
}

/** Meeting execution result card. */
function MeetingResultCard({ items, onContinue }: { readonly items: readonly ProjectBrainMeetingActionItem[]; readonly onContinue?: (actionId: ProjectBrainNextAction['id']) => void }) {
  const stats = meetingStats(items)
  return <section className={css.meetingResult} aria-label="会议执行完成"><div className={css.meetingResultHead}><span className={css.meetingResultMark}>✓</span><div><p>会议执行完成</p><h3>{MEETING_ANALYSIS_MOCK.meetingTitle}</h3><small>共处理 {items.length} 项行动事项</small></div></div><div className={css.meetingResultStats}><div><strong>{stats.newTasks}</strong><span>新建任务</span></div><div><strong>{stats.updateTasks}</strong><span>更新任务</span></div><div><strong>{stats.newRisks}</strong><span>新增风险</span></div></div><div className={css.meetingResultNote}><p>已创建的任务将在截止日前自动提醒负责人，风险状态已同步至项目风险台账。</p></div><div className={css.meetingResultActions}><button type="button" className={css.button} onClick={() => { onContinue?.('meeting-actions') }}>继续整理会议</button><button type="button" className={css.primary} onClick={() => { onContinue?.('my-day') }}>看看我今天该做什么</button></div></section>
}

function meetingStats(items: readonly ProjectBrainMeetingActionItem[]): { readonly newTasks: number; readonly updateTasks: number; readonly newRisks: number } {
  return {
    newTasks: items.filter(item => item.type === 'new-task').length,
    updateTasks: items.filter(item => item.type === 'update-task').length,
    newRisks: items.filter(item => item.type === 'new-risk').length,
  }
}
