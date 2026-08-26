import { useMemo, useState } from 'react'
import { IconCalendarOutline16, IconCheckOutline14, IconChecklistOutline14, IconGoalOutline16, IconListPenOutline16, IconQueueOutline14, IconRightUpOutline16, IconSendOutline16, IconSettingsOutline14, IconSparkle16, IconThinkOutline16, IconUserOutline16, IconWarningOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
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
      <span className={css.headerIcon} aria-hidden="true"><IconSparkle16 /></span>
      <div className={css.headerBody}>
        <span className={css.eyebrow}>AI 项目托管 · {data.projectName}</span>
        <h3>AI 正在跟进项目变化</h3>
        <p>我会持续关注进度、风险和阻塞事项，需要你介入时只推送关键决策。</p>
      </div>
      <div className={css.progressRing}><strong>{data.progress}%</strong><span>当前进度</span><div className={css.progressTrack}><span className={css.progressTrackFill} style={{ width: `${data.progress}%` }} /></div></div>
    </header>
    <div className={css.copilotMetrics}>
      <Metric value={data.discoveries.highRisks} label="高风险" tone="risk" icon={<IconWarningOutline16 />} />
      <Metric value={data.discoveries.abnormalTasks} label="异常任务" tone="warn" icon={<IconListPenOutline16 />} />
      <Metric value={data.discoveries.dueSoon} label="即将到期" tone="blue" icon={<IconCalendarOutline16 />} />
      <Metric value={data.discoveries.coordination} label="需协调" tone="green" icon={<IconQueueOutline14 />} />
    </div>
    <div className={css.copilotGrid}>
      <section className={css.panel}>
        <div className={css.panelTitle}><h4><IconSparkle16 />AI 今日发现</h4><span>按影响程度排序</span></div>
        <div className={css.trackList}>
          {data.trackingItems.map(item => <article key={item.id} className={css.trackItem}><span className={css.trackStatus} data-status={item.status}><i aria-hidden="true" />{item.status}</span><div><strong>{item.title}</strong><p>{item.description}</p><small className={css.metaLine}><IconUserOutline16 />负责人：{item.owner}</small></div></article>)}
        </div>
      </section>
      <section className={css.panel}>
        <div className={css.panelTitle}><h4><IconWarningOutline16 />需要我处理</h4><span>{data.decisions.length} 项待确认</span></div>
        <div className={css.decisionList}>
          {data.decisions.map(item => <article key={item.id} className={handled.has(item.id) ? css.decisionDone : css.decisionItem}><div><strong>{item.title}</strong><p>{item.reason}</p><small className={css.metaLine}><IconUserOutline16 />{item.owner}<IconCalendarOutline16 />{item.due}</small></div><button type="button" onClick={() => { setHandled(current => toggleSet(current, item.id)) }}>{handled.has(item.id) ? '已处理' : '标记处理'}</button></article>)}
        </div>
      </section>
    </div>
    <div className={css.modePanel}>
      <div className={css.modeIntro}><h4><IconSettingsOutline14 />托管权限模式</h4><p>当前权限：{mode}</p></div>
      <div className={css.modeButtons}>{modes.map(item => <button type="button" key={item} data-active={item === mode} onClick={() => { setMode(item) }}>{item}</button>)}</div>
    </div>
    <footer className={css.planFooter}>
      <strong><IconCalendarOutline16 />下一次跟进计划</strong>
      <div>{data.nextPlan.map(item => <span key={item}>{item}</span>)}</div>
    </footer>
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
  const groups = useMemo(
    () => Array.from(new Set(data.tasks.map(task => task.group ?? task.priority))).map(group => ({
      group,
      tasks: data.tasks.filter(task => (task.group ?? task.priority) === group),
    })),
    [data.tasks],
  )
  const metrics = [
    { value: summary.urgent, label: '紧急处理', tone: 'risk' as const, icon: <IconWarningOutline16 /> },
    { value: summary.today, label: '今日完成', tone: 'blue' as const, icon: <IconChecklistOutline14 /> },
    { value: summary.meetings, label: '今日会议', tone: 'warn' as const, icon: <IconCalendarOutline16 /> },
    { value: summary.waiting, label: '等待反馈', tone: 'green' as const, icon: <IconQueueOutline14 /> },
    { value: Math.round(data.focusMinutes / 60 * 10) / 10, label: '专注小时', tone: 'blue' as const, icon: <IconGoalOutline16 /> },
  ]
  return <section className={css.root} aria-label="今日工作台">
    <header className={css.surfaceHeader}>
      <span className={css.headerIcon} aria-hidden="true"><IconListPenOutline16 /></span>
      <div className={css.headerBody}><span className={css.eyebrow}>{data.date} · {data.owner} · {data.role ?? '项目负责人'}</span><h3>今天先把这 {data.tasks.length} 件事排好</h3><p>已按截止时间、项目风险、会议依赖和等待反馈自动排序。</p></div>
      <div className={css.progressRing}><strong>{progress}%</strong><span>今日完成度</span><div className={css.progressTrack}><span className={css.progressTrackFill} style={{ width: `${progress}%` }} /></div></div>
    </header>
    <div className={css.myDaySummary}>
      {metrics.map(metric => <Metric key={metric.label} value={metric.value} label={metric.label} tone={metric.tone} icon={metric.icon} />)}
    </div>
    <div className={css.dayLayout}>
      <div className={css.timeline}>
        {groups.map(group => (
          <section key={group.group} className={css.dayGroup}>
            <div className={css.groupTitle}>
              <span className={css.groupBadge} data-tone={groupTone(group.group)}>{groupIcon(group.group)}{group.group}</span>
              <small>{group.tasks.length} 项</small>
            </div>
            {group.tasks.map(task => (
              <DayTaskCard
                key={task.id}
                task={task}
                completed={completed.has(task.id)}
                expanded={expandedId === task.id}
                onToggleComplete={() => { setCompleted(current => toggleSet(current, task.id)) }}
                onToggleExpanded={() => { setExpandedId(current => current === task.id ? null : task.id) }}
              />
            ))}
          </section>
        ))}
      </div>
      <aside className={css.waitingPanel}><div className={css.panelTitle}><h4><IconQueueOutline14 />等待我反馈</h4><span>{waiting.length} 项</span></div>{waiting.map(item => <div key={item.id} className={css.waitingItem}><span className={css.waitingIcon} aria-hidden="true"><IconUserOutline16 /></span><div><strong>{item.title}</strong><span>{item.owner} · {item.since}</span></div></div>)}<button type="button"><IconSendOutline16 />统一发送提醒</button></aside>
    </div>
    <footer className={css.footer}><span>这些操作仅用于演示本地状态，不写入真实项目平台。</span><button type="button">进入我的任务</button></footer>
  </section>
}

function DayTaskCard({
  task,
  completed,
  expanded,
  onToggleComplete,
  onToggleExpanded,
}: {
  readonly task: MyDayTask
  readonly completed: boolean
  readonly expanded: boolean
  readonly onToggleComplete: () => void
  readonly onToggleExpanded: () => void
}): JSX.Element {
  return <article className={completed ? css.dayTaskDone : css.dayTask}>
    <div className={css.dayTaskMain}>
      <button type="button" className={completed ? css.todoCheckDone : css.todoCheck} role="checkbox" aria-checked={completed} aria-label={`标记完成：${task.title}`} onClick={onToggleComplete}>{completed ? <IconCheckOutline14 /> : null}</button>
      <div className={css.dayTaskBody}>
        <div className={css.dayTaskTopline}>
          <span data-priority={task.priority}>{priorityIcon(task.priority)}{task.priority}</span>
          <strong>{task.title}</strong>
        </div>
        <small>{task.reason}</small>
      </div>
      <div className={css.dayTaskMeta}>
        <span className={css.dueBadge} data-priority={task.priority}><IconCalendarOutline16 />{task.due}</span>
        <span className={css.projectChip}>{task.project}</span>
      </div>
    </div>
    {expanded && <p className={css.taskDetail}>{task.detail ?? task.reason}</p>}
    <div className={css.taskActions}><button type="button" className={css.primaryAction}>{task.primaryAction ?? '打开任务'}<IconRightUpOutline16 /></button><button type="button" aria-expanded={expanded} aria-label={`为什么排这里：${task.title}`} onClick={onToggleExpanded}><IconThinkOutline16 />{expanded ? '收起排期理由' : '为什么排这里'}</button><button type="button" aria-label={`标记完成：${task.title}`} onClick={onToggleComplete}>{completed ? '恢复未完成' : '标记完成'}</button></div>
  </article>
}

function Metric({ value, label, tone, icon }: { readonly value: number; readonly label: string; readonly tone: 'blue' | 'warn' | 'risk' | 'green'; readonly icon: JSX.Element }): JSX.Element {
  return <div className={css.metric} data-tone={tone}><span className={css.metricIcon} aria-hidden="true">{icon}</span><div className={css.metricMeta}><strong>{value}</strong><span>{label}</span></div></div>
}

function priorityIcon(priority: string): JSX.Element {
  if (priority === '紧急') return <IconWarningOutline16 />
  if (priority === '会议') return <IconCalendarOutline16 />
  if (priority === '等待') return <IconQueueOutline14 />
  return <IconListPenOutline16 />
}

function groupIcon(group: string): JSX.Element {
  if (group.includes('紧急')) return <IconWarningOutline16 />
  if (group.includes('会议')) return <IconCalendarOutline16 />
  if (group.includes('等待')) return <IconQueueOutline14 />
  return <IconChecklistOutline14 />
}

function groupTone(group: string): 'risk' | 'blue' | 'warn' | 'green' {
  if (group.includes('紧急')) return 'risk'
  if (group.includes('会议')) return 'warn'
  if (group.includes('等待')) return 'green'
  return 'blue'
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
