// @vitest-environment jsdom
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { ProjectBrainTurnTail } from '../src/client/ProjectBrainTurnTail.tsx'
import { ProjectReadyCard } from '../src/client/ProjectBrainMessageDock.tsx'
import { createProjectBrainStore, launchProjectScenario } from '../src/client/state.ts'
import type { ProjectBrainState } from '../src/client/state.ts'
import { PROJECT_BRAIN_PLAN } from '../src/project-data.ts'
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
    expect(view.getByRole('button', { name: /帮我托管这个项目/ })).toBeTruthy()
  })

  it('renders an allow-listed interactive surface beneath its owning turn', () => {
    const brain = createProjectBrainStore().create()
    const data = { date: '2026 年 8 月 26 日', owner: '张明', focusMinutes: 60, tasks: [{ id: 't1', title: '处理紧急任务', project: '智慧园区建设项目', due: '10:30 前', priority: '紧急', reason: '阻塞关键路径' }] }
    const turn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `<!-- project-brain:surface ${projectBrainSurfacePayload('my-day', 'my-day-workbench', data)} -->` }] }]]) }] }
    const props = tailProps(brain)
    const view = render(<ProjectBrainTurnTail {...props} turn={turn as never} />)
    expect(view.getByRole('region', { name: '今日工作台' })).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: /标记完成：处理紧急任务/u }))
    expect(view.getByText('100%')).toBeTruthy()
  })

  it('renders the project-copilot dashboard surface with local permission switching', () => {
    const brain = createProjectBrainStore().create()
    const data = {
      projectName: PROJECT_BRAIN_PLAN.project.name,
      progress: PROJECT_BRAIN_PLAN.project.progress,
      permissionMode: '辅助执行模式',
      trackingItems: [{ id: 'track-1', title: '设备采购交付', owner: '王刚', status: '高风险', description: '第二批设备交付预计延期 2 周。' }],
      discoveries: { highRisks: 1, abnormalTasks: 2, dueSoon: 4, coordination: 3 },
      decisions: [{ id: 'decision-1', title: '是否启用备选供应商', reason: '影响系统集成测试窗口。', owner: '张明', due: '今天 16:00 前' }],
      nextPlan: ['16:00 跟进备选供应商报价', '明早汇总延期影响'],
    }
    const turn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `<!-- project-brain:surface ${projectBrainSurfacePayload('project-copilot', 'project-copilot-dashboard', data)} -->` }] }]]) }] }
    const props = tailProps(brain)
    const view = render(<ProjectBrainTurnTail {...props} turn={turn as never} />)

    expect(view.getByRole('region', { name: '项目托管看板' })).toBeTruthy()
    expect(view.getByText(/AI 正在跟进/u)).toBeTruthy()
    expect(view.getByText('设备采购交付')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: '托管模式' }))
    expect(view.getByText('当前权限：托管模式')).toBeTruthy()
  })

  it('renders the enriched daily workbench with explanations and local completion', () => {
    const brain = createProjectBrainStore().create()
    const data = {
      date: '2026 年 8 月 26 日',
      owner: '张明',
      role: '项目负责人',
      focusMinutes: 330,
      summary: { urgent: 2, today: 2, meetings: 1, waiting: 1 },
      tasks: [
        { id: 'today-1', title: '确认安防摄像头备选供应商', project: PROJECT_BRAIN_PLAN.project.name, due: '10:30 前', priority: '紧急', group: '紧急处理', reason: '采购延期已影响系统集成关键路径', detail: '排在第一是因为它会直接影响系统集成测试窗口。', primaryAction: '打开任务' },
        { id: 'today-2', title: '参加供应商协调会', project: PROJECT_BRAIN_PLAN.project.name, due: '14:00', priority: '会议', group: '会议', reason: '需要确认备选供应商交付承诺', detail: '会议结论会影响采购风险处置措施。', primaryAction: '查看会议' },
      ],
      waiting: [{ id: 'wait-1', title: '甲方确认能耗模块变更范围', owner: '甲方项目办', since: '2 天前' }],
    }
    const turn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `<!-- project-brain:surface ${projectBrainSurfacePayload('my-day', 'my-day-workbench', data)} -->` }] }]]) }] }
    const props = tailProps(brain)
    const view = render(<ProjectBrainTurnTail {...props} turn={turn as never} />)

    expect(view.getByRole('region', { name: '今日工作台' })).toBeTruthy()
    expect(view.getByText('今日会议')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: /为什么排这里：确认安防摄像头备选供应商/u }))
    expect(view.getByText(/排在第一/u)).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: /标记完成：确认安防摄像头备选供应商/u }))
    expect(view.getByText('50%')).toBeTruthy()
  })

  it('shows executive briefing confirmation and receipt cards under the owning turn', () => {
    const brain = createProjectBrainStore().create()
    const confirmBriefing = vi.fn()
    const reviewTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: `# 项目汇报\n\n<!-- project-brain:executive-briefing -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', { projectId: PROJECT_BRAIN_PLAN.project.id })} -->` }] }]]) }] }
    const receiptTurn = { steps: [{ data: new Map([['assistant-step', { blocks: [{ kind: 'text', text: '<!-- project-brain:executive-briefing-ready -->' }] }]]) }] }
    const props = tailProps(brain, { confirmBriefing })

    const review = render(<ProjectBrainTurnTail {...props} turn={reviewTurn as never} />)
    fireEvent.click(review.getByRole('button', { name: '确认生成汇报包' }))
    expect(confirmBriefing).toHaveBeenCalledTimes(1)

    const receipt = render(<ProjectBrainTurnTail {...props} turn={receiptTurn as never} />)
    expect(receipt.getByRole('region', { name: '汇报包已生成' })).toBeTruthy()
    expect(receipt.getByText('集团领导汇报_项目进展.docx')).toBeTruthy()
    expect(receipt.getByText('集团领导汇报_PPT提纲.pptx')).toBeTruthy()
    expect(receipt.getByText('集团领导汇报_风险与协调事项.xlsx')).toBeTruthy()
    expect(receipt.getByText('集团领导汇报_口头稿.md')).toBeTruthy()
    expect(receipt.getByRole('link', { name: '下载 集团领导汇报_项目进展.docx' })).toBeTruthy()
    expect(receipt.getByRole('link', { name: '下载 集团领导汇报_PPT提纲.pptx' })).toBeTruthy()
    expect(receipt.getByRole('link', { name: '下载 集团领导汇报_风险与协调事项.xlsx' })).toBeTruthy()
    expect(receipt.getByRole('link', { name: '下载 集团领导汇报_口头稿.md' })).toBeTruthy()
    expect(receipt.getByText('演示数据 · 仅用于界面演示')).toBeTruthy()
  })
})
