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
  const [loading, setLoading] = useState(true)

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
    setLoading(true)
    setSvg(null)
    ensureInit()
    const timer = setTimeout(async () => {
      if (cancelled) return
      try {
        const { svg: result } = await mermaid.render(id, code)
        if (!cancelled) {
          setSvg(result)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
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

  if (svg !== null) {
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px 16px', opacity: 0.5 }}>
        <span className="mermaid-loading-spinner" style={{
          display: 'inline-block', width: '16px', height: '16px',
          border: '2px solid var(--dsw-alias-border-secondary, #ddd)',
          borderTopColor: 'var(--dsw-alias-text-secondary, #999)',
          borderRadius: '50%',
          animation: 'mermaid-spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '13px', color: 'var(--dsw-alias-text-secondary, #999)' }}>图表生成中…</span>
        <style>{'@keyframes mermaid-spin { to { transform: rotate(360deg) } }'}</style>
      </div>
    )
  }

  return (
    <pre style={{ padding: '8px', color: 'var(--dsw-alias-text-secondary, #999)', fontSize: '13px' }}>
      <code>{code}</code>
    </pre>
  )
}