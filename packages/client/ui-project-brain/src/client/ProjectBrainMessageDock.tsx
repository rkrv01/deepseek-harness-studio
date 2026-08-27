import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useState } from 'react'
import type { ProjectBrainNextAction, ProjectBrainState } from './state.ts'
import { PROJECT_BRAIN_PLATFORM_TARGET } from './platform-window.ts'
import { platformBusinessUrl, platformDemoStatusUrl } from './platform-config.ts'
import css from './ProjectBrainMessageDock.module.css'

const LAUNCH_PROMPT = '帮我启动智慧园区建设项目。'
const MEETING_PROMPT = '帮我整理这个项目的会议纪要'
const COPILOT_PROMPT = '智慧园区建设项目现状怎么样？'
const MY_DAY_PROMPT = '看看我今天该做什么'
const BRIEFING_PROMPT = '下周要给集团领导汇报，帮我准备好'

const PROJECT_BRAIN_PROMPTS = [LAUNCH_PROMPT, MEETING_PROMPT, COPILOT_PROMPT, MY_DAY_PROMPT, BRIEFING_PROMPT]

/** Injected face for the Project Brain message strip. */
export interface ProjectBrainMessageDockInjected {
  hooks: { projectBrain: import('@deepseek-ai/dsh-client-runtime/client').ObservableSnapshot<ProjectBrainState> }
  enabled: () => boolean
  openDetails: () => void
}

/** Quick scenario entries kept permanently above the composer so one demo can flow straight into the next. */
export function ProjectBrainMessageDock({ useInput, inputActions, enabled, useSessions }: PropsRuntime<'conversation.input.dock'> & InjectFace<ProjectBrainMessageDockInjected>) {
  const draft = useInput(s => s.draft)
  // Subscribe to session list changes so enabled() re-evaluates when the
  // new session's agentPreset becomes available (e.g. after "new conversation").
  useSessions(s => s.current)
  if (!enabled() || draft !== '') return null
  return (
    <section className={css.suggestion} aria-label="项目智脑示例输入">
      <span className={css.suggestionLabel}>可以直接开始</span>
      <div className={css.suggestionRow}>
        {PROJECT_BRAIN_PROMPTS.map(prompt => <button
          key={prompt}
          type="button"
          className={css.suggestionButton}
          onClick={() => {
            inputActions.setDraft(prompt)
            queueMicrotask(inputActions.submit)
          }}
        >
          {prompt}
        </button>)}
      </div>
    </section>
  )
}

const INITIALIZATION_STEPS = ['创建项目管理空间', '初始化阶段与项目计划', '建立任务、责任关系与风险台账', '配置项目知识空间与协同规则']

/** Surface the resolved demo-status endpoint in DevTools while initialization calls it server-side. */
function useDemoStatusDebugLog(): void {
  useEffect(() => {
    console.info('[project-brain] demo-status endpoint:', platformDemoStatusUrl())
  }, [])
}

/** Present tangible progress while the deterministic initialization reply streams. */
export function ProjectInitializationProgress() {
  const [activeStep, setActiveStep] = useState(0)
  useDemoStatusDebugLog()
  useEffect(() => {
    const timer = window.setInterval(() => { setActiveStep(current => Math.min(current + 1, INITIALIZATION_STEPS.length - 1)) }, 1_100)
    return () => { window.clearInterval(timer) }
  }, [])
  return <section className={css.initializing} aria-live="polite" aria-label="正在初始化项目">
    <div className={css.initializingHead}>
      <span className={css.loadingDot} />
      <div><strong>正在初始化项目</strong><p>正在将确认的方案同步到项目智脑…</p></div>
      <span className={css.percent}>{Math.min(92, 22 + activeStep * 24)}%</span>
    </div>
    <ol className={css.progressSteps}>{INITIALIZATION_STEPS.map((step, index) => <li key={step} data-state={index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending'}><span>{index < activeStep ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>{step}</strong><small>{index < activeStep ? '已完成' : index === activeStep ? '正在处理' : '等待执行'}</small></div></li>)}</ol>
  </section>
}

/** Keep the retry state focused on the external platform rather than replaying project setup. */
export function ProjectPlatformSyncProgress() {
  useDemoStatusDebugLog()
  return <section className={css.initializing} aria-live="polite" aria-label="正在同步平台模拟数据"><div className={css.initializingHead}><span className={css.loadingDot} /><div><strong>正在加载平台模拟数据</strong><p>项目初始化已完成，正在同步项目智脑平台。</p></div><span className={css.percent}>同步中</span></div></section>
}

/** Compact post-launch overview; downstream scenarios remain intentionally inert placeholders. */
export function ProjectReadyCard({ plan, onContinue }: { readonly plan: ProjectBrainState['plan']; readonly onContinue?: (actionId: ProjectBrainNextAction['id']) => void }) {
  if (plan === null) return null
  const continuations = [
    ['meeting-actions', '纪', '帮我整理项目会议', '上传会议纪要，生成任务并落实责任人'],
    ['project-copilot', '现', '智慧园区建设项目现状怎么样', 'AI 汇报项目现状、已做的跟进与待你决策的事项'],
    ['my-day', '今', '看看我今天该做什么', '按我的角色整理今日行动清单'],
    ['executive-briefing', '报', '准备下一次领导汇报', '汇总进展、成果、问题与关键风险'],
  ]
  return <section className={css.ready} aria-label="项目已准备好">
    <div className={css.readyHead}>
      <span className={css.readyMark}>✓</span>
      <div><p>项目已准备好</p><h3>{plan.project.name}</h3><small>已完成初始化</small></div>
      <a href={platformBusinessUrl('#/projectAdmin')} target={PROJECT_BRAIN_PLATFORM_TARGET} className={css.platformLink}>
        进入项目智脑 <span>↗</span>
      </a>
    </div>
    <div className={css.stats}><div><strong>{plan.stages.length}</strong><span>阶段</span></div><div><strong>{plan.tasks.length}</strong><span>任务</span></div><div><strong>{plan.risks.length}</strong><span>风险</span></div><div><strong>{plan.knowledgeFolders.length}</strong><span>知识目录</span></div></div>
    <div className={css.continuation}><div><h4>接下来，可以继续推进</h4><p>选择一个方向继续处理，或直接在输入框告诉我你的需求。</p></div><div className={css.continuationGrid}>{continuations.map(([id, initial, title, description]) => <button key={id} type="button" className={css.continuationItem} onClick={() => { onContinue?.(id as ProjectBrainNextAction['id']) }}><span>{initial}</span><div><strong>{title}</strong><small>{description}</small></div><i>→</i></button>)}</div></div>
  </section>
}
