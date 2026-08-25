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

describe('ProjectBrainTurnTail', () => {
  afterEach(() => { cleanup(); vi.useRealTimers() })
  it('offers confirmation and editing as distinct next actions', () => {
    const brain = createProjectBrainStore().create()
    launchProjectScenario(brain, { text: '帮我启动智慧园区建设项目。', files: [] })
    brain.store.update((draft) => { draft.phase = 'plan-ready' })
    const confirmPlan = vi.fn()
    const props = { useProjectBrain: <S,>(selector: (state: ProjectBrainState) => S): S => selector(brain.getSnapshot()), enabled: () => true, openDetails: vi.fn(), confirmPlan } as unknown as ComponentProps<typeof ProjectBrainTurnTail>
    const view = render(<ProjectBrainTurnTail {...props} />)

    fireEvent.click(view.getByRole('button', { name: '确认方案，开始执行' }))
    expect(confirmPlan).toHaveBeenCalledTimes(1)
    expect(view.getByRole('button', { name: '编辑项目方案' })).toBeTruthy()
  })

  it('does not require scrollIntoView for the plan-ready card', () => {
    vi.useFakeTimers()
    const brain = createProjectBrainStore().create()
    launchProjectScenario(brain, { text: '帮我启动智慧园区建设项目。', files: [] })
    brain.store.update((draft) => { draft.phase = 'plan-ready' })
    const scrollIntoView = HTMLElement.prototype.scrollIntoView
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: undefined })
    const props = { useProjectBrain: <S,>(selector: (state: ProjectBrainState) => S): S => selector(brain.getSnapshot()), enabled: () => true, openDetails: vi.fn(), confirmPlan: vi.fn(), markExecuted: vi.fn(), markExecutionFailed: vi.fn() } as unknown as ComponentProps<typeof ProjectBrainTurnTail>
    render(<ProjectBrainTurnTail {...props} />)

    expect(() => { act(() => { vi.advanceTimersByTime(120) }) }).not.toThrow()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
  })

  it('keeps the ready card attached to the execution reply instead of the original plan reply', () => {
    const brain = createProjectBrainStore().create()
    launchProjectScenario(brain, { text: '帮我启动智慧园区建设项目。', files: [] })
    brain.store.update((draft) => { draft.phase = 'executed' })
    const props = { useProjectBrain: <S,>(selector: (state: ProjectBrainState) => S): S => selector(brain.getSnapshot()), enabled: () => true, openDetails: vi.fn(), confirmPlan: vi.fn(), markExecuted: vi.fn(), markExecutionFailed: vi.fn() } as unknown as ComponentProps<typeof ProjectBrainTurnTail>
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
    fireEvent.click(view.getByRole('button', { name: /整理一次项目会议/ }))
    expect(onContinue).toHaveBeenCalledWith('meeting-actions')
    expect(view.getByRole('button', { name: /帮我托管这个项目/ })).toBeTruthy()
  })
})
