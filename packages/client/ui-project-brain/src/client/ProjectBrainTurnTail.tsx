import { useEffect, useMemo, useRef, useState } from 'react'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ProjectBrainNextAction, ProjectBrainState } from './state.ts'
import { MEETING_ANALYSIS_MOCK, PROJECT_BRAIN_PLAN } from '../project-data.ts'
import type { ProjectBrainCopilotDecision, ProjectBrainCopilotDecisionSelection, ProjectBrainMeetingActionItem } from '../project-data.ts'
import { parseProjectBrainScenarioPayload, parseProjectBrainSurfacePayload, projectBrainScenario } from '../scenario-registry.ts'
import css from './ProjectBrainTurnTail.module.css'
import { ProjectInitializationProgress, ProjectPlatformSyncProgress, ProjectReadyCard } from './ProjectBrainMessageDock.tsx'
import { ProjectBrainScenarioSurface } from './ProjectBrainScenarioSurface.tsx'
import { BRIEFING_MATERIALS, createBriefingMaterialBlob } from './briefing-materials.ts'

export interface ProjectBrainTurnTailInjected {
  hooks: { projectBrain: import('@deepseek-ai/dsh-client-runtime/client').ObservableSnapshot<ProjectBrainState> }
  enabled: () => boolean
  openDetails: () => void
  restorePlan: () => void
  restoreMeetingPlan: (items: readonly ProjectBrainMeetingActionItem[]) => void
  markPlanReady: () => void
  confirmPlan: () => void
  retryPlatformData: () => void
  continueProjectAction: (actionId: ProjectBrainNextAction['id']) => void
  markExecuted: () => void
  markExecutionFailed: () => void
  confirmMeetingPlan: () => void
  markMeetingPlanReady: () => void
  markMeetingExecuted: () => void
  confirmBriefing: (materials: readonly string[]) => void
  submitCopilotDecision: (decisionId: string, selection: ProjectBrainCopilotDecisionSelection) => void
}

/** Render scenario controls only beneath the assistant turn that owns them. */
export function ProjectBrainTurnTail({ turn, useProjectBrain, enabled, openDetails, restorePlan, restoreMeetingPlan, markPlanReady, confirmPlan, retryPlatformData, continueProjectAction, markExecuted, markExecutionFailed, confirmMeetingPlan, markMeetingPlanReady, markMeetingExecuted: markMeetingExecutedCb, confirmBriefing, submitCopilotDecision }: PropsRuntime<'conversation.chat.turnTail'> & InjectFace<ProjectBrainTurnTailInjected>) {
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
  const briefingEnvelope = briefingReadyTurn ? envelope : null
  const briefingMaterialNames = extractBriefingMaterialNames(briefingEnvelope?.payload)
  const copilotDecision = extractCopilotDecision(surface?.data)
  const copilotReceipt = turnText.includes('project-brain:copilot-decision-result')
    ? extractCopilotReceipt(envelope?.payload)
    : null
  const meetingPayload = envelope?.scenarioId === 'meeting-actions' && Array.isArray(envelope.payload)
    ? envelope.payload as readonly ProjectBrainMeetingActionItem[]
    : MEETING_ANALYSIS_MOCK.actionItems

  useEffect(() => {
    if (enabled() && projectPlanTurn && state.plan === null) restorePlan()
  }, [enabled, projectPlanTurn, restorePlan, state.plan])
  useEffect(() => {
    if (!enabled() || !meetingPlanTurn) return
    // Rehydrate the meeting scenario only when nothing else is active (idle) or the
    // meeting state is already mounted but empty. Restoring must not rip an active
    // scenario back to meeting-actions — after a launch takes over, re-firing this on
    // the meeting turn's activeScenario change would yank the whole UI off the launch.
    if (state.phase === 'idle' || state.activeScenario === 'meeting-actions' && state.meetingItems.length === 0 && meetingPayload.length > 0) restoreMeetingPlan(meetingPayload)
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
    // The analysis reply is fully streamed once its turn tail mounts, so the review
    // phase flips here instead of on a submit-time timer that races the stream.
    if (projectPlanTurn && (state.phase === 'analyzing' || state.phase === 'revising')) markPlanReady()
    if (meetingPlanTurn && (state.phase === 'analyzing' || state.phase === 'revising')) markMeetingPlanReady()
    if (meetingExecutionTurn && turnText.includes('project-brain:meeting-executed')) markMeetingExecutedCb()
  }, [
    markExecuted,
    markExecutionFailed,
    markMeetingPlanReady,
    markMeetingExecutedCb,
    markPlanReady,
    meetingExecutionTurn,
    meetingPlanTurn,
    projectPlanTurn,
    state.phase,
    turnText,
  ])

  if (!enabled()) return null
  if (copilotReceipt !== null) return <CopilotDecisionReceiptCard selection={copilotReceipt} />
  // Copilot-surface turns inline their board above the prose (assistantSurface
  // service); this tail contributes only the decision card below the prose.
  if (surface !== null && surface.template === 'project-copilot-dashboard') {
    return copilotDecision === null ? null : <CopilotDecisionCard decision={copilotDecision} onSubmit={submitCopilotDecision} />
  }
  if (surface !== null) return <ProjectBrainScenarioSurface surface={surface} />
  if (briefingReadyTurn) return <ExecutiveBriefingReceiptCard materials={briefingMaterialNames} />
  if (briefingReviewTurn) return <BriefingMaterialPickerCard onConfirm={confirmBriefing} />
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

/** Recover the only allow-listed supplier-risk decision from a copilot surface payload. */
function extractCopilotDecision(value: unknown): ProjectBrainCopilotDecision | null {
  if (typeof value !== 'object' || value === null) return null
  const data = value as { readonly decisions?: unknown; readonly decisionId?: unknown; readonly selection?: unknown }
  if (!Array.isArray(data.decisions)) return null
  const decision = data.decisions.find(candidate => typeof candidate === 'object' && candidate !== null && (candidate as { readonly id?: unknown }).id === 'decision-1')
  if (typeof decision !== 'object' || decision === null) return null
  const candidate = decision as Partial<ProjectBrainCopilotDecision>
  if (candidate.id !== 'decision-1' || typeof candidate.title !== 'string' || typeof candidate.context !== 'string' || typeof candidate.advice !== 'string' || !Array.isArray(candidate.options)) return null
  const options = candidate.options.filter((option): option is ProjectBrainCopilotDecision['options'][number] => typeof option === 'object' && option !== null && typeof (option as { readonly label?: unknown }).label === 'string' && ((option as { readonly selection?: unknown }).selection === 'wait-for-confirmation' || (option as { readonly selection?: unknown }).selection === 'start-backup-supplier'))
  return options.length === 2 ? { id: candidate.id, title: candidate.title, context: candidate.context, advice: candidate.advice, options } : null
}

/** Read a result selection from the assistant's private receipt marker. */
function extractCopilotReceipt(value: unknown): ProjectBrainCopilotDecisionSelection | null {
  if (typeof value !== 'object' || value === null) return null
  const data = value as { readonly decisionId?: unknown; readonly selection?: unknown }
  if (data.decisionId !== 'decision-1') return null
  if (data.selection !== 'wait-for-confirmation' && data.selection !== 'start-backup-supplier') return null
  return data.selection
}

/** Ask for a supplier-risk decision only below the assistant report that introduced it. */
function CopilotDecisionCard({ decision, onSubmit }: { readonly decision: ProjectBrainCopilotDecision; readonly onSubmit: (decisionId: string, selection: ProjectBrainCopilotDecisionSelection) => void }): JSX.Element {
  const [pending, setPending] = useState<ProjectBrainCopilotDecisionSelection | null>(null)
  return <section className={css.copilotDecisionCard} aria-label={decision.title}>
    <div className={css.copilotDecisionHead}><span>待你决策</span><strong>{decision.title}</strong><p>{decision.advice}</p></div>
    <div className={css.copilotDecisionActions}>
      {decision.options.map(option => <button key={option.selection} type="button" className={option.selection === 'start-backup-supplier' ? css.button : css.primary} disabled={pending !== null} onClick={() => { setPending(option.selection); onSubmit(decision.id, option.selection) }}>{pending === option.selection ? '正在提交决策…' : option.label}</button>)}
    </div>
  </section>
}

/** Render a persisted supplier-risk outcome only on the corresponding assistant receipt. */
function CopilotDecisionReceiptCard({ selection }: { readonly selection: ProjectBrainCopilotDecisionSelection }): JSX.Element {
  const isConditional = selection === 'wait-for-confirmation'
  return <section className={css.copilotDecisionReceipt} aria-label={isConditional ? '条件预案已生效' : '备选供应商评估已启动'}>
    <span className={css.copilotReceiptMark}>✓</span>
    <div>
      <strong>{isConditional ? '条件预案已生效' : '备选供应商评估已启动'}</strong>
      <p>{isConditional ? '监测条件：明日 10:00 前未取得最终交期，将自动启动备选供应商方案。' : '负责人：王刚；首批动作：完成至少两家供应商的资质与报价对比。'}</p>
      <small>{isConditional ? '下一次检查：明日 10:00' : '后续反馈：今日下班前回传首轮评估结果'}</small>
    </div>
  </section>
}

/** Material-choice card: pick this round's deliverables instead of a blind confirm. */
function BriefingMaterialPickerCard({ onConfirm }: { readonly onConfirm: (materials: readonly string[]) => void }): JSX.Element {
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(BRIEFING_MATERIALS.filter(material => material.defaultChecked).map(material => material.name)),
  )
  return <section className={css.briefingCard} aria-label="选择汇报材料">
    <div className={css.briefingCardHead}>
      <div>
        <span>汇报材料已就绪</span>
        <p>选择本次需要生成的材料</p>
      </div>
      <button type="button" className={css.primary} disabled={selected.size === 0} onClick={() => { onConfirm([...selected]) }}>生成所选材料</button>
    </div>
    <div className={css.briefingChoices}>
      {BRIEFING_MATERIALS.map((material) => {
        const checked = selected.has(material.name)
        return (
          <label key={material.name} className={css.briefingChoice}>
            <input
              type="checkbox"
              checked={checked}
              aria-label={`${material.name.replace(/^集团领导汇报_/, '').replace(/\.[^.]+$/u, '')} ${material.kind}`}
              onChange={() => { setSelected(current => toggleNameSet(current, material.name)) }}
            />
            <span>{material.name.replace(/^集团领导汇报_/, '').replace(/\.[^.]+$/u, '')}</span>
            <small>{material.kind}</small>
          </label>
        )
      })}
    </div>
  </section>
}

/** Extract the confirmed material names from a receipt-turn confirm envelope, defaulting to the full package. */
function extractBriefingMaterialNames(payload: unknown): readonly string[] {
  if (typeof payload !== 'object' || payload === null) return BRIEFING_MATERIALS.map(material => material.name)
  const materials = (payload as { readonly materials?: unknown }).materials
  if (!Array.isArray(materials)) return BRIEFING_MATERIALS.map(material => material.name)
  const known = new Set(BRIEFING_MATERIALS.map(material => material.name))
  const selected = materials.filter((name): name is string => typeof name === 'string' && known.has(name))
  return selected.length > 0 ? selected : BRIEFING_MATERIALS.map(material => material.name)
}

function toggleNameSet(current: ReadonlySet<string>, name: string): ReadonlySet<string> {
  const next = new Set(current)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  return next
}

function ExecutiveBriefingReceiptCard({ materials }: { readonly materials: readonly string[] }): JSX.Element {
  const downloadMaterial = (name: string): void => {
    const url = URL.createObjectURL(createBriefingMaterialBlob(name))
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    window.setTimeout(() => { URL.revokeObjectURL(url) }, 0)
  }

  /** One-click download of every material generated this round. */
  const downloadAll = (): void => {
    for (const name of materials) downloadMaterial(name)
  }

  return <section className={`${css.meetingResult} ${css.briefingReceipt}`} aria-label="所选材料已生成">
    <div className={css.meetingResultHead}>
      <span className={css.meetingResultMark}>✓</span>
      <div>
        <p>所选材料已生成</p>
        <h3>{PROJECT_BRAIN_PLAN.project.name}</h3>
        <small>报告文件已就绪，可单个下载或一键全部下载</small>
      </div>
    </div>
    <div className={css.briefingFileList}>
      {BRIEFING_MATERIALS.filter(material => materials.includes(material.name)).map(material => (
        <div key={material.name} className={css.briefingFileRow}>
          <span className={css.briefingBadge}>{material.kind}</span>
          <span className={css.briefingFileName}>{material.name}</span>
          <span className={css.briefingFileSize}>{material.size}</span>
          <a
            href="#download"
            download={material.name}
            aria-label={`下载 ${material.name}`}
            className={css.briefingDownload}
            onClick={(event) => { event.preventDefault(); downloadMaterial(material.name) }}
          >下载</a>
        </div>
      ))}
    </div>
    <div className={css.briefingFooter}>
      <button type="button" className={css.primary} onClick={downloadAll}>一键全部下载</button>
    </div>
  </section>
}

/** Meeting execution plan confirmation card. */
function MeetingAnalysisCard({
  items,
  onConfirm,
  openDetails,
}: {
  readonly items: readonly ProjectBrainMeetingActionItem[]
  readonly onConfirm: () => void
  readonly openDetails: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const stats = useMemo(() => meetingStats(items), [items])
  return (
    <section className={css.meetingCard} aria-label="会议任务拆解">
      <div className={css.meetingCardHeader}>
        <span className={css.meetingCardTitle}>会议任务拆解</span>
        <span className={css.meetingCardHint}>请确认以下事项后点击“确认执行”</span>
      </div>
      <div className={css.meetingStats}>
        <div className={css.meetingStatItem}>
          <span className={css.meetingStatNumber}>{stats.newTasks}</span>
          <span className={css.meetingStatLabel}>新建任务</span>
        </div>
        <div className={css.meetingStatDivider} />
        <div className={css.meetingStatItem}>
          <span className={css.meetingStatNumber}>{stats.updateTasks}</span>
          <span className={css.meetingStatLabel}>更新任务</span>
        </div>
        <div className={css.meetingStatDivider} />
        <div className={css.meetingStatItem}>
          <span className={css.meetingStatNumber}>{stats.newRisks}</span>
          <span className={css.meetingStatLabel}>新增风险</span>
        </div>
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

function meetingStats(items: readonly ProjectBrainMeetingActionItem[]): {
  readonly newTasks: number
  readonly updateTasks: number
  readonly newRisks: number
} {
  return {
    newTasks: items.filter(item => item.type === 'new-task').length,
    updateTasks: items.filter(item => item.type === 'update-task').length,
    newRisks: items.filter(item => item.type === 'new-risk').length,
  }
}
