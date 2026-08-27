import { createRoot } from 'react-dom/client'
import { StrictMode, useEffect, useState } from 'react'
import './tokens.css'
import { ProjectBrainScenarioSurface } from '../../../../packages/client/ui-project-brain/src/client/ProjectBrainScenarioSurface.tsx'
import { MEETING_ANALYSIS_MOCK, PROJECT_BRAIN_COPILOT_DEMO, PROJECT_BRAIN_MY_DAY_DEMO } from '../../../../packages/client/ui-project-brain/src/project-data.ts'

const SCENES = [
  { id: 'copilot', label: '托管看板', sceneId: 'project-copilot' as const, template: 'project-copilot-dashboard' as const, data: PROJECT_BRAIN_COPILOT_DEMO },
  { id: 'myday', label: '今日工作台', sceneId: 'my-day' as const, template: 'my-day-workbench' as const, data: PROJECT_BRAIN_MY_DAY_DEMO },
  { id: 'meeting', label: '会议分析卡', sceneId: 'meeting-actions' as const, template: 'none' as const, data: MEETING_ANALYSIS_MOCK },
]

const OVERLAY_KEY = 'dsh-pb-debug-overlay-css'

function DebugApp(): JSX.Element {
  const [active, setActive] = useState<string>('copilot')
  const [overlay, setOverlay] = useState<string>(() => localStorage.getItem(OVERLAY_KEY) ?? '')

  useEffect(() => {
    let style = document.getElementById('pb-debug-overlay') as HTMLStyleElement | null
    if (overlay === '') {
      style?.remove()
      return
    }
    if (style === null) {
      style = document.createElement('style')
      style.id = 'pb-debug-overlay'
      document.head.appendChild(style)
    }
    style.textContent = overlay
  }, [overlay])

  const saveOverlay = (value: string): void => {
    setOverlay(value)
    localStorage.setItem(OVERLAY_KEY, value)
  }

  const scene = SCENES.find(candidate => candidate.id === active)!

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "PingFang SC", sans-serif', padding: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 16, margin: 0 }}>项目智脑 · 独立调试页</h1>
        {SCENES.map(item => (
          <button
            key={item.id}
            onClick={() => { setActive(item.id) }}
            style={{
              padding: '6px 14px', border: '1px solid #dbe3ef', borderRadius: 999,
              background: active === item.id ? '#2f6fed' : '#fff', color: active === item.id ? '#fff' : '#1c2733',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            {item.label}
          </button>
        ))}
        <span style={{ fontSize: 12, color: '#8490a2' }}>改样式最快路径：下方“实时样式覆盖” / 组件源码 packages/client/ui-project-brain/src/client/*.module.css</span>
      </header>

      <main style={{ marginTop: 20 }}>
        {scene.template === 'none'
          ? (
            <div style={{ border: '1px dashed #dbe3ef', borderRadius: 12, padding: 20, color: '#8490a2' }}>
              会议分析卡是消息卡片（非 surface），此处仅展示数据来源；请在 3080 会话中查看。
            </div>
          )
          : <ProjectBrainScenarioSurface surface={{ version: 1, scenarioId: scene.sceneId, template: scene.template, data: scene.data }} />}
      </main>

      <section style={{ marginTop: 24, border: '1px solid #dbe3ef', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong style={{ fontSize: 13 }}>实时样式覆盖（存本地，刷新保留）</strong>
          <button
            type="button"
            onClick={() => { saveOverlay('') }}
            style={{ border: '1px solid #dbe3ef', background: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
          >
            清空
          </button>
        </div>
        <textarea
          value={overlay}
          onChange={(event) => { saveOverlay(event.target.value) }}
          spellCheck={false}
          placeholder={'例如：\n[aria-label="项目托管看板"] { max-width: 760px; }\n._trackItem { padding: 10px; }'}
          style={{ width: '100%', minHeight: 120, boxSizing: 'border-box', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, padding: 10, border: '1px solid #dbe3ef', borderRadius: 8 }}
        />
      </section>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><DebugApp /></StrictMode>,
)
