/**
 * Real-UI assembly closure. The whole layout tree hangs from the built-in
 * `root` slot, which is the only ctx-level slot render in the application.
 */
import { useEffect, type ReactNode } from 'react'

/** Global listener that injects plan-confirmed data from visualize iframe into the chat input. */
function PlanConfirmListener() {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'plan-confirmed' || !event.data?.data) return
      const json = JSON.stringify(event.data.data, null, 2)

      // Find the chat composer textarea
      const textarea = document.querySelector<HTMLTextAreaElement>(
        'textarea:not([readonly]):not([disabled])'
      )
      if (textarea !== null) {
        // Use React's native value setter to bypass React's controlled component
        const setter = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(textarea), 'value',
        )?.set
        if (setter !== undefined) {
          setter.call(textarea, json)
          textarea.dispatchEvent(new Event('input', { bubbles: true }))
          textarea.focus()
        }
      }

      // Fallback: also copy to clipboard
      void navigator.clipboard.writeText(json).catch(() => undefined)

      // Show toast notification
      const toast = document.createElement('div')
      toast.textContent = '✅ 方案已确认，已填入输入框，按 Enter 发送'
      Object.assign(toast.style, {
        position: 'fixed', bottom: '24px', right: '24px', zIndex: '99999',
        background: '#1F4E79', color: '#fff', padding: '12px 24px',
        borderRadius: '8px', fontSize: '14px', fontWeight: '600',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)', opacity: '0',
        transform: 'translateY(12px)', transition: 'all 0.3s ease',
      })
      document.body.appendChild(toast)
      requestAnimationFrame(() => {
        toast.style.opacity = '1'
        toast.style.transform = 'translateY(0)'
      })
      setTimeout(() => {
        toast.style.opacity = '0'
        toast.style.transform = 'translateY(12px)'
        setTimeout(() => toast.remove(), 300)
      }, 3000)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])
  return null
}
import type { Context } from '@deepseek-ai/cordis'
import { bindSnapshotSelector } from './bind.ts'
import { DocumentTitle } from './DocumentTitle.tsx'
import type {} from '@deepseek-ai/dsh-client-runtime/client'

/** Inputs available after the UI renderer's inject set activates. */
export interface AssemblyDeps {
  /** Client context carrying the slots and sessions services. */
  ctx: Context
}

/**
 * Build the assembled application factory.
 * @param deps - Active UI-renderer dependencies.
 * @returns Factory producing the application React tree.
 */
export function buildRenderApp(deps: AssemblyDeps): () => ReactNode {
  const { ctx } = deps
  const sessions = ctx.get('sessions')
  if (sessions === undefined) throw new Error('ui renderer: sessions service unavailable')
  const useSessions = bindSnapshotSelector(sessions.list)
  const SessionDocumentTitle = (): ReactNode => {
    const title = useSessions((state) => {
      const id = state.current
      return id === undefined ? undefined : state.byId[id]?.title
    })
    return <DocumentTitle {...title === undefined ? {} : { title }} />
  }
  return () => (
    <>
      <PlanConfirmListener />
      <SessionDocumentTitle />
      {ctx.slots.renderSlot('root', {})}
    </>
  )
}
