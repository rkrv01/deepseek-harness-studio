import { useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconCalendarOutline16, IconChecklistOutline14, IconFolderOpenOutline16, IconGoalOutline16, IconListPenOutline16, IconWarningOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { MEETING_ANALYSIS_MOCK } from '../project-data.ts'
import type { ProjectBrainMeetingActionItem, ProjectBrainMeetingSubtask } from '../project-data.ts'
import type { ProjectBrainLaunchPlan, ProjectBrainRisk, ProjectBrainStage, ProjectBrainState, ProjectBrainTask } from './state.ts'
import { clonePlan } from './state.ts'
import css from './ProjectBrainWorkbench.module.css'

export interface ProjectBrainWorkbenchInjected { hooks: { projectBrain: import('@deepseek-ai/dsh-client-runtime/client').ObservableSnapshot<ProjectBrainState> }; closeDetails(): void; submitRevision(plan: ProjectBrainLaunchPlan): Promise<void>; submitMeetingRevision(items: ProjectBrainMeetingActionItem[]): Promise<void> }
type Section = 'project' | 'stages' | 'tasks' | 'risks' | 'folders'
type EditorProps = { draft: ProjectBrainLaunchPlan; update(recipe: (plan: ProjectBrainLaunchPlan) => ProjectBrainLaunchPlan): void }

/** Visual draft editor for the Project Brain proposal displayed in this conversation. */
export function ProjectBrainWorkbench({ useProjectBrain, closeDetails, submitRevision, submitMeetingRevision }: PropsRuntime<'conversation.details.workbench'> & InjectFace<ProjectBrainWorkbenchInjected>) {
  const state = useProjectBrain(s => s)
  const source = state.plan
  const [draft, setDraft] = useState<ProjectBrainLaunchPlan | null>(source === null ? null : clonePlan(source))
  const [active, setActive] = useState<Section>('project')
  const [stageIndex, setStageIndex] = useState(0)
  const [taskIndex, setTaskIndex] = useState(0)
  const [riskIndex, setRiskIndex] = useState(0)
  useEffect(() => { setDraft(source === null ? null : clonePlan(source)); setStageIndex(0); setTaskIndex(0); setRiskIndex(0) }, [source])
  const dirty = useMemo(() => source !== null && draft !== null && JSON.stringify(source) !== JSON.stringify(draft), [source, draft])
  if (state.phase === 'meeting-plan-ready') return <MeetingTaskEditor closeDetails={closeDetails} submitMeetingRevision={submitMeetingRevision} />
  if (source === null || draft === null || state.phase === 'generating' || state.phase === 'revising') return null
  const update = (recipe: (plan: ProjectBrainLaunchPlan) => ProjectBrainLaunchPlan): void => { setDraft(current => current === null ? null : recipe(current)) }
  const sections = [
    ['project', '01', '项目基础信息', '目标、周期与预算', IconGoalOutline16],
    ['stages', '02', '阶段规划', `${draft.stages.length} 个阶段`, IconChecklistOutline14],
    ['tasks', '03', '任务', `${draft.tasks.length} 项待办`, IconListPenOutline16],
    ['risks', '04', '风险', `${draft.risks.length} 项关注`, IconWarningOutline16],
    ['folders', '05', '知识目录', `${draft.knowledgeFolders.length} 个目录`, IconFolderOpenOutline16],
  ] as const
  const activeMeta = sections.find(item => item[0] === active)!
  return <div className={css.root}>
    <header className={css.header}><div><div className={css.eyebrow}>项目智脑 · 当前会话方案</div><h2 className={css.title}>编辑项目方案</h2><p className={css.headerHint}>把 AI 生成的启动方案微调为更贴近项目实际的执行基线。</p></div><div className={css.status}><span className={dirty ? css.statusDirty : css.statusClean} />{dirty ? '草稿已修改' : '方案未修改'}</div></header>
    <div className={css.editor}>
      <nav className={css.navigation} aria-label="项目方案编辑导航" data-orientation="horizontal">{sections.map(([key, number, title, description, Icon]) => <button type="button" key={key} className={key === active ? css.navActive : css.navItem} onClick={() => { setActive(key) }}><span className={css.number}>{number}</span><span className={css.navIcon} data-testid={`project-brain-nav-icon-${key}`} aria-hidden="true"><Icon /></span><span><strong>{title}</strong><small>{description}</small></span></button>)}</nav>
      <main className={css.canvas}><div className={css.canvasHeader}><span className={css.canvasNumber}>{activeMeta[1]}</span><div><h3>{activeMeta[2]}</h3><p>{hint(active)}</p></div></div>
        {active === 'project' && <ProjectFields draft={draft} update={update} />}
        {active === 'stages' && <Stages draft={draft} update={update} index={stageIndex} setIndex={setStageIndex} />}
        {active === 'tasks' && <Tasks draft={draft} update={update} index={taskIndex} setIndex={setTaskIndex} />}
        {active === 'risks' && <Risks draft={draft} update={update} index={riskIndex} setIndex={setRiskIndex} />}
        {active === 'folders' && <Folders draft={draft} update={update} />}
      </main>
    </div>
    <footer className={css.actions}><span>{dirty ? '修改将在重新生成方案后生效' : '可在任一栏目中调整方案内容'}</span><div><button type="button" className={css.secondary} onClick={() => { setDraft(clonePlan(source)); setStageIndex(0); setTaskIndex(0); setRiskIndex(0); closeDetails() }}>取消修改</button><button type="button" disabled={!dirty} className={css.primary} onClick={() => { void submitRevision(draft) }}>提交修改并重新生成</button></div></footer>
  </div>
}

function ProjectFields({ draft, update }: EditorProps): JSX.Element { return <><div className={css.projectOverview}><div><span>项目周期</span><strong>{draft.project.startDate.slice(0, 7)} — {draft.project.endDate.slice(0, 7)}</strong></div><div><span>预计投入</span><strong>¥ {(draft.project.budget / 10_000).toLocaleString('zh-CN')} 万</strong></div><div><span>项目负责人</span><strong>{draft.project.owner || '待补充'}</strong></div></div><div className={css.grid}><Field wide label="项目名称" value={draft.project.name} onChange={value => update(plan => ({ ...plan, project: { ...plan.project, name: value } }))} /><Field label="项目负责人" value={draft.project.owner} onChange={value => update(plan => ({ ...plan, project: { ...plan.project, owner: value } }))} /><Field label="项目预算（元）" type="number" value={String(draft.project.budget)} onChange={value => update(plan => ({ ...plan, project: { ...plan.project, budget: Number(value) || 0 } }))} /><Field label="项目开始日期" type="date" value={draft.project.startDate} onChange={value => update(plan => ({ ...plan, project: { ...plan.project, startDate: value } }))} /><Field label="项目结束日期" type="date" value={draft.project.endDate} onChange={value => update(plan => ({ ...plan, project: { ...plan.project, endDate: value } }))} /><Field wide multiline label="项目简介" value={draft.project.summary} onChange={value => update(plan => ({ ...plan, project: { ...plan.project, summary: value } }))} /><Field wide multiline label="项目目标" value={draft.project.goal} onChange={value => update(plan => ({ ...plan, project: { ...plan.project, goal: value } }))} /></div></> }
function Stages({ draft, update, index, setIndex }: EditorProps & { index: number; setIndex(index: number): void }): JSX.Element { const stage = draft.stages[index]; return <div className={css.split}><div className={`${css.list} ${css.stageList}`}>{draft.stages.map((item, itemIndex) => <Item key={item.id} number={itemIndex + 1} active={itemIndex === index} title={item.name} subtitle={`${item.startDate} — ${item.endDate}`} onClick={() => { setIndex(itemIndex) }} />)}</div><div className={css.card}>{stage === undefined ? <Empty /> : <><CardHeader label="当前阶段" removeLabel="删除此阶段" canRemove={draft.stages.length > 1} onRemove={() => { update(plan => ({ ...plan, stages: plan.stages.filter((_, itemIndex) => itemIndex !== index) })); setIndex(Math.max(0, index - 1)) }} /><StageFields stage={stage} onChange={next => update(plan => ({ ...plan, stages: plan.stages.map((item, itemIndex) => itemIndex === index ? next : item) }))} /></>}<button type="button" className={css.add} onClick={() => { update(plan => ({ ...plan, stages: [...plan.stages, newStage(plan.stages.length + 1)] })); setIndex(draft.stages.length) }}>+ 新增阶段</button></div></div> }
function Tasks({ draft, update, index, setIndex }: EditorProps & { index: number; setIndex(index: number): void }): JSX.Element { const task = draft.tasks[index]; return <div className={css.split}><div className={css.list}>{draft.tasks.map((item, itemIndex) => <Item key={item.id} active={itemIndex === index} title={item.title} subtitle={`${item.owner} · ${item.startDate}`} onClick={() => { setIndex(itemIndex) }} />)}</div><div className={css.card}>{task === undefined ? <Empty /> : <><CardHeader label="任务详情" removeLabel="删除任务" canRemove onRemove={() => { update(plan => ({ ...plan, tasks: plan.tasks.filter((_, itemIndex) => itemIndex !== index) })); setIndex(Math.max(0, index - 1)) }} /><TaskFields task={task} onChange={next => update(plan => ({ ...plan, tasks: plan.tasks.map((item, itemIndex) => itemIndex === index ? next : item) }))} /></>}<button type="button" className={css.add} onClick={() => { update(plan => ({ ...plan, tasks: [...plan.tasks, newTask(plan.tasks.length + 1)] })); setIndex(draft.tasks.length) }}>+ 新增任务</button></div></div> }
function Risks({ draft, update, index, setIndex }: EditorProps & { index: number; setIndex(index: number): void }): JSX.Element { const risk = draft.risks[index]; return <div className={css.split}><div className={css.list}>{draft.risks.map((item, itemIndex) => <Item key={item.id} active={itemIndex === index} title={item.title} subtitle={`${item.level}级 · ${item.owner}`} onClick={() => { setIndex(itemIndex) }} />)}</div><div className={css.card}>{risk === undefined ? <Empty /> : <><CardHeader label="风险详情" removeLabel="删除风险" canRemove onRemove={() => { update(plan => ({ ...plan, risks: plan.risks.filter((_, itemIndex) => itemIndex !== index) })); setIndex(Math.max(0, index - 1)) }} /><RiskFields risk={risk} onChange={next => update(plan => ({ ...plan, risks: plan.risks.map((item, itemIndex) => itemIndex === index ? next : item) }))} /></>}<button type="button" className={css.add} onClick={() => { update(plan => ({ ...plan, risks: [...plan.risks, newRisk(plan.risks.length + 1)] })); setIndex(draft.risks.length) }}>+ 新增风险</button></div></div> }
function Folders({ draft, update }: EditorProps): JSX.Element { return <div className={css.folderGrid}>{draft.knowledgeFolders.map((folder, index) => <label className={css.folder} key={`${folder}-${index}`}><span>资料目录</span><input className={css.input} value={folder} onChange={event => update(plan => ({ ...plan, knowledgeFolders: plan.knowledgeFolders.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} /><button type="button" className={css.removeFolder} onClick={() => update(plan => ({ ...plan, knowledgeFolders: plan.knowledgeFolders.filter((_, itemIndex) => itemIndex !== index) }))}>×</button></label>)}<button type="button" className={css.folderAdd} onClick={() => update(plan => ({ ...plan, knowledgeFolders: [...plan.knowledgeFolders, '新建资料目录'] }))}>+ 新增资料目录</button></div> }
function Item({ active, number, title, subtitle, onClick }: { active: boolean; number?: number; title: string; subtitle: string; onClick(): void }): JSX.Element { return <button type="button" className={active ? css.itemActive : css.item} onClick={onClick}>{number === undefined ? null : <span className={css.itemNumber}>{String(number).padStart(2, '0')}</span>}<strong>{title}</strong><small>{subtitle}</small></button> }
function CardHeader({ label, removeLabel, canRemove, onRemove }: { label: string; removeLabel: string; canRemove: boolean; onRemove(): void }): JSX.Element { return <div className={css.cardHeader}><strong>{label}</strong><button type="button" className={css.danger} disabled={!canRemove} onClick={onRemove}>{removeLabel}</button></div> }
function Empty(): JSX.Element { return <div className={css.empty}>暂无内容，可直接新增。</div> }
function StageFields({ stage, onChange }: { stage: ProjectBrainStage; onChange(stage: ProjectBrainStage): void }): JSX.Element { return <div className={css.grid}><Field wide label="阶段名称" value={stage.name} onChange={value => onChange({ ...stage, name: value })} /><Field label="阶段负责人" value={stage.owner} onChange={value => onChange({ ...stage, owner: value })} /><Field label="开始日期" type="date" value={stage.startDate} onChange={value => onChange({ ...stage, startDate: value })} /><Field label="结束日期" type="date" value={stage.endDate} onChange={value => onChange({ ...stage, endDate: value })} /><Field wide multiline label="关键交付物" value={stage.deliverable} onChange={value => onChange({ ...stage, deliverable: value })} /></div> }
function TaskFields({ task, onChange }: { task: ProjectBrainTask; onChange(task: ProjectBrainTask): void }): JSX.Element { return <div className={css.grid}><Field wide label="任务名称" value={task.title} onChange={value => onChange({ ...task, title: value })} /><Field label="负责人" value={task.owner} onChange={value => onChange({ ...task, owner: value })} /><Field label="开始日期" type="date" value={task.startDate} onChange={value => onChange({ ...task, startDate: value })} /><Field label="结束日期" type="date" value={task.endDate} onChange={value => onChange({ ...task, endDate: value })} /><Field wide label="前置依赖" value={task.dependency} onChange={value => onChange({ ...task, dependency: value })} /></div> }
function RiskFields({ risk, onChange }: { risk: ProjectBrainRisk; onChange(risk: ProjectBrainRisk): void }): JSX.Element { return <div className={css.grid}><Field wide label="风险名称" value={risk.title} onChange={value => onChange({ ...risk, title: value })} /><Field label="风险类型" value={risk.type} onChange={value => onChange({ ...risk, type: value })} /><Field label="负责人" value={risk.owner} onChange={value => onChange({ ...risk, owner: value })} /><label className={css.label}>风险等级<select className={css.input} value={risk.level} onChange={event => onChange({ ...risk, level: event.target.value })}><option>高</option><option>中</option><option>低</option></select></label><Field wide multiline label="风险描述" value={risk.description} onChange={value => onChange({ ...risk, description: value })} /><Field wide multiline label="应对措施" value={risk.mitigation} onChange={value => onChange({ ...risk, mitigation: value })} /></div> }
function Field({ label, value, type = 'text', multiline = false, wide = false, onChange }: { label: string; value: string; type?: 'text' | 'date' | 'number'; multiline?: boolean; wide?: boolean; onChange(value: string): void }): JSX.Element { if (type === 'date') return <ProjectDatePicker label={label} value={value} wide={wide} onChange={onChange} />; return <label className={wide ? css.labelWide : css.label}>{label}{multiline ? <textarea className={css.textarea} value={value} onChange={(event) => { onChange(event.target.value) }} /> : <input className={css.input} type={type} value={value} onChange={(event) => { onChange(event.target.value) }} />}</label> }
function ProjectDatePicker({ label, value, wide, onChange }: { label: string; value: string; wide: boolean; onChange(value: string): void }): JSX.Element { const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null); useEffect(() => { if (!open) return; const close = (event: PointerEvent): void => { if (!root.current?.contains(event.target as Node)) setOpen(false) }; document.addEventListener('pointerdown', close); return () => { document.removeEventListener('pointerdown', close) } }, [open]); const selected = parseProjectDate(value); return <div className={wide ? css.dateWide : css.dateField} ref={root}><span>{label}</span><button type="button" className={css.dateButton} aria-label={`选择${label}`} aria-expanded={open} onClick={() => { setOpen(current => !current) }}><time dateTime={value}>{formatProjectDate(value)}</time><IconCalendarOutline16 /></button>{open ? <div className={css.datePopover} role="dialog" aria-label="选择日期"><DayPicker mode="single" selected={selected} defaultMonth={selected} onSelect={(date) => { if (date === undefined) return; onChange(toProjectDate(date)); setOpen(false) }} /></div> : null}</div> }
function parseProjectDate(value: string): Date { const [year, month, day] = value.split('-').map(Number); return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1) }
function toProjectDate(value: Date): string { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` }
function formatProjectDate(value: string): string { return value.replaceAll('-', '/') }
function hint(section: Section): string { return { project: '统一维护项目背景、周期与关键投入。', stages: '按阶段确定责任、周期与交付成果。', tasks: '选择一项任务后集中编辑执行信息。', risks: '聚焦启动阶段需要提前关注的风险。', folders: '整理后续沉淀资料的知识目录。' }[section] }
function newStage(index: number): ProjectBrainStage { return { id: `stage-new-${crypto.randomUUID()}`, name: `新阶段 ${index}`, owner: '', startDate: '2027-09-01', endDate: '2027-09-30', deliverable: '' } }
function newTask(index: number): ProjectBrainTask { return { id: `TASK-NEW-${index}-${crypto.randomUUID()}`, title: `新任务 ${index}`, owner: '', startDate: '2026-12-01', endDate: '2026-12-07', dependency: '—', progress: 0, deliverable: '', packageId: '' } }
function newRisk(index: number): ProjectBrainRisk { return { id: `R-NEW-${index}-${crypto.randomUUID()}`, title: '新风险', type: '阻塞', level: '中', owner: '', description: '', impact: '', mitigation: '', relatedTaskId: '' } }

/** Meeting task editor for the meeting-plan-ready phase — single-column list with type tags, add/delete, and subtasks. */
function MeetingTaskEditor({ closeDetails, submitMeetingRevision }: { readonly closeDetails: () => void; readonly submitMeetingRevision: (items: ProjectBrainMeetingActionItem[]) => Promise<void> }): JSX.Element {
  const initialItems = useMemo(() => MEETING_ANALYSIS_MOCK.actionItems.map(item => ({ ...item, subtasks: item.subtasks.map(st => ({ ...st })) })), [])
  const [items, setItems] = useState<ProjectBrainMeetingActionItem[]>(() => initialItems.map(item => ({ ...item, subtasks: item.subtasks.map(st => ({ ...st })) })))
  const dirty = useMemo(() => JSON.stringify(items) !== JSON.stringify(initialItems), [items, initialItems])
  const resetDraft = (): void => { setItems(initialItems.map(item => ({ ...item, subtasks: item.subtasks.map(st => ({ ...st })) }))) }
  const updateItem = (id: string, patch: Partial<ProjectBrainMeetingActionItem>): void => {
    setItems(current => current.map(item => item.id === id ? { ...item, ...patch } : item))
  }
  const deleteItem = (id: string): void => { setItems(current => current.filter(item => item.id !== id)) }
  const addItem = (): void => {
    setItems(current => [...current, {
      id: `mtg-task-${crypto.randomUUID()}`, type: 'new-task' as const, title: '新任务', description: '', owner: '', dueDate: '2026-09-01', source: '', subtasks: [],
    }])
  }
  const updateSubtask = (itemId: string, subtaskId: string, patch: Partial<ProjectBrainMeetingSubtask>): void => {
    setItems(current => current.map(item => item.id === itemId ? { ...item, subtasks: item.subtasks.map(st => st.id === subtaskId ? { ...st, ...patch } : st) } : item))
  }
  const addSubtask = (itemId: string): void => {
    setItems(current => current.map(item => item.id === itemId ? { ...item, subtasks: [...item.subtasks, { id: `mtg-sub-${crypto.randomUUID()}`, title: '新子任务', owner: '', dueDate: '2026-09-01' }] } : item))
  }
  const deleteSubtask = (itemId: string, subtaskId: string): void => {
    setItems(current => current.map(item => item.id === itemId ? { ...item, subtasks: item.subtasks.filter(st => st.id !== subtaskId) } : item))
  }
  const newCount = items.filter(i => i.type === 'new-task').length
  const updCount = items.filter(i => i.type === 'update-task').length
  const riskCount = items.filter(i => i.type === 'new-risk').length
  return <div className={css.root}>
    <header className={css.header}><div><div className={css.eyebrow}>项目智脑 · 会议任务拆解</div><h2 className={css.title}>编辑会议任务方案</h2><p className={css.headerHint}>调整每项行动事项的负责人、截止时间、执行说明与子任务。</p></div></header>
    <div className={css.meetingEditStats}>
      <span className={css.meetingEditStatNew}>新建任务 <strong>{newCount}</strong> 项</span>
      <span className={css.meetingEditStatDivider} aria-hidden="true" />
      <span className={css.meetingEditStatUpdate}>更新任务 <strong>{updCount}</strong> 项</span>
      <span className={css.meetingEditStatDivider} aria-hidden="true" />
      <span className={css.meetingEditStatRisk}>新增风险 <strong>{riskCount}</strong> 项</span>
    </div>
    <main className={css.meetingEditList}>
      {items.length === 0 && <div className={css.meetingEditEmpty}>暂无任务，点击下方"＋ 新增任务"添加。</div>}
      {items.map(item => {
        const tag = item.type === 'new-task' ? { label: '新建', cls: css.meetingTagNew } : item.type === 'update-task' ? { label: '更新', cls: css.meetingTagUpdate } : { label: '风险', cls: css.meetingTagRisk }
        return (
          <div key={item.id} className={css.meetingEditCard}>
            <div className={css.meetingEditCardHeader}>
              <span className={`${css.meetingEditTag} ${tag.cls}`}>{tag.label}</span>
              <input className={css.meetingEditTitleInput} value={item.title} onChange={e => updateItem(item.id, { title: e.target.value })} placeholder="任务名称" />
              <button type="button" className={css.meetingEditDelete} onClick={() => { deleteItem(item.id) }} aria-label={`删除任务「${item.title}」`}>×</button>
            </div>
            <div className={css.grid}>
              <Field label="负责人" value={item.owner} onChange={v => updateItem(item.id, { owner: v })} />
              <Field label="截止时间" type="date" value={item.dueDate} onChange={v => updateItem(item.id, { dueDate: v })} />
              <Field wide multiline label="执行说明" value={item.description} onChange={v => updateItem(item.id, { description: v })} />
            </div>
            <div className={css.meetingEditSubtasks}>
              <span className={css.meetingEditSubtasksTitle}>子任务</span>
              {item.subtasks.length === 0 && <div className={css.meetingEditSubtasksEmpty}>暂无子任务</div>}
              {item.subtasks.map(subtask => (
                <div key={subtask.id} className={css.meetingEditSubtaskRow}>
                  <input className={css.meetingEditSubtaskTitle} value={subtask.title} onChange={e => updateSubtask(item.id, subtask.id, { title: e.target.value })} placeholder="子任务名称" />
                  <input className={css.meetingEditSubtaskOwner} value={subtask.owner} onChange={e => updateSubtask(item.id, subtask.id, { owner: e.target.value })} placeholder="负责人" />
                  <input className={css.meetingEditSubtaskDue} type="date" value={subtask.dueDate} onChange={e => updateSubtask(item.id, subtask.id, { dueDate: e.target.value })} aria-label="子任务截止时间" />
                  <button type="button" className={css.meetingEditDelete} onClick={() => { deleteSubtask(item.id, subtask.id) }} aria-label={`删除子任务「${subtask.title}」`}>×</button>
                </div>
              ))}
              <button type="button" className={css.meetingEditAddSubtask} onClick={() => { addSubtask(item.id) }}>＋ 添加子任务</button>
            </div>
          </div>
        )
      })}
      <button type="button" className={css.meetingEditAddItem} onClick={addItem}>＋ 新增任务</button>
    </main>
    <footer className={css.actions}><span>{dirty ? '修改将在重新生成方案后生效' : '可在任一任务中调整内容'}</span><div><button type="button" className={css.secondary} onClick={() => { resetDraft(); closeDetails() }}>取消修改</button><button type="button" disabled={!dirty} className={css.primary} onClick={() => { void submitMeetingRevision(items) }}>提交修改并重新生成</button></div></footer>
  </div>
}
