import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useRef } from 'react'
import type { ProjectBrainState } from './state.ts'
import css from './ProjectBrainTurnTail.module.css'
import { ProjectInitializationProgress, ProjectPlatformSyncProgress, ProjectReadyCard } from './ProjectBrainMessageDock.tsx'

export interface ProjectBrainTurnTailInjected {
  hooks: { projectBrain: import('@deepseek-ai/dsh-client-runtime/client').ObservableSnapshot<ProjectBrainState> }
  enabled: () => boolean
  openDetails: () => void
  restorePlan: () => void
  confirmPlan: () => void
  retryPlatformData: () => void
  continueProjectAction: (actionId: import('./state.ts').ProjectBrainNextAction['id']) => void
  markExecuted: () => void
  markExecutionFailed: () => void
}

/** Keeps the project-plan edit entry attached to the completed assistant response. */
export function ProjectBrainTurnTail({ turn, useProjectBrain, enabled, openDetails, restorePlan, confirmPlan, retryPlatformData, continueProjectAction, markExecuted, markExecutionFailed }: PropsRuntime<'conversation.chat.turnTail'> & InjectFace<ProjectBrainTurnTailInjected>) {
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
  }, [markExecuted, markExecutionFailed, turnText])
  if (!enabled() || state.plan === null) return null
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
  if (!projectExecutionTurn) return null
  if (state.phase === 'executing') return <ProjectInitializationProgress />
  if (state.phase === 'syncing-platform') return <ProjectPlatformSyncProgress />
  if (state.phase === 'execution-failed') return <section className={css.failed} aria-live="polite"><strong>平台模拟数据尚未加载</strong><span>项目方案已保留，请检查服务连接后重新加载。</span><button type="button" onClick={retryPlatformData}>重试加载</button></section>
  if (state.phase === 'executed') return <ProjectReadyCard plan={state.plan} onContinue={continueProjectAction} />
  return null
}
