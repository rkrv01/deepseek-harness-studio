import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { DraftAttachmentId } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { useEffect, useState } from 'react'
import type { ProjectBrainNextAction, ProjectBrainState } from './state.ts'
import { useProjectBrainLocale } from './use-project-brain-locale.ts'
import { PROJECT_BRAIN_PLATFORM_TARGET } from './platform-window.ts'
import { platformBusinessUrl, platformDemoStatusUrl } from './platform-config.ts'
import css from './ProjectBrainMessageDock.module.css'

const LAUNCH_PROMPT_ZH = '帮我启动智慧园区建设项目'
const MEETING_PROMPT_ZH = '帮我整理这个项目的会议纪要'
const COPILOT_PROMPT_ZH = '智慧园区建设项目现状怎么样？'
const MY_DAY_PROMPT_ZH = '看看我今天该做什么'
const BRIEFING_PROMPT_ZH = '下周要给集团领导汇报，帮我准备好'

const LAUNCH_PROMPT_EN = 'Help me launch the smart park construction project'
const MEETING_PROMPT_EN = 'Help me organize the meeting minutes for this project'
const COPILOT_PROMPT_EN = 'How is the smart park construction project doing?'
const MY_DAY_PROMPT_EN = 'See what I should do today'
const BRIEFING_PROMPT_EN = 'I need to brief group leadership next week — help me prepare'

/** One quick scenario shortcut: the button label doubles as the submitted trigger input. */
interface ProjectBrainPrompt { readonly zh: string; readonly en: string }
const PROJECT_BRAIN_PROMPTS: readonly ProjectBrainPrompt[] = [
  { zh: LAUNCH_PROMPT_ZH, en: LAUNCH_PROMPT_EN },
  { zh: MEETING_PROMPT_ZH, en: MEETING_PROMPT_EN },
  { zh: COPILOT_PROMPT_ZH, en: COPILOT_PROMPT_EN },
  { zh: MY_DAY_PROMPT_ZH, en: MY_DAY_PROMPT_EN },
  { zh: BRIEFING_PROMPT_ZH, en: BRIEFING_PROMPT_EN },
]

/** Whether this build is the Starlight demo surface (official client build). */
const DEMO_MODE = process.env.DSH_CLIENT_DEMO_MODE === '1'

/** Browser-only metadata for one simulated upload; bytes never leave the browser. */
export interface DemoUploadFile {
  readonly name: string
  readonly type: string
  readonly size: number
}

/** Files a scenario's quick entry attaches as if the user had uploaded them. */
const DEMO_UPLOADS: Record<string, { readonly zh: readonly DemoUploadFile[]; readonly en: readonly DemoUploadFile[] }> = {
  [LAUNCH_PROMPT_ZH]: {
    zh: [
      { name: '立项文件.md', type: 'text/markdown', size: 1_024 },
      { name: '技术方案.md', type: 'text/markdown', size: 2_048 },
      { name: '项目智脑项目基本资料.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 32_768 },
      { name: '项目智脑原始需求清单池_详细版.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 24_576 },
    ],
    en: [
      { name: 'Project_Founding_Document.md', type: 'text/markdown', size: 1_024 },
      { name: 'Technical_Proposal.md', type: 'text/markdown', size: 2_048 },
      { name: 'Project_Brain_Basic_Materials.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 32_768 },
      { name: 'Project_Brain_Requirements_Backlog.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 24_576 },
    ],
  },
  [MEETING_PROMPT_ZH]: {
    zh: [
      { name: '项目智脑项目需求调研会议纪要_详细版.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 28_672 },
    ],
    en: [
      { name: 'Project_Brain_Requirements_Meeting_Minutes.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 28_672 },
    ],
  },
}

/** Injected face for the Project Brain message strip. */
export interface ProjectBrainMessageDockInjected {
  hooks: { projectBrain: import('@deepseek-ai/dsh-client-runtime/client').ObservableSnapshot<ProjectBrainState> }
  enabled: () => boolean
  openDetails: () => void
  /** Register simulated demo-upload documents; returns their draft ids. */
  attachDemoDocuments: (files: readonly DemoUploadFile[]) => Promise<readonly DraftAttachmentId[]>
}

/** Quick scenario entries kept permanently above the composer so one demo can flow straight into the next. */
export function ProjectBrainMessageDock({ useInput, inputActions, enabled, useSessions, attachDemoDocuments }: PropsRuntime<'conversation.input.dock'> & InjectFace<ProjectBrainMessageDockInjected>) {
  const locale = useProjectBrainLocale()
  const draft = useInput(s => s.draft)
  // Subscribe to session list changes so enabled() re-evaluates when the
  // new session's agentPreset becomes available (e.g. after "new conversation").
  useSessions(s => s.current)
  if (!enabled() || draft !== '') return null
  return (
    <section className={css.suggestion} aria-label={locale === 'en' ? 'Project Brain example inputs' : '项目智脑示例输入'}>
      <span className={css.suggestionLabel}>{locale === 'en' ? 'Start directly' : '可以直接开始'}</span>
      <div className={css.suggestionRow}>
        {PROJECT_BRAIN_PROMPTS.map((entry) => {
          const prompt = locale === 'en' ? entry.en : entry.zh
          return <button
            key={prompt}
            type="button"
            className={css.suggestionButton}
            onClick={() => {
              void (async () => {
                // Demo build: attach the scenario's materials as a simulated
                // upload so the composer shows them as if the user had picked
                // files, then fill the prompt WITHOUT submitting — the demo
                // host presses Send to start the scenario.
                if (DEMO_MODE) {
                  const uploads = DEMO_UPLOADS[entry.zh]?.[locale === 'en' ? 'en' : 'zh']
                  if (uploads !== undefined) {
                    const ids = await attachDemoDocuments(uploads)
                    if (ids.length > 0) inputActions.addDocuments(ids)
                  }
                  inputActions.setDraft(prompt)
                  return
                }
                inputActions.setDraft(prompt)
                queueMicrotask(inputActions.submit)
              })()
            }}
          >
            {prompt}
          </button>
        })}
      </div>
    </section>
  )
}

const INITIALIZATION_STEPS_ZH = ['创建项目管理空间', '初始化阶段与项目计划', '建立任务、责任关系与风险台账', '配置项目知识空间与协同规则']
const INITIALIZATION_STEPS_EN = ['Create the project workspace', 'Initialize stages and the project plan', 'Set up tasks, ownership, and the risk ledger', 'Configure the project knowledge space and collaboration rules']

/** Surface the resolved demo-status endpoint in DevTools while initialization calls it server-side. */
function useDemoStatusDebugLog(): void {
  useEffect(() => {
    console.info('[project-brain] demo-status endpoint:', platformDemoStatusUrl())
  }, [])
}

/** Present tangible progress while the deterministic initialization reply streams. */
export function ProjectInitializationProgress() {
  const locale = useProjectBrainLocale()
  const steps = locale === 'en' ? INITIALIZATION_STEPS_EN : INITIALIZATION_STEPS_ZH
  const [activeStep, setActiveStep] = useState(0)
  useDemoStatusDebugLog()
  useEffect(() => {
    const timer = window.setInterval(() => { setActiveStep(current => Math.min(current + 1, steps.length - 1)) }, 1_100)
    return () => { window.clearInterval(timer) }
  }, [steps.length])
  return <section className={css.initializing} aria-live="polite" aria-label={locale === 'en' ? 'Initializing the project' : '正在初始化项目'}>
    <div className={css.initializingHead}>
      <span className={css.loadingDot} />
      <div><strong>{locale === 'en' ? 'Initializing the project' : '正在初始化项目'}</strong><p>{locale === 'en' ? 'Syncing the confirmed plan to the Project Brain…' : '正在将确认的方案同步到项目智脑…'}</p></div>
      <span className={css.percent}>{Math.min(92, 22 + activeStep * 24)}%</span>
    </div>
    <ol className={css.progressSteps}>{steps.map((step, index) => <li key={step} data-state={index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending'}><span>{index < activeStep ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>{step}</strong><small>{index < activeStep ? (locale === 'en' ? 'Completed' : '已完成') : index === activeStep ? (locale === 'en' ? 'Processing' : '正在处理') : (locale === 'en' ? 'Pending' : '等待执行')}</small></div></li>)}</ol>
  </section>
}

/** Keep the retry state focused on the external platform rather than replaying project setup. */
export function ProjectPlatformSyncProgress() {
  const locale = useProjectBrainLocale()
  useDemoStatusDebugLog()
  return <section className={css.initializing} aria-live="polite" aria-label={locale === 'en' ? 'Syncing platform demo data' : '正在同步平台模拟数据'}><div className={css.initializingHead}><span className={css.loadingDot} /><div><strong>{locale === 'en' ? 'Loading platform demo data' : '正在加载平台模拟数据'}</strong><p>{locale === 'en' ? 'Project initialization is complete. Syncing to the Project Brain platform.' : '项目初始化已完成，正在同步项目智脑平台。'}</p></div><span className={css.percent}>{locale === 'en' ? 'Syncing' : '同步中'}</span></div></section>
}

/** Compact post-launch overview; downstream scenarios remain intentionally inert placeholders. */
export function ProjectReadyCard({ plan, onContinue }: { readonly plan: ProjectBrainState['plan']; readonly onContinue?: (actionId: ProjectBrainNextAction['id']) => void }) {
  const locale = useProjectBrainLocale()
  if (plan === null) return null
  const continuations = locale === 'en' ? [
    ['meeting-actions', 'M', 'Help me organize the project meeting', 'Upload meeting minutes to create tasks and assign owners'],
    ['project-copilot', 'S', 'How is the smart park project doing?', 'AI reports the current status, follow-ups, and items awaiting your decision'],
    ['my-day', 'T', 'See what I should do today', 'Plan today\u2019s action list based on my role'],
    ['executive-briefing', 'B', 'Prepare the next leadership briefing', 'Consolidate progress, results, issues, and key risks'],
  ] : [
    ['meeting-actions', '纪', '帮我整理项目会议', '上传会议纪要，生成任务并落实责任人'],
    ['project-copilot', '现', '智慧园区建设项目现状怎么样', 'AI 汇报项目现状、已做的跟进与待你决策的事项'],
    ['my-day', '今', '看看我今天该做什么', '按我的角色整理今日行动清单'],
    ['executive-briefing', '报', '准备下一次领导汇报', '汇总进展、成果、问题与关键风险'],
  ]
  return <section className={css.ready} aria-label={locale === 'en' ? 'Project ready' : '项目已准备好'}>
    <div className={css.readyHead}>
      <span className={css.readyMark}>✓</span>
      <div><p>{locale === 'en' ? 'Project ready' : '项目已准备好'}</p><h3>{plan.project.name}</h3><small>{locale === 'en' ? 'Initialization complete' : '已完成初始化'}</small></div>
      <a href={platformBusinessUrl('#/projectAdmin')} target={PROJECT_BRAIN_PLATFORM_TARGET} className={css.platformLink}>
        {locale === 'en' ? 'Open Project Brain' : '进入项目智脑'} <span>↗</span>
      </a>
    </div>
    <div className={css.stats}><div><strong>{plan.stages.length}</strong><span>{locale === 'en' ? 'stages' : '阶段'}</span></div><div><strong>{plan.tasks.length}</strong><span>{locale === 'en' ? 'tasks' : '任务'}</span></div><div><strong>{plan.risks.length}</strong><span>{locale === 'en' ? 'risks' : '风险'}</span></div><div><strong>{plan.knowledgeFolders.length}</strong><span>{locale === 'en' ? 'knowledge' : '知识目录'}</span></div></div>
    <div className={css.continuation}><div><h4>{locale === 'en' ? 'Next, keep moving forward' : '接下来，可以继续推进'}</h4><p>{locale === 'en' ? 'Pick a direction to continue, or tell me what you need directly in the input box.' : '选择一个方向继续处理，或直接在输入框告诉我你的需求。'}</p></div><div className={css.continuationGrid}>{continuations.map(([id, initial, title, description]) => <button key={id} type="button" className={css.continuationItem} onClick={() => { onContinue?.(id as ProjectBrainNextAction['id']) }}><span>{initial}</span><div><strong>{title}</strong><small>{description}</small></div><i>→</i></button>)}</div></div>
  </section>
}
