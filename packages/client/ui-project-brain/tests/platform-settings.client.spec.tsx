// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import { PlatformSettingsSection } from '../src/client/PlatformSettingsSection.tsx'
import { DEFAULT_PLATFORM_BASE_URL } from '../src/client/platform-config.ts'

afterEach(cleanup)

function stubScope(value?: { readonly platformBaseUrl?: string }): SettingsScope<{ readonly platformBaseUrl?: string } | undefined> {
  const snapshots: Array<{ readonly platformBaseUrl?: string } | undefined> = [value]
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => ({ status: value === undefined ? ('unavailable' as const) : ('ready' as const), value, base: undefined, user: undefined, revision: undefined, writable: true, mode: 'host' as const }),
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    set: vi.fn((field, next) => { snapshots[0] = { ...snapshots[0], [field]: next }; for (const l of listeners) l(); return Promise.resolve() }),
    unset: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(() => Promise.resolve()),
  }
}

describe('PlatformSettingsSection', () => {
  it('renders the configured base and writes edits through the scope', () => {
    const scope = stubScope({ platformBaseUrl: 'https://example.test' })
    const view = render(<PlatformSettingsSection scope={scope} />)
    const input = view.getByLabelText('平台地址') as HTMLInputElement
    expect(input.value).toBe('https://example.test')

    fireEvent.change(input, { target: { value: 'https://new.demo.test' } })
    fireEvent.blur(input)
    expect(scope.set).toHaveBeenCalledWith('platformBaseUrl', 'https://new.demo.test')
  })

  it('falls back to the default base and restores an empty edit', () => {
    const scope = stubScope()
    const view = render(<PlatformSettingsSection scope={scope} />)
    const input = view.getByLabelText('平台地址') as HTMLInputElement
    expect(input.value).toBe(DEFAULT_PLATFORM_BASE_URL)

    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(scope.set).toHaveBeenCalledWith('platformBaseUrl', DEFAULT_PLATFORM_BASE_URL)
    expect((view.getByLabelText('平台地址') as HTMLInputElement).value).toBe(DEFAULT_PLATFORM_BASE_URL)
  })
})
