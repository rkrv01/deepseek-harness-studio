// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import { PlatformSettingsSection } from '../src/client/PlatformSettingsSection.tsx'
import {
  DEFAULT_DEMO_API_BASE_URL,
  DEFAULT_PLATFORM_BASE_URL,
  disableProjectBrainDevMode,
  enableProjectBrainDevMode,
  isProjectBrainDevMode,
} from '../src/client/platform-config.ts'

afterEach(() => {
  cleanup()
  disableProjectBrainDevMode()
})

interface ScopeValue {
  readonly platformBaseUrl?: string
  readonly demoApiBaseUrl?: string
  readonly fixedWorkspace?: boolean
}

function stubScope(value?: ScopeValue): SettingsScope<ScopeValue | undefined> {
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => ({ status: value === undefined ? ('unavailable' as const) : ('ready' as const), value, base: undefined, user: undefined, revision: undefined, writable: true, mode: 'host' as const }),
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    set: vi.fn((field, next) => { value = { ...value, [field]: next }; for (const l of listeners) l(); return Promise.resolve() }),
    unset: vi.fn(() => Promise.resolve()),
  }
}

describe('PlatformSettingsSection', () => {
  it('dev mode is temporary: hidden until the console command, and no close button exists', () => {
    const view = render(<PlatformSettingsSection scope={stubScope({ platformBaseUrl: 'https://example.test' })} />)
    expect(view.queryByLabelText('智脑平台地址')).toBeNull()
    expect(view.queryByRole('button', { name: '关闭开发者模式' })).toBeNull()

    act(() => { enableProjectBrainDevMode() })
    expect(isProjectBrainDevMode()).toBe(true)
    expect(view.getByLabelText('智脑平台地址')).toBeTruthy()
    // 临时模式的天然终点是刷新/重开，不提供关闭按钮
    expect(view.queryByRole('button', { name: '关闭开发者模式' })).toBeNull()
  })

  it('renders both configured addresses and writes edits through the scope', () => {
    act(() => { enableProjectBrainDevMode() })
    const scope = stubScope({ platformBaseUrl: 'https://example.test', demoApiBaseUrl: 'https://api.example.test/demo-control' })
    const view = render(<PlatformSettingsSection scope={scope} />)
    expect((view.getByLabelText('智脑平台地址') as HTMLInputElement).value).toBe('https://example.test')
    expect((view.getByLabelText('接口地址') as HTMLInputElement).value).toBe('https://api.example.test/demo-control')

    fireEvent.change(view.getByLabelText('智脑平台地址'), { target: { value: 'https://new.demo.test' } })
    fireEvent.blur(view.getByLabelText('智脑平台地址'))
    expect(scope.set).toHaveBeenCalledWith('platformBaseUrl', 'https://new.demo.test')

    fireEvent.change(view.getByLabelText('接口地址'), { target: { value: 'https://new.api.test/demo-control' } })
    fireEvent.keyDown(view.getByLabelText('接口地址'), { key: 'Enter' })
    expect(scope.set).toHaveBeenCalledWith('demoApiBaseUrl', 'https://new.api.test/demo-control')
  })

  it('falls back to defaults on empty edits and mirrors the fixed-workspace toggle', () => {
    act(() => { enableProjectBrainDevMode() })
    const scope = stubScope()
    const view = render(<PlatformSettingsSection scope={scope} />)
    expect((view.getByLabelText('智脑平台地址') as HTMLInputElement).value).toBe(DEFAULT_PLATFORM_BASE_URL)
    expect((view.getByLabelText('接口地址') as HTMLInputElement).value).toBe(DEFAULT_DEMO_API_BASE_URL)

    fireEvent.change(view.getByLabelText('接口地址'), { target: { value: '   ' } })
    fireEvent.blur(view.getByLabelText('接口地址'))
    expect(scope.set).toHaveBeenCalledWith('demoApiBaseUrl', DEFAULT_DEMO_API_BASE_URL)

    fireEvent.click(view.getByLabelText('固定唯一工作区'))
    expect(scope.set).toHaveBeenCalledWith('fixedWorkspace', false)
  })

  it('keeps the applied value and shows a retryable error when a write fails', async () => {
    act(() => { enableProjectBrainDevMode() })
    const scope = stubScope({ demoApiBaseUrl: 'https://old.example.test' })
    vi.mocked(scope.set).mockRejectedValueOnce(new Error('writer lock is busy'))
    const view = render(<PlatformSettingsSection scope={scope} />)

    fireEvent.change(view.getByLabelText('接口地址'), { target: { value: 'https://new.example.test' } })
    await act(async () => { fireEvent.blur(view.getByLabelText('接口地址')) })

    expect(view.getByText('保存失败：writer lock is busy')).toBeTruthy()
    expect(view.getByText('已应用：https://old.example.test')).toBeTruthy()
    expect((view.getByLabelText('接口地址') as HTMLInputElement).value).toBe('https://new.example.test')
  })
})
