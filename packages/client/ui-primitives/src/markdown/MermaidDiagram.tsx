/** Mermaid diagram renderer for code fences with lang="mermaid". */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import mermaid from 'mermaid'

let initialized = false

function ensureInit(): void {
  if (initialized) return
  initialized = true
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    themeVariables: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
  })
}

/** Render one mermaid source string to an inline SVG. */
export function MermaidDiagram({ code }: { readonly code: string }): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ensureInit()
    const render = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2, 8)}`
        const { svg: result } = await mermaid.render(id, code)
        if (!cancelled) setSvg(result)
      } catch (e) {
        if (!cancelled) setError(String(e))
      }
    }
    render()
    return () => { cancelled = true }
  }, [code])

  if (error !== null) {
    return (
      <pre className="mermaid-error" style={{ color: 'var(--dsw-alias-label-danger, #e53e3e)', padding: '8px' }}>
        <code>{code}</code>
        <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Mermaid render error: {error}</div>
      </pre>
    )
  }

  if (svg === null) {
    return <div style={{ padding: '16px', textAlign: 'center', opacity: 0.5 }}>Loading diagram…</div>
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-diagram"
      style={{ overflow: 'auto', padding: '8px 0' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}