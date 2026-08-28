// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { DeveloperModeGate } from '../src/client/DeveloperModeGate.tsx'
import { disableProjectBrainDevMode } from '../src/client/platform-config.ts'

afterEach(() => {
  cleanup()
  disableProjectBrainDevMode()
  delete (window as unknown as { dshDesktop?: unknown }).dshDesktop
})

describe('DeveloperModeGate', () => {
  it('cancels the inline password form with Escape', () => {
    ;(window as unknown as { dshDesktop?: unknown }).dshDesktop = { developerMode: { unlock: vi.fn() } }
    const view = render(<DeveloperModeGate openSection={vi.fn()} activeSectionId="project-brain-platform" />)
    fireEvent.click(view.getByRole('button', { name: '开发者模式' }))
    fireEvent.keyDown(view.getByLabelText('开发者模式密码'), { key: 'Escape' })
    expect(view.queryByLabelText('开发者模式密码')).toBeNull()
  })

  it('unlocks through the desktop bridge and opens the developer settings page', async () => {
    const unlock = vi.fn(async (password: string) => password === 'correct')
    ;(window as unknown as { dshDesktop?: unknown }).dshDesktop = { developerMode: { unlock } }
    const openSection = vi.fn()
    const view = render(<DeveloperModeGate openSection={openSection} activeSectionId="project-brain-platform" />)

    fireEvent.click(view.getByRole('button', { name: '开发者模式' }))
    fireEvent.change(view.getByLabelText('开发者模式密码'), { target: { value: 'wrong' } })
    await act(async () => { fireEvent.keyDown(view.getByLabelText('开发者模式密码'), { key: 'Enter' }) })
    expect(view.getByText('密码错误，请重试')).toBeTruthy()

    fireEvent.change(view.getByLabelText('开发者模式密码'), { target: { value: 'correct' } })
    await act(async () => { fireEvent.keyDown(view.getByLabelText('开发者模式密码'), { key: 'Enter' }) })
    expect(unlock).toHaveBeenLastCalledWith('correct')
    expect(openSection).toHaveBeenCalledWith('project-brain-platform')

    rerenderAfterUnlock(view)
  })

  it('requires a new password after the settings access is unmounted', async () => {
    const unlock = vi.fn(async () => true)
    ;(window as unknown as { dshDesktop?: unknown }).dshDesktop = { developerMode: { unlock } }
    const first = render(<DeveloperModeGate openSection={vi.fn()} activeSectionId="project-brain-platform" />)
    fireEvent.click(first.getByRole('button', { name: '开发者模式' }))
    fireEvent.change(first.getByLabelText('开发者模式密码'), { target: { value: 'one-time' } })
    await act(async () => { fireEvent.keyDown(first.getByLabelText('开发者模式密码'), { key: 'Enter' }) })
    expect(first.queryByRole('button', { name: '开发者模式' })).toBeNull()

    first.unmount()
    const second = render(<DeveloperModeGate openSection={vi.fn()} activeSectionId="project-brain-platform" />)
    expect(second.getByRole('button', { name: '开发者模式' })).toBeTruthy()
    expect(second.queryByLabelText('开发者模式密码')).toBeNull()
  })

})

function rerenderAfterUnlock(view: ReturnType<typeof render>): void {
  view.rerender(<DeveloperModeGate openSection={vi.fn()} activeSectionId="other" />)
  expect(view.getByRole('button', { name: '开发者模式' })).toBeTruthy()
}
