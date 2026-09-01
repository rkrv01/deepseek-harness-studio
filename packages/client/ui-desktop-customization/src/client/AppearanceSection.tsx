/** In-app background chooser over the proven Harness image-skin pipeline. */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { AppearanceController } from './appearance-controller.ts'
import {
  BUNDLED_APPEARANCE_THEMES,
  DEFAULT_BUILTIN_APPEARANCE_THEME,
  resolveAppearanceBackground,
} from './appearance-themes.ts'
import { extractPalette, loadImage, renderBackground } from './background-image.ts'
import type { BuiltinAppearanceTheme } from './bridge.ts'
import css from './DesktopCustomization.module.css'

export interface AppearanceSectionInjected {
  readonly controller: AppearanceController
}

export type AppearanceSectionProps = Partial<AppearanceSectionInjected>

/** Render the background selection, crop focus, glass, save, and reset controls. */
export function AppearanceSection({ controller }: AppearanceSectionProps): ReactNode {
  if (controller === undefined) return null
  return <LoadedAppearance controller={controller} />
}

function LoadedAppearance({ controller }: AppearanceSectionInjected): ReactNode {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const [previewUrl, setPreviewUrl] = useState(resolveAppearanceBackground(snapshot.settings))
  const [selectedUrl, setSelectedUrl] = useState<string | undefined>(undefined)
  const [draftTheme, setDraftTheme] = useState<BuiltinAppearanceTheme | null>(snapshot.settings.builtinTheme)
  const [draftDirty, setDraftDirty] = useState(false)
  const [focusY, setFocusY] = useState(snapshot.settings.focusY)
  const [glassStrength, setGlassStrength] = useState(snapshot.settings.glassStrength)
  const [localMessage, setLocalMessage] = useState<string | undefined>(undefined)
  const busy = snapshot.status === 'saving'

  useEffect(() => {
    if (draftDirty) return
    setPreviewUrl(resolveAppearanceBackground(snapshot.settings))
    setDraftTheme(snapshot.settings.builtinTheme)
    setFocusY(snapshot.settings.focusY)
    setGlassStrength(snapshot.settings.glassStrength)
  }, [draftDirty, snapshot.settings])

  useEffect(() => () => {
    if (selectedUrl !== undefined) URL.revokeObjectURL(selectedUrl)
  }, [selectedUrl])

  const previewStyle = useMemo(() => ({
    backgroundImage: previewUrl === null
      ? 'linear-gradient(145deg, var(--dsw-alias-bg-layer-1), var(--dsw-alias-bg-base))'
      : `linear-gradient(90deg, rgba(4, 12, 22, ${String(0.18 + glassStrength / 220)}) 0%, rgba(7, 20, 34, 0.08) 50%, rgba(4, 12, 22, 0.30) 100%), url("${previewUrl}")`,
    backgroundPosition: previewUrl === null ? 'center' : `center, center ${String(focusY)}%`,
  }), [focusY, glassStrength, previewUrl])

  const save = async (): Promise<void> => {
    setLocalMessage('正在处理 1920 × 1080 WebP…')
    try {
      let imageDataUrl = snapshot.settings.imageDataUrl
      let palette = snapshot.settings.palette
      if (draftTheme !== null) {
        imageDataUrl = null
        palette = BUNDLED_APPEARANCE_THEMES[draftTheme].palette
      } else if (selectedUrl !== undefined) {
        const image = await loadImage(selectedUrl)
        const canvas = renderBackground(image, focusY)
        imageDataUrl = canvas.toDataURL('image/webp', 0.86)
        palette = extractPalette(canvas)
      }
      await controller.save({ builtinTheme: draftTheme, imageDataUrl, focusY, glassStrength, palette })
      if (selectedUrl !== undefined) URL.revokeObjectURL(selectedUrl)
      setSelectedUrl(undefined)
      setDraftDirty(false)
      setLocalMessage('背景已保存，重新启动应用后仍会保留。')
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const reset = async (): Promise<void> => {
    try {
      await controller.reset()
      if (selectedUrl !== undefined) URL.revokeObjectURL(selectedUrl)
      setSelectedUrl(undefined)
      setDraftTheme(DEFAULT_BUILTIN_APPEARANCE_THEME)
      setDraftDirty(false)
      const theme = BUNDLED_APPEARANCE_THEMES[DEFAULT_BUILTIN_APPEARANCE_THEME]
      setPreviewUrl(theme.imageUrl)
      setFocusY(theme.focusY)
      setGlassStrength(theme.glassStrength)
      setLocalMessage('已恢复官方原版界面。')
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <section className={css.section}>
      <div>
        <h2 className={css.title}>皮肤与界面氛围</h2>
        <p className={css.intro}>桌面演示版固定使用官方原版界面，其他皮肤和自定义背景暂不可用。</p>
      </div>
      <div className={css.preview} style={previewStyle} role="img" aria-label="当前背景预览">
        <div className={css.previewChrome}>
          <span />
          <strong>Starlight AI助手</strong>
        </div>
        <div className={css.previewGlass}>
          <span>背景预览</span>
          <small>1920 × 1080 WebP</small>
        </div>
      </div>
      <div className={css.fileRow}>
        <div><strong>官方原版背景</strong><small>演示版本固定使用官方原版界面。</small></div>
      </div>
      <label className={css.rangeRow}>
        <span><b>主体焦点</b><output>{focusY}%</output></span>
        <input type="range" min="0" max="100" value={focusY} disabled />
      </label>
      <label className={css.rangeRow}>
        <span><b>界面玻璃层</b><output>{glassStrength}%</output></span>
        <input type="range" min="35" max="92" value={glassStrength} disabled />
      </label>
      {(localMessage ?? snapshot.message) !== undefined && (
        <p className={snapshot.status === 'error' ? css.error : css.notice}>{localMessage ?? snapshot.message}</p>
      )}
      <div className={css.actions}>
        <button type="button" className={css.primaryButton} disabled={busy} onClick={() => { void save() }}>
          {busy ? '保存中…' : '保存并应用'}
        </button>
        <button type="button" className={css.secondaryButton} disabled={busy} onClick={() => { void reset() }}>
          恢复默认
        </button>
      </div>
    </section>
  )
}
