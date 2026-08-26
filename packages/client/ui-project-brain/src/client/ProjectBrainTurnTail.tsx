import { useEffect, useRef, useState } from 'react'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ProjectBrainState } from './state.ts'
import type { ProjectBrainNextAction } from './state.ts'
import { MEETING_ANALYSIS_MOCK } from '../project-data.ts'
import css from './ProjectBrainTurnTail.module.css'
import { ProjectInitializationProgress, ProjectPlatformSyncProgress, ProjectReadyCard } from './ProjectBrainMessageDock.tsx'

export interface ProjectBrainTurnTailInjected {
  hooks: { projectBrain: import('@deepseek-ai/dsh-client-runtime/client').ObservableSnapshot<ProjectBrainState> }
  enabled: () => boolean
  openDetails: () => void
  restorePlan: () => void
  confirmPlan: () => void
  retryPlatformData: () => void
  continueProjectAction: (actionId: ProjectBrainNextAction['id']) => void
  markExecuted: () => void
  markExecutionFailed: () => void
  confirmMeetingPlan: () => void
  markMeetingPlanReady: () => void
  markMeetingExecuted: () => void
}

/** Keeps the project-plan edit entry attached to the completed assistant response. */
export function ProjectBrainTurnTail({ turn, useProjectBrain, enabled, openDetails, restorePlan, confirmPlan, retryPlatformData, continueProjectAction, markExecuted, markExecutionFailed, confirmMeetingPlan, markMeetingPlanReady, markMeetingExecuted: markMeetingExecutedCb }: PropsRuntime<'conversation.chat.turnTail'> & InjectFace<ProjectBrainTurnTailInjected>) {
  const state = useProjectBrain(s => s)
  const cardRef = useRef<HTMLDivElement>(null)
  const turnText = turn?.steps.flatMap(step => step.data.get('assistant-step')?.blocks ?? []).filter(block => block.kind === 'text').map(block => block.text).join('') ?? ''
  const projectPlanTurn = turn === undefined
    ? state.phase === 'plan-ready'
    : turnText.includes('项目导入与初始化方案：')
  const projectExecutionTurn = turn !== undefined && /收到，开始按当前方案完成项目初始化|正在同步项目数据到项目智脑平台|正在重新加载项目智脑平台模拟数据|<!-- project-brain:platform-(?:ready|failed) -->/u.test(turnText)
  useEffect(() => {
    if (enabled() && projectPlanTurn && state.plan === null) restorePlan?.()
  }, [enabled, projectPlanTurn, restorePlan, state.plan])
  useEffect(() => {
    if (state.phase !== 'plan-ready') return
    const timers = [120, 700, 1_400, 2_200].map((delay, index) => window.setTimeout(() => {
      cardRef.current?.scrollIntoView?.({ behavior: index === 0 ? 'smooth' : 'auto', block: 'center' })
    }, delay))
    return () => { timers.forEach((timer) => { window.clearTimeout(timer) }) }
  }, [state.phase])
  useEffect(() => {
    if (turnText.includes('<!-- project-brain:platform-ready -->')) markExecuted()
    if (turnText.includes('<!-- project-brain:platform-failed -->')) markExecutionFailed()
    if (turnText.includes('<!-- project-brain:meeting-plan -->')) markMeetingPlanReady()
    if (turnText.includes('<!-- project-brain:meeting-executed -->')) markMeetingExecutedCb()
  }, [markExecuted, markExecutionFailed, markMeetingPlanReady, markMeetingExecutedCb, turnText])
  if (!enabled()) return null
  if (state.phase === 'plan-ready') {
    if (!projectPlanTurn) return null
    return (
      <div ref={cardRef} className={css.root}>
        <span className={css.label}>方案已就绪</span>
        <span className={css.summary}>确认后将按当前方案完成项目初始化</span>
        <div className={css.actions}><button type="button" className={css.primary} onClick={confirmPlan}>确认方案，开始执行</button><button type="button" className={css.button} onClick={openDetails}>编辑项目方案</button></div>
      </div>
    )
  }
  if (state.phase === 'meeting-plan-ready') {
    return <MeetingAnalysisCard onConfirm={confirmMeetingPlan} openDetails={openDetails} />
  }
  if (state.phase === 'meeting-executing') {
    return <MeetingExecutionProgress />
  }
  if (state.phase === 'meeting-executed') {
    return <MeetingResultCard plan={state.plan} onContinue={continueProjectAction} />
  }
  if (!projectExecutionTurn) return null
  if (state.phase === 'executing') return <ProjectInitializationProgress />
  if (state.phase === 'syncing-platform') return <ProjectPlatformSyncProgress />
  if (state.phase === 'execution-failed') return <section className={css.failed} aria-live="polite"><strong>平台模拟数据尚未加载</strong><span>项目方案已保留，请检查服务连接后重新加载。</span><button type="button" onClick={retryPlatformData}>重试加载</button></section>
  if (state.phase === 'executed') return <ProjectReadyCard plan={state.plan} onContinue={continueProjectAction} />
  return null
}

/** Meeting execution plan confirmation card. */
function MeetingAnalysisCard({ onConfirm, openDetails }: { readonly onConfirm: () => void; readonly openDetails: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { actionItems: items, stats } = MEETING_ANALYSIS_MOCK
  return (
    <section className={css.meetingCard} aria-label="会议任务拆解">
      <div className={css.meetingCardHeader}>
        <span className={css.meetingCardTitle}>会议任务拆解</span>
        <span className={css.meetingCardHint}>请确认以下事项后点击"确认执行"</span>
      </div>
      <div className={css.meetingStats}>
        <div className={css.meetingStatItem}><span className={css.meetingStatNumber}>{stats.newTasks}</span><span className={css.meetingStatLabel}>新建任务</span></div>
        <div className={css.meetingStatDivider} />
        <div className={css.meetingStatItem}><span className={css.meetingStatNumber}>{stats.updateTasks}</span><span className={css.meetingStatLabel}>更新任务</span></div>
        <div className={css.meetingStatDivider} />
        <div className={css.meetingStatItem}><span className={css.meetingStatNumber}>{stats.newRisks}</span><span className={css.meetingStatLabel}>新增风险</span></div>
      </div>
      <div className={css.meetingItemList}>
        {items.map(item => {
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
              {isExpanded && (
                <div className={css.meetingItemBody}>
                  <p className={css.meetingItemSource}>会议原文：<em>"{item.source}"</em></p>
                  {item.subtasks.length > 0 && (
                    <div className={css.meetingSubtaskList}>
                      <span className={css.meetingSubtaskTitle}>子任务</span>
                      {item.subtasks.map(subtask => (
                        <div key={subtask.id} className={css.meetingSubtaskRow}>
                          <span className={css.meetingSubtaskDot} aria-hidden="true" />
                          <span className={css.meetingSubtaskName}>{subtask.title}</span>
                          <span className={css.meetingSubtaskOwner}>{subtask.owner}</span>
                          <span className={css.meetingSubtaskDue}>{subtask.dueDate}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className={css.meetingCardActions}>
        <button type="button" className={css.button} onClick={openDetails}>编辑任务方案</button>
        <button type="button" className={css.primary} onClick={onConfirm}>确认执行</button>
      </div>
    </section>
  )
}

/** Meeting execution progress indicator. */
function MeetingExecutionProgress() {
  const [activeStep, setActiveStep] = useState(0)
  const steps = ['创建任务并分配负责人', '更新已有任务与风险', '配置提醒与通知']
  useEffect(() => {
    const timer = window.setInterval(() => { setActiveStep(current => Math.min(current + 1, steps.length - 1)) }, 1_500)
    return () => { window.clearInterval(timer) }
  }, [steps.length])
  return (
    <section className={css.meetingProgress} aria-live="polite" aria-label="正在执行会议方案">
      <div className={css.meetingProgressHead}>
        <span className={css.loadingDot} />
        <div><strong>正在执行会议方案</strong><p>正在根据分析结果创建任务、更新风险并配置提醒…</p></div>
        <span className={css.percent}>{Math.min(95, 30 + activeStep * 30)}%</span>
      </div>
      <ol className={css.meetingProgressSteps}>
        {steps.map((step, index) => (
          <li key={step} data-state={index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending'}>
            <span>{index < activeStep ? '✓' : String(index + 1).padStart(2, '0')}</span>
            <div><strong>{step}</strong><small>{index < activeStep ? '已完成' : index === activeStep ? '正在处理' : '等待执行'}</small></div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Meeting execution result card. */
function MeetingResultCard({ onContinue }: { readonly plan: ProjectBrainState['plan']; readonly onContinue?: (actionId: ProjectBrainNextAction['id']) => void }) {
  const { meetingTitle, stats, actionItems } = MEETING_ANALYSIS_MOCK
  const totalItems = actionItems.length
  return (
    <section className={css.meetingResult} aria-label="会议执行完成">
      <div className={css.meetingResultHead}>
        <span className={css.meetingResultMark}>✓</span>
        <div>
          <p>会议执行完成</p>
          <h3>{meetingTitle}</h3>
          <small>共处理 {totalItems} 项行动事项</small>
        </div>
      </div>
      <div className={css.meetingResultStats}>
        <div><strong>{stats.newTasks}</strong><span>新建任务</span></div>
        <div><strong>{stats.updateTasks}</strong><span>更新任务</span></div>
        <div><strong>{stats.newRisks}</strong><span>新增风险</span></div>
      </div>
      <div className={css.meetingResultNote}>
        <p>已创建的任务将在截止日前自动提醒负责人，风险状态已同步至项目风险台账。</p>
      </div>
      <div className={css.meetingResultActions}>
        <button type="button" className={css.button} onClick={() => { onContinue?.('meeting-actions') }}>继续整理会议</button>
        <button type="button" className={css.primary} onClick={() => { onContinue?.('my-day') }}>看看我今天该做什么</button>
      </div>
    </section>
  )
}