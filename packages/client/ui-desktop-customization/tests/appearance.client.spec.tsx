// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppearanceController, DEFAULT_APPEARANCE } from '../src/client/appearance-controller.ts'
import { AppearanceSection } from '../src/client/AppearanceSection.tsx'
import { BUNDLED_APPEARANCE_THEMES } from '../src/client/appearance-themes.ts'
import type { AppearanceSettings, DesktopRendererBridge } from '../src/client/bridge.ts'

afterEach(() => {
  cleanup()
  document.body.removeAttribute('data-dsh-desktop-skin')
  document.body.removeAttribute('style')
})

function bench(initial: AppearanceSettings = DEFAULT_APPEARANCE) {
  let stored = initial
  const save = vi.fn(async (settings: AppearanceSettings) => {
    stored = settings
    return settings
  })
  const bridge = {
    platform: 'darwin',
    appearance: {
      get: () => Promise.resolve(stored),
      save,
      reset: () => Promise.resolve(DEFAULT_APPEARANCE),
    },
  } as unknown as DesktopRendererBridge
  const disposeTokens = vi.fn()
  const theme = { overrideTokens: vi.fn(() => disposeTokens) }
  const controller = new AppearanceController(bridge, theme as never)
  return { controller, disposeTokens, save }
}

describe('Desktop appearance themes', () => {
  it('starts with the official skin and does not expose alternate themes', async () => {
    const fixture = bench()
    const dispose = fixture.controller.start()
    render(<AppearanceSection controller={fixture.controller} />)
    await act(async () => {})

    expect(screen.getByText('官方原版背景')).toBeTruthy()
    expect(screen.queryByText('内置皮肤')).toBeNull()
    expect(screen.queryByRole('button', { name: /大肥鱼拟人/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /云端猫咪/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /九天/ })).toBeNull()
    expect(screen.queryByText('选择图片')).toBeNull()

    dispose()
  })

  it('persists the official original theme and removes the image skin', async () => {
    const fixture = bench()
    const dispose = fixture.controller.start()
    render(<AppearanceSection controller={fixture.controller} />)
    await act(async () => {})

    fireEvent.click(screen.getByRole('button', { name: '保存并应用' }))

    await waitFor(() => {
      expect(fixture.save).toHaveBeenCalledWith({
        builtinTheme: 'official',
        imageDataUrl: null,
        focusY: 50,
        glassStrength: 72,
        palette: BUNDLED_APPEARANCE_THEMES.official.palette,
      })
    })
    expect(document.body.hasAttribute('data-dsh-desktop-skin')).toBe(false)
    expect(document.body.style.getPropertyValue('--dsh-desktop-background-image')).toBe('')

    dispose()
  })

})
