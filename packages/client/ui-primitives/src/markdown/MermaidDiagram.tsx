/** Mermaid diagram renderer for code fences with lang="mermaid". */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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

  // Stable id based on code content hash, so mermaid can cache renders across re-renders.
  const id = useMemo(() => {
    let hash = 0
    for (let i = 0; i < code.length; i++) {
      hash = ((hash << 5) - hash) + code.charCodeAt(i)
      hash |= 0
    }
    return `mermaid-${Math.abs(hash).toString(36)}`
  }, [code])

  useEffect(() => {
    let cancelled = false
    ensureInit()
    const render = async () => {
      try {
        const { svg: result } = await mermaid.render(id, code)
        if (!cancelled) setSvg(result)
      } catch (e) {
        if (!cancelled) setError(String(e))
      }
    }
    render()
    return () => { cancelled = true }
  }, [code, id])

  const exportPng = () => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = svgEl.clientWidth * scale
    canvas.height = svgEl.clientHeight * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const link = document.createElement('a')
      link.download = 'diagram.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

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
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        className="mermaid-diagram"
        style={{ overflow: 'auto', padding: '8px 0' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <button
        type="button"
        onClick={exportPng}
        style={{
          position: 'absolute', top: '4px', right: '4px',
          background: 'var(--dsw-alias-bg-secondary, #f0f0f0)',
          border: '1px solid var(--dsw-alias-border-secondary, #ddd)',
          borderRadius: '4px', padding: '2px 8px', fontSize: '12px',
          cursor: 'pointer', opacity: 0.6,
        }}
        title="导出图片"
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6' }}
      >
        导出图片
      </button>
    </div>
  )
}