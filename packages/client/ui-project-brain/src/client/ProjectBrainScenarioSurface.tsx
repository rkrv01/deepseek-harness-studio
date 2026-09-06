import { useMemo, useState } from 'react'
import {
  IconCalendarOutline16,
  IconCheckOutline14,
  IconListPenOutline16,
  IconQueueOutline14,
  IconRightUpOutline16,
  IconSparkle16,
  IconThinkOutline16,
  IconUserOutline16,
  IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ProjectBrainCopilotData, ProjectBrainMyDayData } from '../project-data.ts'
import type { ProjectBrainSurfaceEnvelope } from '../scenario-registry.ts'
import { useProjectBrainLocale } from './use-project-brain-locale.ts'
import { PROJECT_BRAIN_PLATFORM_TARGET } from './platform-window.ts'
import { platformBusinessUrl } from './platform-config.ts'
import css from './ProjectBrainScenarioSurface.module.css'

type MyDayTask = ProjectBrainMyDayData['groups'][number]['tasks'][number]
type MyDayGroup = ProjectBrainMyDayData['groups'][number]

const CIRCLED_NUMERALS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'] as const

/** Render a configured scenario through an allow-listed React surface template. */
export function ProjectBrainScenarioSurface({ surface }: { readonly surface: ProjectBrainSurfaceEnvelope }): JSX.Element | null {
  if (surface.template === 'my-day-workbench' && isMyDayData(surface.data)) return <MyDayWorkbench data={surface.data} />
  // Board first, then the AI wrap-up as a conversation-style bubble beneath it.
  if (surface.template === 'project-copilot-dashboard' && isCopilotData(surface.data)) {
    return <ProjectCopilotDashboard data={surface.data} />
  }
  return null
}

/** AI project-manager report dashboard (doc 03): status strip, hero metrics, active tracking, findings, decisions, overview. */
function ProjectCopilotDashboard({ data }: { readonly data: ProjectBrainCopilotData }): JSX.Element {
  const locale = useProjectBrainLocale()
  return <section className={`${css.root} ${css.surfaceInline} ${css.surfacePadded}`} aria-label={locale === 'en' ? 'Project Caretaking Board' : '项目托管看板'}>
    <header className={css.surfaceHeader}>
      <span className={css.headerIcon} aria-hidden="true"><IconSparkle16 /></span>
      <div className={css.headerBody}>
        <span className={css.eyebrow}>{locale === 'en' ? 'AI Project Caretaking · ' : 'AI 项目托管 · '}{data.projectName}</span>
        <h3>{locale === 'en' ? 'Your AI project manager is reporting on the project status' : 'AI 项目经理正在向你汇报项目现状'}</h3>
        <p>{locale === 'en' ? 'Facts are shown on the board; I provide judgments, impact analysis, and management actions.' : '项目事实由看板展示，我负责给出判断、影响解释和管理动作。'}</p>
      </div>
      <div className={css.progressRing}>
        <strong>{data.progress}%</strong>
        <span>{locale === 'en' ? 'Current progress' : '当前进度'}</span>
        <div className={css.progressTrack}><span className={css.progressTrackFill} style={{ width: `${data.progress}%` }} /></div>
      </div>
    </header>
    <div className={css.agentStatusStrip} role="status">
      <span className={css.agentStatusDot} aria-hidden="true" /><strong>{locale === 'en' ? 'AI caretaking' : 'AI 托管中'}</strong>
      <span>{data.agentStatus.lastCheckAt} · {data.agentStatus.scope} · {data.agentStatus.nextCheckAt}</span>
    </div>
    <div className={css.copilotMetrics}>
      {data.metrics.map(metric => (
        <Metric key={metric.id} value={metric.value} label={metric.label} hint={metric.hint} tone={metric.tone} icon={<IconSparkle16 />} />
      ))}
    </div>
    <section className={css.panel} aria-label={locale === 'en' ? 'AI follow-ups in progress' : 'AI 正在跟进'}>
      <div className={css.panelTitle}>
        <h4><IconListPenOutline16 />{locale === 'en' ? 'AI follow-ups' : 'AI 正在跟进'}</h4>
        <span>{locale === 'en' ? 'Key items the AI is continuously tracking' : '当前由 AI 持续追踪的重点事项'}</span>
      </div>
      <div className={css.trackList}>
        {data.tracking.map(item => <article key={item.id} className={css.trackItem}>
          <div className={css.trackItemHead}><strong>{item.title}</strong><span className={css.trackStatusPill}>{item.status}</span></div>
          {item.aiActions.length > 0 && <p className={css.aiActionLine}>{item.aiActions.join(' · ')}</p>}
          {item.latestFeedback !== undefined && <small className={css.metaLine}>{locale === 'en' ? 'Latest feedback: ' : '最新反馈：'}{item.latestFeedback}</small>}
          <small className={css.metaLine}><IconRightUpOutline16 />{locale === 'en' ? 'Next: ' : '下一步：'}{item.nextStep}</small>
        </article>)}
      </div>
    </section>
    <div className={css.copilotGrid}>
      <section className={css.panel} aria-label={locale === 'en' ? 'AI findings today' : 'AI 今日发现'}>
        <div className={css.panelTitle}><h4><IconWarningOutline16 />{locale === 'en' ? 'AI findings today' : 'AI 今日发现'}</h4><span>{locale === 'en' ? 'Showing only anomalies and changes' : '只展示异常与变化'}</span></div>
        <div className={css.panelBody}>
          <div className={css.findingList}>
            {data.findings.map(finding => <span key={finding.id} className={css.findingChip}>{finding.label}</span>)}
          </div>
          <p className={css.findingsNote}>{data.findingsNote}</p>
        </div>
      </section>
      <section className={css.panel} aria-label={locale === 'en' ? 'Needs your attention' : '需要你处理'}>
        <div className={css.panelTitle}>
          <h4><IconUserOutline16 />{locale === 'en' ? 'Needs your attention' : '需要你处理'}</h4>
          <span>{locale === 'en' ? `${data.decisions.length} awaiting decision` : `${data.decisions.length} 项待决策`}</span>
        </div>
        <div className={css.decisionList}>
          {data.decisions.map(item => <article key={item.id} className={css.decisionItem}>
            <div><strong>{item.title}</strong><p>{item.context}</p><p className={css.aiAdviceLine}>{locale === 'en' ? 'AI suggestion: ' : 'AI 建议：'}{item.advice}</p><p className={css.decisionRoute}>{locale === 'en' ? 'Choose how to handle it below.' : '请在下方选择处理方式。'}</p></div>
          </article>)}
        </div>
      </section>
    </div>
    <section className={css.panel} aria-label={locale === 'en' ? 'Project overview' : '项目全貌'}>
      <div className={css.panelTitle}>
        <h4><IconCalendarOutline16 />{locale === 'en' ? 'Project overview' : '项目全貌'}</h4>
        <span>{locale === 'en' ? 'Low priority · routine data for reference' : '低优先级 · 常规数据备查'}</span>
      </div>
      <div className={css.packageRow}>
        {data.overview.packages.map(pkg => (
          <div key={pkg.id} className={css.packageCard} data-status={pkg.status}>
            <strong>{pkg.name}</strong>
            <span>{locale === 'en' ? `${pkg.done}/${pkg.total} tasks · ${pkg.status}` : `${pkg.done}/${pkg.total} 任务 · ${pkg.status}`}</span>
          </div>
        ))}
      </div>
      <div className={css.overviewGrid}>
        <div className={css.overviewBlock}>
          <h5>{locale === 'en' ? 'Task status distribution' : '任务状态分布'}</h5>
          {data.overview.taskStates.map(state => (
            <div key={state.label} className={css.overviewRow}>
              <span>{state.label}</span>
              <strong data-tone={overviewTone(state.label, locale)}>{state.count}</strong>
            </div>
          ))}
        </div>
        <div className={css.overviewBlock}>
          <h5>{locale === 'en' ? 'Risk overview' : '风险概览'}</h5>
          {data.overview.riskLevels.map(level => (
            <div key={level.level} className={css.overviewRow}>
              <span>{level.level}</span>
              <strong data-tone={overviewTone(level.level, locale)}>{level.count}</strong>
            </div>
          ))}
        </div>
        <div className={`${css.overviewBlock} ${css.overviewWide}`}>
          <h5>{locale === 'en' ? 'Due-soon and delayed tasks' : '临期与延期任务'}</h5>
          {data.overview.attention.map(item => (
            <div key={item.id} className={css.attentionRow}>
              <div><strong>{item.title}</strong><small>{item.owner} · {item.delay}</small></div>
              <em>{item.aiNote}</em>
            </div>
          ))}
        </div>
      </div>
    </section>
    <footer className={css.planFooter}>
      <strong><IconCalendarOutline16 />{locale === 'en' ? 'Upcoming follow-up plan' : '接下来的跟进计划'}</strong>
      <div>{data.nextPlan.map(item => <span key={item}>{item}</span>)}</div>
    </footer>
  </section>
}

/** Cross-project personal workbench (doc 04): numbered ordering, completion-driven reorder, deferred and done areas. */
function MyDayWorkbench({ data }: { readonly data: ProjectBrainMyDayData }): JSX.Element {
  const locale = useProjectBrainLocale()
  /** Demo-local completed ids: they leave their group and join 今天已处理 immediately. */
  const [completedIds, setCompletedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const remainingPriority = useMemo(
    () => data.groups.flatMap(group => group.tasks).filter(task => !completedIds.has(task.id)),
    [completedIds, data.groups],
  )
  const groups = useMemo(
    () => data.groups.map(group => ({ ...group, tasks: group.tasks.filter(task => !completedIds.has(task.id)) })),
    [completedIds, data.groups],
  )
  const doneCount = data.doneToday.length + completedIds.size
  let ordinal = 0
  const doneTodayCount = [...completedIds].filter(id => id.startsWith('today-1') || id === 'today-2').length
  const metrics = [
    {
      value: Math.max(0, data.summary.priority - Math.min(data.summary.priority, doneTodayCount)),
      label: locale === 'en' ? 'Priority' : '优先处理',
      hint: locale === 'en' ? 'Impacts critical items' : '影响关键事项',
      tone: 'risk' as const,
    },
    { value: data.summary.today, label: locale === 'en' ? 'Done today' : '今日完成', hint: locale === 'en' ? 'Recommended today' : '建议今天完成', tone: 'blue' as const },
    { value: data.summary.meetings, label: locale === 'en' ? 'Meetings today' : '今日会议', hint: locale === 'en' ? 'Must attend' : '需要参加', tone: 'warn' as const },
    { value: data.summary.waiting, label: locale === 'en' ? 'Awaiting feedback' : '等待反馈', hint: locale === 'en' ? 'Others are waiting' : '他人正在等待', tone: 'green' as const },
    { value: data.summary.projects, label: locale === 'en' ? 'Projects involved' : '涉及项目', hint: locale === 'en' ? 'Sorted uniformly' : '已统一排序', tone: 'blue' as const },
  ]
  return <section className={`${css.root} ${css.surfaceNarrow}`} aria-label={locale === 'en' ? "Today's Workbench" : '今日工作台'}>
    <header className={css.surfaceHeader}>
      <span className={css.headerIcon} aria-hidden="true"><IconListPenOutline16 /></span>
      <div className={css.headerBody}>
        <span className={css.eyebrow}>{data.date} · {data.owner} · {data.role}</span>
        <h3>{data.headline}</h3>
        <p>{data.subtitle}</p>
      </div>
      <div className={css.progressRing}>
        <strong>{Math.round(completedIds.size / 6 * 100)}%</strong>
        <span>{locale === 'en' ? 'Progress today' : '今日推进'}</span>
        <div className={css.progressTrack}>
          <span className={css.progressTrackFill} style={{ width: `${Math.round(completedIds.size / 6 * 100)}%` }} />
        </div>
      </div>
    </header>
    <div className={css.myDaySummary}>
      {metrics.map(metric => (
        <Metric
          key={metric.label}
          value={metric.value}
          label={metric.label}
          hint={metric.hint}
          tone={metric.tone}
          icon={<IconListPenOutline16 />}
        />
      ))}
    </div>
    {completedIds.size > 0 && remainingPriority[0] !== undefined && (
      <p className={css.reorderNotice} role="status">{data.reorderNoticeTemplate.replace('{title}', remainingPriority[0].title)}</p>
    )}
    <div className={css.dayLayout}>
      <div className={css.timeline}>
        {groups.filter(group => group.tasks.length > 0).map(group => (
          <section key={group.id} className={css.dayGroup}>
            <div className={css.groupTitle}>
              <span className={css.groupBadge} data-tone={group.tone}>{group.title}</span>
              <small>{locale === 'en' ? `${group.tasks.length} items` : `${group.tasks.length} 项`}</small>
            </div>
            {group.tasks.map((task) => {
              ordinal += 1
              const numeral = CIRCLED_NUMERALS[ordinal - 1] ?? String(ordinal)
              return <DayTaskCard
                key={task.id}
                numeral={numeral}
                task={task}
                expanded={expandedId === task.id}
                onToggleExpanded={() => { setExpandedId(current => current === task.id ? null : task.id) }}
                onComplete={() => { setCompletedIds(current => toggleSet(current, task.id)) }}
              />
            })}
          </section>
        ))}
      </div>
      <aside className={css.waitingPanel}>
        <div className={css.panelTitle}>
          <h4><IconQueueOutline14 />{locale === 'en' ? 'Can be set aside for now' : '可以暂时放一放'}</h4>
          <span>{locale === 'en' ? `${data.deferred.length} items` : `${data.deferred.length} 项`}</span>
        </div>
        {data.deferred.map(item => (
          <div key={item.id} className={css.deferredItem}>
            <strong>{item.title}</strong>
            <small>{item.project} · {item.reason}</small>
            <button type="button">{locale === 'en' ? 'View task' : '查看任务'}</button>
          </div>
        ))}
        <details className={css.doneDetails}>
          <summary>{locale === 'en' ? `Handled today · ${doneCount}` : `今天已处理 · ${doneCount}`}</summary>
          {[
            ...data.doneToday,
            ...data.groups.flatMap(group => group.tasks).filter(task => completedIds.has(task.id)).map(task => ({ id: task.id, title: task.title })),
          ].map(item => <div key={item.id} className={css.doneRow}><IconCheckOutline14 />{item.title}</div>)}
        </details>
      </aside>
    </div>
    <footer className={css.footer}>
      <span>{locale === 'en' ? 'Reordering after marking complete is recalculated only within the demo and is not written to the real project platform.' : '标记完成后排序仅在演示内重新计算，不写入真实项目平台。'}</span>
      {/* <button type="button">进入我的任务</button> */}
    </footer>
  </section>
}

function DayTaskCard({
  numeral,
  task,
  expanded,
  onToggleExpanded,
  onComplete,
}: {
  readonly numeral: string
  readonly task: MyDayTask
  readonly expanded: boolean
  readonly onToggleExpanded: () => void
  readonly onComplete: () => void
}): JSX.Element {
  const locale = useProjectBrainLocale()
  return <article className={css.dayTask}>
    <div className={css.dayTaskMain}>
      <span className={css.orderNumeral} aria-hidden="true">{numeral}</span>
      <div className={css.dayTaskBody}>
        <div className={css.dayTaskTopline}>
          {task.tags.map(tag => <span key={tag} className={css.taskTag}>{tag}</span>)}
          <strong>{task.title}</strong>
        </div>
        <small>{task.reason}</small>
      </div>
      <div className={css.dayTaskMeta}>
        <span className={css.dueBadge}><IconCalendarOutline16 />{task.due}</span>
        <span className={css.projectChip}>{task.project}</span>
      </div>
    </div>
    {expanded && <div className={css.taskDetail}>{task.detail.map(line => <span key={line}>{line}</span>)}</div>}
    <div className={css.taskActions}>
      <a
        href={platformBusinessUrl('#/workspace/workbench')}
        target={PROJECT_BRAIN_PLATFORM_TARGET}
        className={css.primaryAction}
      >{locale === 'en' ? 'Open task' : '打开任务'}<IconRightUpOutline16 /></a>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={locale === 'en' ? `Why ranked here: ${task.title}` : `为什么排这里：${task.title}`}
        onClick={onToggleExpanded}
      ><IconThinkOutline16 />{expanded ? (locale === 'en' ? 'Hide ranking reason' : '收起排期理由') : (locale === 'en' ? 'Why ranked here' : '为什么排这里')}</button>
      <button type="button" onClick={onComplete}>{locale === 'en' ? 'Mark complete' : '标记完成'}</button>
    </div>
  </article>
}

/** Shared stop-light tone for overview counts (task states and risk levels). */
function overviewTone(label: string, locale: 'zh' | 'en'): 'green' | 'warn' | 'risk' | undefined {
  if (locale === 'en') {
    if (/complete|on track|low risk/i.test(label)) return 'green'
    if (/due soon|medium risk/i.test(label)) return 'warn'
    if (/delayed|overdue|high risk/i.test(label)) return 'risk'
    return undefined
  }
  if (/完成|正常|低风险/u.test(label)) return 'green'
  if (/临期|中风险/u.test(label)) return 'warn'
  if (/滞后|高风险/u.test(label)) return 'risk'
  return undefined
}

interface MetricProps {
  readonly value: number | string
  readonly label: string
  readonly hint?: string
  readonly tone: 'blue' | 'warn' | 'risk' | 'green'
  readonly icon?: JSX.Element
}

function Metric({ value, label, hint, tone, icon }: MetricProps): JSX.Element {
  return (
    <div className={css.metric} data-tone={tone}>
      <span className={css.metricIcon} aria-hidden="true">{icon ?? <IconWarningOutline16 />}</span>
      <div className={css.metricMeta}>
        <strong>{value}</strong>
        <span>{label}</span>
        {hint !== undefined && <small>{hint}</small>}
      </div>
    </div>
  )
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
  return typeof candidate.date === 'string' && typeof candidate.headline === 'string' && typeof candidate.subtitle === 'string'
    && typeof candidate.summary === 'object' && candidate.summary !== null
    && Array.isArray(candidate.groups) && candidate.groups.every(isMyDayGroup)
    && Array.isArray(candidate.deferred) && Array.isArray(candidate.doneToday)
    && typeof candidate.reorderNoticeTemplate === 'string'
}

function isMyDayGroup(value: unknown): value is MyDayGroup {
  if (typeof value !== 'object' || value === null) return false
  const group = value as Partial<MyDayGroup>
  return typeof group.id === 'string' && typeof group.title === 'string'
    && Array.isArray(group.tasks) && group.tasks.every(isMyDayTaskShape)
}

function isMyDayTaskShape(value: unknown): value is MyDayTask {
  if (typeof value !== 'object' || value === null) return false
  const task = value as Partial<MyDayTask>
  return typeof task.id === 'string' && typeof task.title === 'string' && typeof task.project === 'string'
    && typeof task.due === 'string' && typeof task.reason === 'string' && Array.isArray(task.detail)
}

function isCopilotData(value: unknown): value is ProjectBrainCopilotData {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ProjectBrainCopilotData>
  return typeof candidate.projectName === 'string' && typeof candidate.progress === 'number'
    && typeof candidate.agentStatus === 'object' && candidate.agentStatus !== null
    && Array.isArray(candidate.metrics) && Array.isArray(candidate.tracking)
    && Array.isArray(candidate.findings) && Array.isArray(candidate.decisions)
    && typeof candidate.aiNarrative === 'object' && candidate.aiNarrative !== null
    && typeof candidate.overview === 'object' && candidate.overview !== null
    && Array.isArray(candidate.nextPlan) && typeof candidate.findingsNote === 'string'
    && typeof candidate.permissionMode === 'string'
}
