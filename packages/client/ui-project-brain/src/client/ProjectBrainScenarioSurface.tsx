import { useMemo, useState } from 'react'
import type { ProjectBrainCopilotData, ProjectBrainMyDayData } from '../project-data.ts'
import type { ProjectBrainSurfaceEnvelope } from '../scenario-registry.ts'
import css from './ProjectBrainScenarioSurface.module.css'

type MyDayTask = ProjectBrainMyDayData['tasks'][number]

/** Render a configured scenario through an allow-listed React surface template. */
export function ProjectBrainScenarioSurface({ surface }: { readonly surface: ProjectBrainSurfaceEnvelope }): JSX.Element | null {
  if (surface.template === 'my-day-workbench' && isMyDayData(surface.data)) return <MyDayWorkbench data={surface.data} />
  if (surface.template === 'project-copilot-dashboard' && isCopilotData(surface.data)) return <ProjectCopilotDashboard data={surface.data} />
  return null
}

function ProjectCopilotDashboard({ data }: { readonly data: ProjectBrainCopilotData }): JSX.Element {
  const [mode, setMode] = useState(data.permissionMode)
  const [handled, setHandled] = useState<ReadonlySet<string>>(() => new Set())
  const modes = ['建议模式', '辅助执行模式', '托管模式']
  return <section className={css.root} aria-label="项目托管看板">
    <header className={css.surfaceHeader}>
      <div><span className={css.eyebrow}>AI 项目托管 · {data.projectName}</span><h3>AI 正在跟进项目变化</h3><p>我会持续关注进度、风险和阻塞事项，需要你介入时只推送关键决策。</p></div>
      <div className={css.progressRing}><strong>{data.progress}%</strong><span>当前进度</span></div>
    </header>
    <div className={css.copilotMetrics}>
      <Metric value={data.discoveries.highRisks} label="高风险" tone="risk" />
      <Metric value={data.discoveries.abnormalTasks} label="异常任务" tone="warn" />
      <Metric value={data.discoveries.dueSoon} label="即将到期" tone="blue" />
      <Metric value={data.discoveries.coordination} label="需协调" tone="blue" />
    </div>
    <div className={css.copilotGrid}>
      <section className={css.panel}>
        <div className={css.panelTitle}><h4>AI 今日发现</h4><span>按影响程度排序</span></div>
        <div className={css.trackList}>
          {data.trackingItems.map(item => <article key={item.id} className={css.trackItem}><span data-status={item.status}>{item.status}</span><div><strong>{item.title}</strong><p>{item.description}</p><small>负责人：{item.owner}</small></div></article>)}
        </div>
      </section>
      <section className={css.panel}>
        <div className={css.panelTitle}><h4>需要我处理</h4><span>{data.decisions.length} 项待确认</span></div>
        <div className={css.decisionList}>
          {data.decisions.map(item => <article key={item.id} className={handled.has(item.id) ? css.decisionDone : css.decisionItem}><div><strong>{item.title}</strong><p>{item.reason}</p><small>{item.owner} · {item.due}</small></div><button type="button" onClick={() => { setHandled(current => toggleSet(current, item.id)) }}>{handled.has(item.id) ? '已处理' : '标记处理'}</button></article>)}
        </div>
      </section>
    </div>
    <div className={css.modePanel}>
      <div><h4>托管权限模式</h4><p>当前权限：{mode}</p></div>
      <div className={css.modeButtons}>{modes.map(item => <button type="button" key={item} data-active={item === mode} onClick={() => { setMode(item) }}>{item}</button>)}</div>
    </div>
    <footer className={css.planFooter}><strong>下一次跟进计划</strong><div>{data.nextPlan.map(item => <span key={item}>{item}</span>)}</div></footer>
  </section>
}

function MyDayWorkbench({ data }: { readonly data: ProjectBrainMyDayData }): JSX.Element {
  const [completed, setCompleted] = useState<ReadonlySet<string>>(() => new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const summary = data.summary ?? {
    urgent: data.tasks.filter(task => task.priority === '紧急').length,
    today: data.tasks.filter(task => task.priority === '今日').length,
    meetings: data.tasks.filter(task => task.priority === '会议').length,
    waiting: data.tasks.filter(task => task.priority === '等待').length,
  }
  const waiting = data.waiting ?? []
  const progress = data.tasks.length === 0 ? 0 : Math.round(completed.size / data.tasks.length * 100)
  const groups = useMemo(() => Array.from(new Set(data.tasks.map(task => task.group ?? task.priority))).map(group => ({ group, tasks: data.tasks.filter(task => (task.group ?? task.priority) === group) })), [data.tasks])
  return <section className={css.root} aria-label="今日工作台">
    <header className={css.surfaceHeader}>
      <div><span className={css.eyebrow}>{data.date} · {data.owner} · {data.role ?? '项目负责人'}</span><h3>今天先把这 {data.tasks.length} 件事排好</h3><p>已按截止时间、项目风险、会议依赖和等待反馈自动排序。</p></div>
      <div className={css.progressRing}><strong>{progress}%</strong><span>今日完成度</span></div>
    </header>
    <div className={css.myDaySummary}>
      <Metric value={summary.urgent} label="紧急" tone="risk" />
      <Metric value={summary.today} label="今日完成" tone="blue" />
      <Metric value={summary.meetings} label="今日会议" tone="warn" />
      <Metric value={summary.waiting} label="等待反馈" tone="blue" />
      <Metric value={Math.round(data.focusMinutes / 60 * 10) / 10} label="专注小时" tone="blue" />
    </div>
    <div className={css.dayLayout}>
      <div className={css.timeline}>
        {groups.map(group => <section key={group.group} className={css.dayGroup}><div className={css.groupTitle}><span>{group.group}</span><small>{group.tasks.length} 项</small></div>{group.tasks.map(task => <DayTaskCard key={task.id} task={task} completed={completed.has(task.id)} expanded={expandedId === task.id} onToggleComplete={() => { setCompleted(current => toggleSet(current, task.id)) }} onToggleExpanded={() => { setExpandedId(current => current === task.id ? null : task.id) }} />)}</section>)}
      </div>
      <aside className={css.waitingPanel}><h4>等待我反馈</h4>{waiting.map(item => <div key={item.id}><strong>{item.title}</strong><span>{item.owner} · {item.since}</span></div>)}<button type="button">统一发送提醒</button></aside>
    </div>
    <footer className={css.footer}><span>这些操作仅用于演示本地状态，不写入真实项目平台。</span><button type="button">进入我的任务</button></footer>
  </section>
}

function DayTaskCard({ task, completed, expanded, onToggleComplete, onToggleExpanded }: { readonly task: MyDayTask; readonly completed: boolean; readonly expanded: boolean; readonly onToggleComplete: () => void; readonly onToggleExpanded: () => void }): JSX.Element {
  return <article className={completed ? css.dayTaskDone : css.dayTask}>
    <div className={css.dayTaskMain}><span data-priority={task.priority}>{task.priority}</span><div><strong>{task.title}</strong><small>{task.reason}</small></div><b>{task.due}</b></div>
    {expanded && <p className={css.taskDetail}>{task.detail ?? task.reason}</p>}
    <div className={css.taskActions}><button type="button">{task.primaryAction ?? '打开任务'}</button><button type="button" onClick={onToggleExpanded}>为什么排这里：{task.title}</button><button type="button" onClick={onToggleComplete}>标记完成：{task.title}</button></div>
  </article>
}

function Metric({ value, label, tone }: { readonly value: number; readonly label: string; readonly tone: 'blue' | 'warn' | 'risk' }): JSX.Element {
  return <div className={css.metric} data-tone={tone}><strong>{value}</strong><span>{label}</span></div>
}

function toggleSet(current: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(current)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function isMyDayData(value: unknown): value is ProjectBrainMyDayData {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ProjectBrainMyDayData>
  return typeof candidate.date === 'string' && typeof candidate.owner === 'string' && typeof candidate.focusMinutes === 'number' && Array.isArray(candidate.tasks) && candidate.tasks.every(isMyDayTask)
}

function isMyDayTask(value: unknown): value is MyDayTask {
  if (typeof value !== 'object' || value === null) return false
  const task = value as Partial<MyDayTask>
  return typeof task.id === 'string' && typeof task.title === 'string' && typeof task.project === 'string' && typeof task.due === 'string' && typeof task.reason === 'string'
}

function isCopilotData(value: unknown): value is ProjectBrainCopilotData {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ProjectBrainCopilotData>
  return typeof candidate.projectName === 'string' && typeof candidate.progress === 'number' && typeof candidate.permissionMode === 'string' && Array.isArray(candidate.trackingItems) && Array.isArray(candidate.decisions) && Array.isArray(candidate.nextPlan) && typeof candidate.discoveries === 'object' && candidate.discoveries !== null
}
