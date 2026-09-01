// @vitest-environment jsdom
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { ProjectBrainTurnTail } from '../src/client/ProjectBrainTurnTail.tsx'
import { ProjectBrainScenarioSurface } from '../src/client/ProjectBrainScenarioSurface.tsx'
import { ProjectReadyCard } from '../src/client/ProjectBrainMessageDock.tsx'
import { createProjectBrainStore, launchMeetingScenario, launchProjectScenario, markMeetingPlanReady as applyMeetingPlanReady, markProjectPlanReady as applyProjectPlanReady, restoreMeetingPlan as applyRestoreMeetingPlan } from '../src/client/state.ts'
import type { ProjectBrainState } from '../src/client/state.ts'
import { PROJECT_BRAIN_COPILOT_DEMO, PROJECT_BRAIN_PLAN } from '../src/project-data.ts'
import { PROJECT_BRAIN_PLATFORM_TARGET, isProjectBrainPlatformUrl } from '../src/client/platform-window.ts'
import { projectBrainScenarioPayload, projectBrainSurfacePayload } from '../src/scenario-registry.ts'

describe('ProjectBrainTurnTail', () => {
  afterEach(() => { cleanup(); vi.useRealTimers() })
  const tailProps = (
    brain: { getSnapshot(): ProjectBrainState },
    extra: Record<string, unknown> = {},
  ): ComponentProps<typeof ProjectBrainTurnTail> => ({
    useProjectBrain: (selector: (state: ProjectBrainState) => unknown) => selector(brain.getSnapshot()),
    enabled: () => true,
    ...extra,
  }) as unknown as ComponentProps<typeof ProjectBrainTurnTail>

  it('offers confirmation and editing as distinct next actions', () => {
    const brain = createProjectBrainStore().create()
    launchProjectScenario(brain, { text: '帮我启动智慧园区建设项目。', files: [] })
    brain.store.update((draft) => { draft.phase = 'review-ready' })
    const confirmPlan = vi.fn()
    const props = tailProps(brain, { openDetails: vi.fn(), confirmPlan })
    const view = render(<ProjectBrainTurnTail {...props} />)
    fireEvent.click(view.getByRole('button', { name: '确认方案，开始执行' }))
    expect(confirmPlan).toHaveBeenCalledTimes(1)
    expect(view.getByRole('button', { name: '编辑项目方案' })).toBeTruthy()
  })

  it('marks the launch analysis ready as soon as its reply turn mounts, with no submit-time timer', () => {
    const brain = createProjectBrainStore().create()
    launchProjectScenario(brain, { text: '帮我启动智慧园区建设项目。', files: [] })
    expect(brain.getSnapshot().phase).toBe('analyzing')
    const planTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: '已识别到一个正在推进的园区建设项目。\n\n<!-- project-brain:launch-plan -->\n# 项目导入与初始化方案：智慧园区建设项目' }] }]]) }] }
    const props = tailProps(brain, {
      openDetails: vi.fn(),
      confirmPlan: vi.fn(),
      markPlanReady: () => applyProjectPlanReady(brain),
      markExecuted: vi.fn(),
      markExecutionFailed: vi.fn(),
    })

    const view = render(<ProjectBrainTurnTail {...props} turn={planTurn as never} />)
    expect(brain.getSnapshot().phase).toBe('review-ready')
    // The fixture store hook is not reactive, so one rerender reflects the flipped phase.
    view.rerender(<ProjectBrainTurnTail {...props} turn={planTurn as never} />)
    expect(view.getByRole('button', { name: '确认方案，开始执行' })).toBeTruthy()
  })

  it('does not let a meeting restore turn rip an active launch scenario back to meeting', () => {
    const brain = createProjectBrainStore().create()
    launchMeetingScenario(brain)
    brain.store.update((draft) => { draft.phase = 'review-ready' })
    // A meeting turn mounted in history keeps meetingPlanTurn true for its own turn tail.
    const meetingTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: '<!-- project-brain:meeting-plan -->' }] }]]) }] }
    const extras = {
      markPlanReady: () => applyProjectPlanReady(brain),
      markMeetingPlanReady: () => applyMeetingPlanReady(brain),
      restoreMeetingPlan: (items: Parameters<typeof applyRestoreMeetingPlan>[1]) => applyRestoreMeetingPlan(brain, items),
      restorePlan: vi.fn(),
      confirmPlan: vi.fn(),
      confirmMeetingPlan: vi.fn(),
      markExecuted: vi.fn(),
      markExecutionFailed: vi.fn(),
      markMeetingExecuted: vi.fn(),
      retryPlatformData: vi.fn(),
      continueProjectAction: vi.fn(),
      openDetails: vi.fn(),
      confirmBriefing: vi.fn(),
    }
    const view = render(<ProjectBrainTurnTail {...tailProps(brain, extras)} turn={meetingTurn as never} />)
    // A later launch takes the scenario over.
    act(() => { launchProjectScenario(brain, { text: '帮我启动智慧园区建设项目。', files: [] }) })
    // Re-render so the meeting restore effect observes the switched scenario; it must not hijack it.
    view.rerender(<ProjectBrainTurnTail {...tailProps(brain, extras)} turn={meetingTurn as never} />)
    expect(brain.getSnapshot().activeScenario).toBe('project-launch')
  })

  it('marks the meeting analysis ready on mount so the breakdown card shows right after the reply', () => {
    const brain = createProjectBrainStore().create()
    launchMeetingScenario(brain)
    expect(brain.getSnapshot().phase).toBe('analyzing')
    const meetingTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: '<!-- project-brain:meeting-analysis -->\n## 会议纪要分析报告\n\n<!-- project-brain:meeting-plan -->\n### 行动事项识别结果' }] }]]) }] }
    const props = tailProps(brain, {
      openDetails: vi.fn(),
      confirmMeetingPlan: vi.fn(),
      markPlanReady: vi.fn(),
      markMeetingPlanReady: () => applyMeetingPlanReady(brain),
      markExecuted: vi.fn(),
      markExecutionFailed: vi.fn(),
    })

    const view = render(<ProjectBrainTurnTail {...props} turn={meetingTurn as never} />)
    expect(brain.getSnapshot().phase).toBe('review-ready')
    view.rerender(<ProjectBrainTurnTail {...props} turn={meetingTurn as never} />)
    expect(view.getByRole('region', { name: '会议任务拆解' })).toBeTruthy()
  })

  it('does not require scrollIntoView for the plan-ready card', () => {
    vi.useFakeTimers()
    const brain = createProjectBrainStore().create()
    launchProjectScenario(brain, { text: '帮我启动智慧园区建设项目。', files: [] })
    brain.store.update((draft) => { draft.phase = 'review-ready' })
    const scrollIntoView = HTMLElement.prototype.scrollIntoView
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: undefined })
    const props = tailProps(brain, { openDetails: vi.fn(), confirmPlan: vi.fn(), markExecuted: vi.fn(), markExecutionFailed: vi.fn() })
    render(<ProjectBrainTurnTail {...props} />)

    expect(() => { act(() => { vi.advanceTimersByTime(120) }) }).not.toThrow()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
  })

  it('keeps the ready card attached to the execution reply instead of the original plan reply', () => {
    const brain = createProjectBrainStore().create()
    launchProjectScenario(brain, { text: '帮我启动智慧园区建设项目。', files: [] })
    brain.store.update((draft) => { draft.phase = 'completed' })
    const props = tailProps(brain, { openDetails: vi.fn(), confirmPlan: vi.fn(), markExecuted: vi.fn(), markExecutionFailed: vi.fn() })
    const planTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: '项目导入与初始化方案：智慧园区建设项目' }] }]]) }] }
    const executionTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: '收到，开始按当前方案完成项目初始化。<!-- project-brain:platform-ready -->' }] }]]) }] }

    const planView = render(<ProjectBrainTurnTail {...props} turn={planTurn as never} />)
    expect(planView.queryByRole('region', { name: '项目已准备好' })).toBeNull()

    const executionView = render(<ProjectBrainTurnTail {...props} turn={executionTurn as never} />)
    expect(executionView.getByRole('region', { name: '项目已准备好' })).toBeTruthy()
  })

  it('links the ready card to the project-brain platform', () => {
    const view = render(<ProjectReadyCard plan={{ ...PROJECT_BRAIN_PLAN, documents: [] }} />)
    const link = view.getByRole('link', { name: /进入项目智脑/ })
    expect(link.getAttribute('href')).toBe('https://7koxhpk4.ipyingshe.net:54928/business-xmzn/#/projectAdmin')
    expect(link.getAttribute('target')).toBe(PROJECT_BRAIN_PLATFORM_TARGET)
    expect(link.getAttribute('rel')).toBeNull()
  })

  it('recognizes platform pages regardless of hash sub-route or query parameters', () => {
    expect(isProjectBrainPlatformUrl('https://7koxhpk4.ipyingshe.net:54928/business-xmzn/#/projectAdmin?projectId=-1')).toBe(true)
    expect(isProjectBrainPlatformUrl('https://7koxhpk4.ipyingshe.net:54928/business-xmzn/?source=agent#/taskBoard')).toBe(true)
    expect(isProjectBrainPlatformUrl('https://7koxhpk4.ipyingshe.net:54928/other-app/#/projectAdmin')).toBe(false)
  })

  it('presents the follow-up scenarios as keyboard-accessible actions', () => {
    const onContinue = vi.fn()
    const view = render(<ProjectReadyCard plan={{ ...PROJECT_BRAIN_PLAN, documents: [] }} onContinue={onContinue} />)
    fireEvent.click(view.getByRole('button', { name: /帮我整理项目会议/ }))
    expect(onContinue).toHaveBeenCalledWith('meeting-actions')
    expect(view.getByRole('button', { name: /智慧园区建设项目现状怎么样/ })).toBeTruthy()
  })

  it('renders an allow-listed interactive surface beneath its owning turn', () => {
    const brain = createProjectBrainStore().create()
    const data = {
      date: '2026 年 8 月 26 日', owner: '张明', role: '项目负责人',
      headline: '今天先处理这 6 件事', subtitle: '已结合截止时间、项目风险、任务依赖和协作等待情况自动排序',
      summary: { priority: 1, today: 1, meetings: 0, waiting: 0, projects: 2 },
      groups: [{ id: 'priority', title: '优先处理', tone: 'risk', tasks: [
        { id: 't1', title: '处理紧急任务', tags: ['紧急', '关键路径'], project: '智慧园区建设项目', due: '今天到期', reason: '阻塞关键路径', detail: ['它在关键路径上。'], primaryAction: '打开任务' },
        { id: 't2', title: '跟进后续事项', tags: ['紧急'], project: '智慧园区建设项目', due: '今天到期', reason: '承接第一项的结果', detail: ['紧跟第一项推进。'], primaryAction: '催办协同' },
      ] }],
      deferred: [], doneToday: [], reorderNoticeTemplate: '已处理。剩余事项已经重新排序，「{title}」现在是你最需要优先处理的事项。',
    }
    const turn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `<!-- project-brain:surface ${projectBrainSurfacePayload('my-day', 'my-day-workbench', data)} -->` }] }]]) }] }
    const props = tailProps(brain)
    const view = render(<ProjectBrainTurnTail {...props} turn={turn as never} />)
    expect(view.getByRole('region', { name: '今日工作台' })).toBeTruthy()
    expect(view.getByText('今天先处理这 6 件事')).toBeTruthy()
    expect(view.getByText('①')).toBeTruthy()
    fireEvent.click(view.getAllByRole('button', { name: '标记完成' })[0]!)
    // 完成后任务移入今天已处理，看板出现重排提示
    expect(view.getByText(/已处理。剩余事项已经重新排序/u)).toBeTruthy()
    expect(view.getByText('今天已处理 · 1')).toBeTruthy()
    // 完成后该任务卡（含打开任务动作）从分组消失，仅剩承接项
    expect(view.queryByRole('button', { name: /打开任务/ })).toBeNull()
    expect(view.getByText('跟进后续事项')).toBeTruthy()
  })

  it('does not duplicate a malformed copilot board in the turn tail', () => {
    const brain = createProjectBrainStore().create()
    const data = { /* shape built in the surface spec below */ }
    const turn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `<!-- project-brain:surface ${projectBrainSurfacePayload('project-copilot', 'project-copilot-dashboard', data)} -->` }] }]]) }] }
    const props = tailProps(brain)
    const view = render(<ProjectBrainTurnTail {...props} turn={turn as never} />)
    // The board inlines above the prose via the assistantSurface service. A
    // malformed board does not create an orphan decision card below the turn.
    expect(view.container.textContent).toBe('')
  })

  it('submits one of two supplier-risk decisions beneath its owning copilot reply', () => {
    const brain = createProjectBrainStore().create()
    const submitCopilotDecision = vi.fn()
    const turn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `<!-- project-brain:surface ${projectBrainSurfacePayload('project-copilot', 'project-copilot-dashboard', PROJECT_BRAIN_COPILOT_DEMO)} -->` }] }]]) }] }

    const view = render(<ProjectBrainTurnTail {...tailProps(brain, { submitCopilotDecision })} turn={turn as never} />)

    expect(view.getByRole('region', { name: '设备采购是否升级处理？' })).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: '明日未确认则启动' }))
    expect(submitCopilotDecision).toHaveBeenCalledWith('decision-1', 'wait-for-confirmation')
    expect(view.getByText('正在提交决策…')).toBeTruthy()
    expect((view.getByRole('button', { name: '立即启动备选方案' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('restores the selected supplier-risk result only under its assistant receipt', () => {
    const brain = createProjectBrainStore().create()
    const conditionalTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `<!-- project-brain:copilot-decision-result -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('project-copilot', 'confirm', { decisionId: 'decision-1', selection: 'wait-for-confirmation' })} -->` }] }]]) }] }
    const immediateTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `<!-- project-brain:copilot-decision-result -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('project-copilot', 'confirm', { decisionId: 'decision-1', selection: 'start-backup-supplier' })} -->` }] }]]) }] }

    const conditional = render(<ProjectBrainTurnTail {...tailProps(brain)} turn={conditionalTurn as never} />)
    expect(conditional.getByRole('region', { name: '条件预案已生效' })).toBeTruthy()
    expect(conditional.getByText('下一次检查：明日 10:00')).toBeTruthy()

    const immediate = render(<ProjectBrainTurnTail {...tailProps(brain)} turn={immediateTurn as never} />)
    expect(immediate.getByRole('region', { name: '备选供应商评估已启动' })).toBeTruthy()
    expect(immediate.getByText(/负责人：王刚/u)).toBeTruthy()
  })

  it('renders the copilot board surface with decisions and no permission switcher', () => {
    const data = {
      projectName: PROJECT_BRAIN_PLAN.project.name,
      progress: PROJECT_BRAIN_PLAN.project.progress,
      permissionMode: '辅助执行模式',
      agentStatus: { scope: '已检查 28 项任务 / 5 项风险 / 4 条会议待办', lastCheckAt: '刚刚完成项目检查', nextCheckAt: '下次自动检查 16:00' },
      metrics: [
        { id: 'progress', label: '项目进度', value: '45%', hint: '综合进度', tone: 'blue' },
        { id: 'tracking', label: 'AI 跟进中', value: '3', hint: '2 项等待反馈', tone: 'green' },
        { id: 'risks', label: '风险事项', value: '5', hint: '1 项高风险', tone: 'risk' },
        { id: 'decisions', label: '需要你确认', value: '1', hint: '涉及采购方案', tone: 'warn' },
      ],
      tracking: [{ id: 'track-1', title: '设备采购交付', status: '高风险 · 等待供应商反馈', aiActions: ['AI 已催办：2 次'], latestFeedback: '供应商预计 8 月 28 日确认发货', nextStep: '明日上午再次确认交付时间' }],
      findings: [{ id: 'find-1', label: '1 项高风险' }, { id: 'find-2', label: '2 项延期任务' }],
      findingsNote: '采购风险等级由中风险上升为高风险。',
      decisions: [{ id: 'decision-1', title: '设备采购是否升级处理？', context: '供应商仍未确认最终交期。', advice: '若明日仍无法确认交期，启动备选供应商。', options: [{ selection: 'wait-for-confirmation', label: '明日未确认则启动' }, { selection: 'start-backup-supplier', label: '立即启动备选方案' }] }],
      aiNarrative: { focus: ['设备采购延期影响设备安装节点。'], executed: ['已连续 2 次跟进设备采购负责人。'], needDecision: '若明天仍无法确认交期，建议启动备选供应商。', next: '明日上午再次确认交期。' },
      overview: {
        packages: [{ id: 'pkg-1', name: '设备采购包', done: 0, total: 3, status: '滞后' }],
        taskStates: [{ label: '滞后', count: 1 }],
        riskLevels: [{ level: '高风险', count: 1 }],
        attention: [{ id: 'att-1', title: '确定备选供应商方案', owner: '王刚', delay: '延期 3 天', aiNote: 'AI 已催办 2 次' }],
      },
      nextPlan: ['明日上午再次确认设备采购交期'],
    }
    const surface = { version: 1, scenarioId: 'project-copilot', template: 'project-copilot-dashboard', data } as const
    const view = render(<ProjectBrainScenarioSurface surface={surface} />)
    expect(view.getByRole('region', { name: '项目托管看板' })).toBeTruthy()
    expect(view.getByRole('region', { name: '需要你处理' })).toBeTruthy()
    // 托管权限模式切换器已移除
    expect(view.queryByRole('button', { name: '托管模式' })).toBeNull()
    expect(view.queryByRole('button', { name: '采用建议' })).toBeNull()
    expect(view.queryByRole('button', { name: '查看影响' })).toBeNull()
    expect(view.getByText('请在下方选择处理方式。')).toBeTruthy()
  })

  it('renders the enriched daily workbench with explanations and local completion', () => {
    const brain = createProjectBrainStore().create()
    const data = {
      date: '2026 年 8 月 26 日',
      owner: '张明',
      role: '项目负责人',
      headline: '今天先处理这 6 件事',
      subtitle: '已结合截止时间、项目风险、任务依赖和协作等待情况自动排序',
      summary: { priority: 2, today: 1, meetings: 0, waiting: 0, projects: 3 },
      groups: [
        { id: 'priority', title: '优先处理', tone: 'risk', tasks: [
          { id: 'today-1', title: '确认安防摄像头备选供应商', tags: ['紧急', '关键路径'], project: PROJECT_BRAIN_PLAN.project.name, due: '今天到期', reason: '采购延期已影响系统集成关键路径', detail: ['这项任务排在第一，主要有 3 个原因：', '· 采购延期已经影响项目关键路径。'], primaryAction: '打开任务' },
          { id: 'today-2', title: '推动最小测试环境今日可用', tags: ['紧急'], project: '数据中心迁移项目', due: '今天到期', reason: '正在阻塞后续测试任务', detail: ['两件事都紧急，但它阻塞面更集中。'], primaryAction: '催办协同' },
        ] },
        { id: 'today', title: '今天完成', tone: 'blue', tasks: [
          { id: 'today-3', title: '审阅设备选型方案终稿', tags: ['会议前置'], project: PROJECT_BRAIN_PLAN.project.name, due: '今天完成', reason: '评审会的重要依据', detail: ['属于会议前置材料。'], primaryAction: '查看资料' },
        ] },
      ],
      deferred: [{ id: 'deferred-1', title: '整理供应商历史资料', project: PROJECT_BRAIN_PLAN.project.name, reason: '不会影响今天的关键节点' }],
      doneToday: [{ id: 'done-1', title: '回复测试账号权限申请' }],
      reorderNoticeTemplate: '已处理。剩余事项已经重新排序，「{title}」现在是你最需要优先处理的事项。',
    }
    const turn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `<!-- project-brain:surface ${projectBrainSurfacePayload('my-day', 'my-day-workbench', data)} -->` }] }]]) }] }
    const props = tailProps(brain)
    const view = render(<ProjectBrainTurnTail {...props} turn={turn as never} />)

    expect(view.getByRole('region', { name: '今日工作台' })).toBeTruthy()
    expect(view.getByText('可以暂时放一放')).toBeTruthy()
    expect(view.getByText('今天已处理 · 1')).toBeTruthy()
    expect(view.getByText('①')).toBeTruthy()
    expect(view.getByText('②')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: /为什么排这里：确认安防摄像头备选供应商/u }))
    expect(view.getByText(/这项任务排在第一/u)).toBeTruthy()
    // 标记第一项完成后：任务移入已处理、提示剩余事项重排且第二项成为当前第一
    fireEvent.click(view.getAllByRole('button', { name: '标记完成' })[0]!)
    expect(view.getByText(/「推动最小测试环境今日可用」现在是你最需要优先处理的事项/u)).toBeTruthy()
    expect(view.getByText('今天已处理 · 2')).toBeTruthy()
  })

  it('shows the briefing material picker and a selected-materials receipt under the owning turn', () => {
    const brain = createProjectBrainStore().create()
    const confirmBriefing = vi.fn()
    const reviewTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `# 项目汇报\n\n<!-- project-brain:executive-briefing -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', { projectId: PROJECT_BRAIN_PLAN.project.id })} -->` }] }]]) }] }
    const receiptTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `<!-- project-brain:executive-briefing-ready -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', { projectId: PROJECT_BRAIN_PLAN.project.id, materials: ['集团领导汇报_风险与协调事项.xlsx'] })} -->` }] }]]) }] }
    const props = tailProps(brain, { confirmBriefing })

    const review = render(<ProjectBrainTurnTail {...props} turn={reviewTurn as never} />)
    expect(review.getByRole('region', { name: '选择汇报材料' })).toBeTruthy()
    expect(review.getAllByRole('checkbox')).toHaveLength(3)
    expect((review.getByRole('checkbox', { name: '口头稿 Markdown' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(review.getByRole('checkbox', { name: 'PPT提纲 PPT' }))
    fireEvent.click(review.getByRole('button', { name: '生成所选材料' }))
    expect(confirmBriefing).toHaveBeenCalledWith(['集团领导汇报_口头稿.md', '集团领导汇报_风险与协调事项.xlsx'])

    const receipt = render(<ProjectBrainTurnTail {...props} turn={receiptTurn as never} />)
    expect(receipt.getByRole('region', { name: '所选材料已生成' })).toBeTruthy()
    expect(receipt.getByText('集团领导汇报_风险与协调事项.xlsx')).toBeTruthy()
    expect(receipt.queryByText('集团领导汇报_PPT提纲.pptx')).toBeNull()
    expect(receipt.getByRole('link', { name: '下载 集团领导汇报_风险与协调事项.xlsx' })).toBeTruthy()
    expect(receipt.getByRole('button', { name: '一键全部下载' })).toBeTruthy()
  })
})
