// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import { PlatformSettingsSection } from '../src/client/PlatformSettingsSection.tsx'
import {
  DEFAULT_DEMO_API_BASE_URL,
  DEFAULT_PLATFORM_BASE_URL,
  PROJECT_BRAIN_DEV_MODE_EVENT,
  PROJECT_BRAIN_DEV_MODE_KEY,
} from '../src/client/platform-config.ts'

afterEach(cleanup)

interface ScopeValue {
  readonly platformBaseUrl?: string
  readonly demoApiBaseUrl?: string
}

function stubScope(value?: ScopeValue): SettingsScope<ScopeValue | undefined> {
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => ({ status: value === undefined ? ('unavailable' as const) : ('ready' as const), value, base: undefined, user: undefined, revision: undefined, writable: true, mode: 'host' as const }),
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    set: vi.fn((field, next) => { value = { ...value, [field]: next }; for (const l of listeners) l(); return Promise.resolve() }),
    unset: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(() => Promise.resolve()),
  }
}

describe('PlatformSettingsSection', () => {
  it('stays hidden until the console dev command enables it', () => {
    const view = render(<PlatformSettingsSection scope={stubScope({ platformBaseUrl: 'https://example.test' })} />)
    expect(view.queryByLabelText('智脑平台地址')).toBeNull()

    window.localStorage.setItem(PROJECT_BRAIN_DEV_MODE_KEY, '1')
    act(() => { window.dispatchEvent(new Event(PROJECT_BRAIN_DEV_MODE_EVENT)) })
    expect(view.getByLabelText('智脑平台地址')).toBeTruthy()
  })

  it('renders both configured addresses and writes edits through the scope', () => {
    window.localStorage.setItem(PROJECT_BRAIN_DEV_MODE_KEY, '1')
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

  it('falls back to defaults on empty edits and hides again after closing dev mode', () => {
    window.localStorage.setItem(PROJECT_BRAIN_DEV_MODE_KEY, '1')
    const scope = stubScope()
    const view = render(<PlatformSettingsSection scope={scope} />)
    expect((view.getByLabelText('智脑平台地址') as HTMLInputElement).value).toBe(DEFAULT_PLATFORM_BASE_URL)
    expect((view.getByLabelText('接口地址') as HTMLInputElement).value).toBe(DEFAULT_DEMO_API_BASE_URL)

    fireEvent.change(view.getByLabelText('接口地址'), { target: { value: '   ' } })
    fireEvent.blur(view.getByLabelText('接口地址'))
    expect(scope.set).toHaveBeenCalledWith('demoApiBaseUrl', DEFAULT_DEMO_API_BASE_URL)

    fireEvent.click(view.getByRole('button', { name: '关闭开发者模式' }))
    expect(window.localStorage.getItem(PROJECT_BRAIN_DEV_MODE_KEY)).toBeNull()
    expect(view.queryByLabelText('接口地址')).toBeNull()
  })
})
