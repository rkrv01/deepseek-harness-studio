import { useEffect, useRef, useState } from 'react'
import { disableProjectBrainDevMode, enableProjectBrainDevMode, isProjectBrainDevMode, PROJECT_BRAIN_DEV_MODE_EVENT } from './platform-config.ts'
import { useProjectBrainLocale } from './use-project-brain-locale.ts'
import css from './DeveloperModeGate.module.css'

const DEVELOPER_SECTION_ID = 'project-brain-platform'

/** Props supplied by the settings shell for the developer-mode footer. */
export interface DeveloperModeGateProps {
  readonly openSection: (id: string) => void
  readonly activeSectionId: string | undefined
}

interface DeveloperModeWindow {
  readonly dshDesktop?: { readonly developerMode: { unlock(password: string): Promise<boolean> } }
}

/** Settings footer control that unlocks the session-only developer section. */
export function DeveloperModeGate({ openSection, activeSectionId }: DeveloperModeGateProps): JSX.Element {
  const locale = useProjectBrainLocale()
  const [unlocked, setUnlocked] = useState(isProjectBrainDevMode)
  const [expanded, setExpanded] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)
  const input = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const sync = (): void => { setUnlocked(isProjectBrainDevMode()) }
    window.addEventListener(PROJECT_BRAIN_DEV_MODE_EVENT, sync)
    return () => {
      window.removeEventListener(PROJECT_BRAIN_DEV_MODE_EVENT, sync)
      disableProjectBrainDevMode()
    }
  }, [])

  useEffect(() => {
    if (unlocked && activeSectionId !== DEVELOPER_SECTION_ID) disableProjectBrainDevMode()
  }, [activeSectionId, unlocked])

  const unlock = async (): Promise<void> => {
    const bridge = (window as unknown as DeveloperModeWindow).dshDesktop
    if (bridge === undefined || password.length === 0 || pending) return
    setPending(true)
    setError(false)
    try {
      if (await bridge.developerMode.unlock(password)) {
        enableProjectBrainDevMode()
        openSection(DEVELOPER_SECTION_ID)
        setPassword('')
        setExpanded(false)
      } else {
        setError(true)
        setPassword('')
        input.current?.focus()
      }
    } finally {
      setPending(false)
    }
  }

  if (unlocked) return <span className={css.sessionMarker} aria-hidden="true" />

  if (!expanded) {
    return (
      <button type="button" className={css.trigger} onClick={() => { setExpanded(true); setError(false) }}>
        {locale === 'en' ? 'Developer Mode' : '开发者模式'}
      </button>
    )
  }

  return (
    <div className={css.gate} aria-label={locale === 'en' ? 'Developer Mode' : '开发者模式'}>
      <label className={css.label}>
        <span>{locale === 'en' ? 'Developer Mode' : '开发者模式'}</span>
        <input
          ref={input}
          type="password"
          autoFocus
          value={password}
          placeholder={locale === 'en' ? 'Enter password' : '请输入密码'}
          aria-label={locale === 'en' ? 'Developer mode password' : '开发者模式密码'}
          onChange={(event) => { setPassword(event.target.value); setError(false) }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void unlock()
            if (event.key === 'Escape') { setExpanded(false); setPassword(''); setError(false) }
          }}
        />
      </label>
      {error && <span className={css.error}>{locale === 'en' ? 'Incorrect password, please try again' : '密码错误，请重试'}</span>}
      <div className={css.actions}>
        <button type="button" className={css.confirm} disabled={pending || password.length === 0} onClick={() => { void unlock() }}>
          {pending ? (locale === 'en' ? 'Verifying...' : '验证中...') : (locale === 'en' ? 'Verify' : '验证')}
        </button>
        <button type="button" className={css.cancel} onClick={() => { setExpanded(false); setPassword(''); setError(false) }}>
          {locale === 'en' ? 'Cancel' : '取消'}
        </button>
      </div>
    </div>
  )
}
