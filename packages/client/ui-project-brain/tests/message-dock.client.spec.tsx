// @vitest-environment jsdom
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { createProjectBrainStore } from '../src/client/state.ts'
import type { ProjectBrainState } from '../src/client/state.ts'
import { ProjectBrainMessageDock } from '../src/client/ProjectBrainMessageDock.tsx'

describe('ProjectBrainMessageDock', () => {
  afterEach(() => { cleanup() })

  it('fills and submits the launch prompt through the native composer', async () => {
    const brain = createProjectBrainStore().create()
    const setDraft = vi.fn()
    const submit = vi.fn()
    const props = {
      session: {},
      input: { draft: '' },
      useProjectBrain: <S,>(selector: (state: ProjectBrainState) => S): S => selector(brain.getSnapshot()),
      useInput: <S,>(selector: (state: { readonly draft: string }) => S): S => selector({ draft: '' }),
      inputActions: {
        setDraft,
        addImages: () => true,
        removeImage: () => {},
        pruneImages: () => {},
        submit,
      },
      enabled: () => true,
      openDetails: vi.fn(),
      prepare: vi.fn(),
      useSessions: () => undefined,
    } as unknown as ComponentProps<typeof ProjectBrainMessageDock>
    const view = render(
      <ProjectBrainMessageDock {...props} />,
    )

    fireEvent.click(view.getByRole('button', { name: '帮我启动智慧园区建设项目' }))
    await Promise.resolve()

    expect(setDraft).toHaveBeenCalledWith('帮我启动智慧园区建设项目')
    expect(submit).toHaveBeenCalledTimes(1)
    expect(brain.getSnapshot().phase).toBe('idle')
    expect(brain.getSnapshot().messages).toHaveLength(0)
  })

  it('fills and submits the daily-work prompt through the native composer', async () => {
    const brain = createProjectBrainStore().create()
    const setDraft = vi.fn()
    const submit = vi.fn()
    const props = {
      session: {},
      input: { draft: '' },
      useProjectBrain: <S,>(selector: (state: ProjectBrainState) => S): S => selector(brain.getSnapshot()),
      useInput: <S,>(selector: (state: { readonly draft: string }) => S): S => selector({ draft: '' }),
      inputActions: {
        setDraft,
        addImages: () => true,
        removeImage: () => {},
        pruneImages: () => {},
        submit,
      },
      enabled: () => true,
      openDetails: vi.fn(),
      prepare: vi.fn(),
      useSessions: () => undefined,
    } as unknown as ComponentProps<typeof ProjectBrainMessageDock>
    const view = render(
      <ProjectBrainMessageDock {...props} />,
    )

    fireEvent.click(within(view.container).getByRole('button', { name: '看看我今天该做什么' }))
    await Promise.resolve()

    expect(setDraft).toHaveBeenCalledWith('看看我今天该做什么')
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('shows all five configured scenario shortcuts and submits each prompt', async () => {
    const brain = createProjectBrainStore().create()
    const setDraft = vi.fn()
    const submit = vi.fn()
    const props = {
      session: {},
      input: { draft: '' },
      useProjectBrain: <S,>(selector: (state: ProjectBrainState) => S): S => selector(brain.getSnapshot()),
      useInput: <S,>(selector: (state: { readonly draft: string }) => S): S => selector({ draft: '' }),
      inputActions: {
        setDraft,
        addImages: () => true,
        removeImage: () => {},
        pruneImages: () => {},
        submit,
      },
      enabled: () => true,
      openDetails: vi.fn(),
      prepare: vi.fn(),
      useSessions: () => undefined,
    } as unknown as ComponentProps<typeof ProjectBrainMessageDock>
    const view = render(<ProjectBrainMessageDock {...props} />)
    const prompts = [
      '帮我启动智慧园区建设项目',
      '帮我整理这个项目的会议纪要',
      '智慧园区建设项目现状怎么样？',
      '看看我今天该做什么',
      '下周要给集团领导汇报，帮我准备好',
    ]

    for (const prompt of prompts) {
      fireEvent.click(view.getByRole('button', { name: prompt }))
      await Promise.resolve()
    }

    expect(setDraft).toHaveBeenCalledTimes(prompts.length)
    expect(setDraft.mock.calls.map(call => call[0])).toEqual(prompts)
    expect(submit).toHaveBeenCalledTimes(prompts.length)
  })

  it('does not open the editor automatically after the launch plan is ready', () => {
    const brain = createProjectBrainStore().create()
    brain.store.update((draft) => {
      draft.phase = 'review-ready'
    })
    const openDetails = vi.fn()
    const props = {
      session: {},
      input: { draft: '' },
      useProjectBrain: <S,>(selector: (state: ProjectBrainState) => S): S => selector(brain.getSnapshot()),
      useInput: <S,>(selector: (state: { readonly draft: string }) => S): S => selector({ draft: '' }),
      inputActions: {
        setDraft: vi.fn(),
        addImages: () => true,
        removeImage: () => {},
        pruneImages: () => {},
        submit: () => {},
      },
      enabled: () => true,
      openDetails,
      prepare: vi.fn(),
      useSessions: () => undefined,
    } as unknown as ComponentProps<typeof ProjectBrainMessageDock>

    render(<ProjectBrainMessageDock {...props} />)

    expect(openDetails).not.toHaveBeenCalled()
  })
})
