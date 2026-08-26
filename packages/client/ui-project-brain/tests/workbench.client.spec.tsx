// @vitest-environment jsdom
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ProjectBrainWorkbench } from '../src/client/ProjectBrainWorkbench.tsx'
import { createProjectBrainStore, launchProjectScenario } from '../src/client/state.ts'
import type { ProjectBrainState } from '../src/client/state.ts'

describe('ProjectBrainWorkbench', () => {
  afterEach(() => { cleanup() })
  it('switches through numbered editor navigation without stacking all forms', () => {
    const brain = createProjectBrainStore().create()
    launchProjectScenario(brain, { text: '帮我启动智慧园区建设项目。', files: [] })
    brain.store.update((draft) => { draft.phase = 'plan-ready' })
    const props = {
      useProjectBrain: <S,>(selector: (state: ProjectBrainState) => S): S => selector(brain.getSnapshot()),
      submitRevision: vi.fn(),
      closeDetails: vi.fn(),
    } as unknown as ComponentProps<typeof ProjectBrainWorkbench>
    const view = render(<ProjectBrainWorkbench {...props} />)

    expect(view.getByRole('navigation', { name: '项目方案编辑导航' }).getAttribute('data-orientation')).toBe('horizontal')
    expect(view.getByRole('button', { name: /01.*项目基础信息/u })).toBeTruthy()
    expect(view.queryByText('阶段负责人')).toBeNull()
    fireEvent.click(view.getByRole('button', { name: /02.*阶段规划/u }))
    expect(view.getByText('阶段负责人')).toBeTruthy()
    expect(view.getAllByRole('button', { name: /项目启动阶段/u })).toHaveLength(1)
    expect(view.queryByText('风险等级')).toBeNull()
  })

  it('uses standard navigation icons and opens a calendar from project date fields', () => {
    const brain = createProjectBrainStore().create()
    launchProjectScenario(brain, { text: '帮我启动智慧园区建设项目。', files: [] })
    brain.store.update((draft) => { draft.phase = 'plan-ready' })
    const props = {
      useProjectBrain: <S,>(selector: (state: ProjectBrainState) => S): S => selector(brain.getSnapshot()),
      submitRevision: vi.fn(),
      closeDetails: vi.fn(),
    } as unknown as ComponentProps<typeof ProjectBrainWorkbench>
    const view = render(<ProjectBrainWorkbench {...props} />)

    expect(view.getByTestId('project-brain-nav-icon-project').querySelector('svg')).toBeTruthy()
    expect(view.getByTestId('project-brain-nav-icon-stages').querySelector('svg')).toBeTruthy()
    expect(view.getByRole('button', { name: '选择项目开始日期' })).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: '选择项目开始日期' }))
    expect(view.getByRole('dialog', { name: '选择日期' })).toBeTruthy()
    const day = view.getAllByRole('button').find(button => button.textContent === '15')
    expect(day).toBeTruthy()
    fireEvent.click(day!)
    expect(view.getByRole('button', { name: '选择项目开始日期' }).textContent).toContain('2026/09/15')
  })
})
