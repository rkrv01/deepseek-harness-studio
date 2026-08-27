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
  const [handledDecisions, setHandledDecisions] = useState<ReadonlySet<string>>(() => new Set())
  return <section className={`${css.root} ${css.surfaceInline} ${css.surfacePadded}`} aria-label="项目托管看板">
    <header className={css.surfaceHeader}>
      <span className={css.headerIcon} aria-hidden="true"><IconSparkle16 /></span>
      <div className={css.headerBody}>
        <span className={css.eyebrow}>AI 项目托管 · {data.projectName}</span>
        <h3>AI 项目经理正在向你汇报项目现状</h3>
        <p>项目事实由看板展示，我负责给出判断、影响解释和管理动作。</p>
      </div>
      <div className={css.progressRing}>
        <strong>{data.progress}%</strong>
        <span>当前进度</span>
        <div className={css.progressTrack}><span className={css.progressTrackFill} style={{ width: `${data.progress}%` }} /></div>
      </div>
    </header>
    <div className={css.agentStatusStrip} role="status">
      <span className={css.agentStatusDot} aria-hidden="true" /><strong>AI 托管中</strong>
      <span>{data.agentStatus.lastCheckAt} · {data.agentStatus.scope} · {data.agentStatus.nextCheckAt}</span>
    </div>
    <div className={css.copilotMetrics}>
      {data.metrics.map(metric => (
        <Metric key={metric.id} value={metric.value} label={metric.label} hint={metric.hint} tone={metric.tone} icon={<IconSparkle16 />} />
      ))}
    </div>
    <section className={css.panel} aria-label="AI 正在跟进">
      <div className={css.panelTitle}>
        <h4><IconListPenOutline16 />AI 正在跟进</h4>
        <span>当前由 AI 持续追踪的重点事项</span>
      </div>
      <div className={css.trackList}>
        {data.tracking.map(item => <article key={item.id} className={css.trackItem}>
          <div className={css.trackItemHead}><strong>{item.title}</strong><span className={css.trackStatusPill}>{item.status}</span></div>
          {item.aiActions.length > 0 && <p className={css.aiActionLine}>{item.aiActions.join(' · ')}</p>}
          {item.latestFeedback !== undefined && <small className={css.metaLine}>最新反馈：{item.latestFeedback}</small>}
          <small className={css.metaLine}><IconRightUpOutline16 />下一步：{item.nextStep}</small>
        </article>)}
      </div>
    </section>
    <div className={css.copilotGrid}>
      <section className={css.panel} aria-label="AI 今日发现">
        <div className={css.panelTitle}><h4><IconWarningOutline16 />AI 今日发现</h4><span>只展示异常与变化</span></div>
        <div className={css.panelBody}>
          <div className={css.findingList}>
            {data.findings.map(finding => <span key={finding.id} className={css.findingChip}>{finding.label}</span>)}
          </div>
          <p className={css.findingsNote}>{data.findingsNote}</p>
        </div>
      </section>
      <section className={css.panel} aria-label="需要你处理">
        <div className={css.panelTitle}>
          <h4><IconUserOutline16 />需要你处理</h4>
          <span>{data.decisions.length - handledDecisions.size} 项待确认</span>
        </div>
        <div className={css.decisionList}>
          {data.decisions.map(item => handledDecisions.has(item.id)
            ? (
              <article key={item.id} className={css.decisionDone}>
                <strong>{item.title}</strong>
                <p>已采纳建议，我会持续跟进执行结果。</p>
              </article>
            )
            : (
              <article key={item.id} className={css.decisionItem}>
                <div><strong>{item.title}</strong><p>{item.context}</p><p className={css.aiAdviceLine}>AI 建议：{item.advice}</p></div>
                <div className={css.decisionActions}>
                  <button type="button">查看影响</button>
                  <button
                    type="button"
                    onClick={() => { setHandledDecisions(current => toggleSet(current, item.id)) }}
                  >采用建议</button>
                </div>
              </article>
            ))}
          {handledDecisions.size === data.decisions.length && (
            <p className={css.findingsNote}>当前没有需要你立即处理的事项，其他异常我会继续跟进。</p>
          )}
        </div>
      </section>
    </div>
    <section className={css.panel} aria-label="项目全貌">
      <div className={css.panelTitle}>
        <h4><IconCalendarOutline16 />项目全貌</h4>
        <span>低优先级 · 常规数据备查</span>
      </div>
      <div className={css.packageRow}>
        {data.overview.packages.map(pkg => (
          <div key={pkg.id} className={css.packageCard} data-status={pkg.status}>
            <strong>{pkg.name}</strong>
            <span>{pkg.done}/{pkg.total} 任务 · {pkg.status}</span>
          </div>
        ))}
      </div>
      <div className={css.overviewGrid}>
        <div className={css.overviewBlock}>
          <h5>任务状态分布</h5>
          {data.overview.taskStates.map(state => (
            <div key={state.label} className={css.overviewRow}>
              <span>{state.label}</span>
              <strong data-tone={overviewTone(state.label)}>{state.count}</strong>
            </div>
          ))}
        </div>
        <div className={css.overviewBlock}>
          <h5>风险概览</h5>
          {data.overview.riskLevels.map(level => (
            <div key={level.level} className={css.overviewRow}>
              <span>{level.level}</span>
              <strong data-tone={overviewTone(level.level)}>{level.count}</strong>
            </div>
          ))}
        </div>
        <div className={`${css.overviewBlock} ${css.overviewWide}`}>
          <h5>临期与延期任务</h5>
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
      <strong><IconCalendarOutline16 />接下来的跟进计划</strong>
      <div>{data.nextPlan.map(item => <span key={item}>{item}</span>)}</div>
    </footer>
  </section>
}

/** Cross-project personal workbench (doc 04): numbered ordering, completion-driven reorder, deferred and done areas. */
function MyDayWorkbench({ data }: { readonly data: ProjectBrainMyDayData }): JSX.Element {
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
      label: '优先处理',
      hint: '影响关键事项',
      tone: 'risk' as const,
    },
    { value: data.summary.today, label: '今日完成', hint: '建议今天完成', tone: 'blue' as const },
    { value: data.summary.meetings, label: '今日会议', hint: '需要参加', tone: 'warn' as const },
    { value: data.summary.waiting, label: '等待反馈', hint: '他人正在等待', tone: 'green' as const },
    { value: data.summary.projects, label: '涉及项目', hint: '已统一排序', tone: 'blue' as const },
  ]
  return <section className={`${css.root} ${css.surfaceNarrow}`} aria-label="今日工作台">
    <header className={css.surfaceHeader}>
      <span className={css.headerIcon} aria-hidden="true"><IconListPenOutline16 /></span>
      <div className={css.headerBody}>
        <span className={css.eyebrow}>{data.date} · {data.owner} · {data.role}</span>
        <h3>{data.headline}</h3>
        <p>{data.subtitle}</p>
      </div>
      <div className={css.progressRing}>
        <strong>{Math.round(completedIds.size / 6 * 100)}%</strong>
        <span>今日推进</span>
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
              <small>{group.tasks.length} 项</small>
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
          <h4><IconQueueOutline14 />可以暂时放一放</h4>
          <span>{data.deferred.length} 项</span>
        </div>
        {data.deferred.map(item => (
          <div key={item.id} className={css.deferredItem}>
            <strong>{item.title}</strong>
            <small>{item.project} · {item.reason}</small>
            <button type="button">查看任务</button>
          </div>
        ))}
        <details className={css.doneDetails}>
          <summary>今天已处理 · {doneCount}</summary>
          {[
            ...data.doneToday,
            ...data.groups.flatMap(group => group.tasks).filter(task => completedIds.has(task.id)).map(task => ({ id: task.id, title: task.title })),
          ].map(item => <div key={item.id} className={css.doneRow}><IconCheckOutline14 />{item.title}</div>)}
        </details>
      </aside>
    </div>
    <footer className={css.footer}>
      <span>标记完成后排序仅在演示内重新计算，不写入真实项目平台。</span>
      <button type="button">进入我的任务</button>
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
      >打开任务<IconRightUpOutline16 /></a>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={`为什么排这里：${task.title}`}
        onClick={onToggleExpanded}
      ><IconThinkOutline16 />{expanded ? '收起排期理由' : '为什么排这里'}</button>
      <button type="button" onClick={onComplete}>标记完成</button>
    </div>
  </article>
}

/** Shared stop-light tone for overview counts (task states and risk levels). */
function overviewTone(label: string): 'green' | 'warn' | 'risk' | undefined {
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
