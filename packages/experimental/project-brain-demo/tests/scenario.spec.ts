import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { replyStreamScenario, splitTrailingPrivateMarkers, streamScenarioText } from '../src/index.ts'
import { PROJECT_BRAIN_PLAN, projectPlanRevisionPayload, resolveProjectBrainReply } from '../src/scenario.ts'
import { parseProjectBrainSurfacePayload, projectBrainScenarioPayload } from '@deepseek-ai/dsh-client-ui-project-brain/scenario'

describe('project brain scripted scenario', () => {
  it.skipIf(!existsSync(new URL('../lib/index.js', import.meta.url)))('does not retain source imports in its published entry', () => {
    const entry = readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
    expect(entry).not.toContain('@deepseek-ai/dsh-client-ui-project-brain/src/')
  })

  it('resolves stream pacing from the owning scenario for every reply kind', () => {
    expect(replyStreamScenario(resolveProjectBrainReply('帮我启动智慧园区建设项目。')).id).toBe('project-launch')
    expect(replyStreamScenario(resolveProjectBrainReply('帮我整理这个项目的会议纪要')).id).toBe('meeting-actions')
    expect(replyStreamScenario(resolveProjectBrainReply('基于这个项目，帮我看看我今天到底该干什么。')).id).toBe('my-day')
    expect(replyStreamScenario({ kind: 'briefing-receipt', text: '' }).id).toBe('executive-briefing')
    expect(replyStreamScenario({ kind: 'meeting-receipt', text: '' }).id).toBe('meeting-actions')
    expect(replyStreamScenario({ kind: 'fallback', text: '' }).id).toBe('project-launch')
  })

  it('keeps all scenario documents on the slowed registry pacing', () => {
    expect(replyStreamScenario({ kind: 'launch-plan', text: '' }).stream).toEqual({ introDelayMs: 1_200, chunkChars: 112, intervalMs: 350 })
    expect(replyStreamScenario({ kind: 'meeting-analysis', text: '' }).stream).toEqual({ introDelayMs: 900, chunkChars: 160, intervalMs: 320 })
    expect(replyStreamScenario({ kind: 'handoff', scenarioId: 'project-copilot', text: '' }).stream).toEqual({ introDelayMs: 800, chunkChars: 112, intervalMs: 350 })
    expect(replyStreamScenario({ kind: 'executive-briefing', text: '' }).stream).toEqual({ introDelayMs: 1_000, chunkChars: 96, intervalMs: 420 })
  })

  describe('trailing private payload streaming', () => {
    afterEach(() => { vi.useRealTimers() })

    function meetingReplyText(): string {
      return resolveProjectBrainReply('帮我整理这个项目的会议纪要').text
    }

    it('recognizes only trailing project-brain markers as hidden payloads', () => {
      const text = meetingReplyText()
      const { visible, hidden } = splitTrailingPrivateMarkers(text)
      expect(visible + hidden).toBe(text)
      expect(hidden.trimStart()).toBe(text.slice(text.lastIndexOf('<!-- project-brain:scenario')))
      expect(splitTrailingPrivateMarkers(visible).hidden).toBe('')
      expect(splitTrailingPrivateMarkers('普通正文，没有标记。').hidden).toBe('')
    })

    it('finishes right after the last visible character instead of pacing kilobytes of invisible payload', async () => {
      vi.useFakeTimers()
      const scenario = replyStreamScenario({ kind: 'meeting-analysis', text: '' })
      // 模拟会议回复：完整真实可见正文 + 与实际规模相当的编码载荷
      const visible = meetingReplyText()
      const hidden = `\n\n<!-- project-brain:scenario ${encodeURIComponent('x'.repeat(6_000))} -->`
      const deltas: string[] = []
      let simulatedMs = 0
      const consumed = (async () => {
        for await (const chunk of streamScenarioText(visible + hidden, scenario, new AbortController().signal)) {
          if (chunk.type === 'text-delta') deltas.push(chunk.text)
        }
        deltas.push('DONE')
      })()
      void consumed.catch(() => undefined)
      while (!deltas.includes('DONE') && simulatedMs <= 120_000) {
        await vi.advanceTimersByTimeAsync(200)
        simulatedMs += 200
      }
      await consumed

      expect(deltas.slice(0, -1).join('')).toBe(visible + hidden)
      // 可见部分播完即收尾；旧实现会为 6000 字符隐形载荷再排约 12 秒节拍
      const budget = scenario.stream.introDelayMs + Math.ceil(visible.length / scenario.stream.chunkChars) * scenario.stream.intervalMs + scenario.stream.intervalMs * 2
      expect(simulatedMs).toBeLessThanOrEqual(budget)
    })
  })

  it('returns the rich launch plan with native markdown visual content', () => {
    const reply = resolveProjectBrainReply('帮我启动智慧园区建设项目。')
    expect(reply.kind).toBe('launch-plan')
    expect(reply.text).toContain('智慧园区建设项目')
    expect(reply.text).toContain('当前进度')
    expect(reply.text).toContain('45%')
    expect(reply.text).toContain('智慧园区项目第三次周例会')
    expect(reply.text).toContain('智慧园区建设方案_v2.3.pdf')
    expect(reply.text).toContain('```mermaid\ngraph LR')
    expect(reply.text).toContain('```mermaid\ngantt')
    expect(reply.text).toContain('```mermaid\npie')
    expect(reply.text).toContain('<!-- project-brain:launch-plan -->')
  })

  it('projects the reference project into four stages and eight tasks', () => {
    expect(PROJECT_BRAIN_PLAN.stages).toHaveLength(4)
    expect(PROJECT_BRAIN_PLAN.tasks).toHaveLength(8)
    expect(PROJECT_BRAIN_PLAN.project.startDate).toBe('2026-03-01')
    expect(PROJECT_BRAIN_PLAN.project.endDate).toBe('2026-12-31')
    expect(PROJECT_BRAIN_PLAN.project.name).toBe('智慧园区建设项目')
  })

  it('keeps the preset project briefing aligned with the shared runtime data', () => {
    const briefingUrl = new URL('../../../../apps/cli/config/agent-presets/project-brain/skills/scenario-1-project-launch/demo-data.json', import.meta.url)
    const briefing = JSON.parse(readFileSync(fileURLToPath(briefingUrl), 'utf8')) as {
      project: { name: string; startDate: string; endDate: string; progress: number }
      stages: { name: string }[]
      tasks: string[]
      risks: string[]
      meeting: { title: string }
      knowledge: string[]
    }

    expect(briefing.project).toMatchObject({
      name: PROJECT_BRAIN_PLAN.project.name,
      startDate: PROJECT_BRAIN_PLAN.project.startDate,
      endDate: PROJECT_BRAIN_PLAN.project.endDate,
      progress: PROJECT_BRAIN_PLAN.project.progress,
    })
    expect(briefing.stages.map(stage => stage.name)).toEqual(PROJECT_BRAIN_PLAN.stages.map(stage => stage.name))
    expect(briefing.tasks).toEqual(PROJECT_BRAIN_PLAN.tasks.map(task => task.title))
    expect(briefing.risks).toEqual(PROJECT_BRAIN_PLAN.risks.map(risk => risk.title))
    expect(briefing.meeting.title).toBe(PROJECT_BRAIN_PLAN.meeting.title)
    expect(briefing.knowledge).toEqual(PROJECT_BRAIN_PLAN.knowledgeDocuments.map(document => document.fileName))
  })

  it('returns a four-step execution receipt using the confirmed plan', () => {
    const confirmed = { ...PROJECT_BRAIN_PLAN, project: { ...PROJECT_BRAIN_PLAN.project, name: '武汉经开区智慧园区建设项目' }, tasks: PROJECT_BRAIN_PLAN.tasks.slice(1) }
    const reply = resolveProjectBrainReply(`确认方案，开始执行项目。\n\n<!-- project-brain:confirm ${projectPlanRevisionPayload(confirmed)} -->`)
    expect(reply.kind).toBe('launch-receipt')
    expect(reply.text).toContain('创建项目管理空间')
    expect(reply.text).toContain('配置项目知识空间与协同规则')
    expect(reply.text).toContain('武汉经开区智慧园区建设项目')
    expect(reply.text).toContain('7 项任务')
    expect(reply.text).not.toContain('```mermaid')
  })

  it('returns a meeting-analysis for the meeting minutes scenario', () => {
    const reply = resolveProjectBrainReply('我刚开完项目启动会，帮我把会议纪要里的事项落到这个项目里。')
    expect(reply.kind).toBe('meeting-analysis')
    expect(reply.text).toContain('会议概览')
    expect(reply.text).toContain('project-brain:meeting-analysis')
    expect(reply.text).toContain('project-brain:meeting-plan')
    expect(reply.text.indexOf('project-brain:meeting-plan')).toBeLessThan(reply.text.indexOf('### 智能去重分析'))
  })

  it('uses the revised meeting items for confirmation totals', () => {
    const items = [{
      id: 'meeting-task-1', type: 'new-task' as const, title: '完成会议行动项', description: '执行会议决议', owner: '王刚', dueDate: '2026-08-30', source: '会议原文', subtasks: [],
    }]
    const prompt = `确认执行会议方案。\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('meeting-actions', 'confirm', items)} -->`
    const reply = resolveProjectBrainReply(prompt)
    expect(reply.kind).toBe('meeting-receipt')
    expect(reply.text).toContain('共处理 1 项行动事项')
    expect(reply.text).toContain('新建任务：1 项')
    expect(reply.text).toContain('更新任务：0 项')
  })

  it('accepts an empty revised meeting action list', () => {
    const prompt = `已调整会议任务。\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('meeting-actions', 'revision', [])} -->`
    const reply = resolveProjectBrainReply(prompt)
    expect(reply.kind).toBe('meeting-analysis')
    expect(reply.text).toContain('新建任务 | 0 项')
  })

  it('emits a named interactive surface for the daily-work scenario', () => {
    const reply = resolveProjectBrainReply('基于这个项目，帮我看看我今天到底该干什么。')
    expect(reply.kind).toBe('handoff')
    expect(reply.text).toContain('6 件事排好了')
    expect(reply.text).toContain('project-brain:surface')
    const surface = parseProjectBrainSurfacePayload<{
      readonly headline: string
      readonly groups: readonly { readonly title: string; readonly tasks: readonly { readonly id: string; readonly project: string }[] }[]
      readonly deferred: readonly unknown[]
      readonly doneToday: readonly unknown[]
      readonly summary: { readonly priority: number; readonly projects: number }
    }>(reply.text)
    expect(surface?.template).toBe('my-day-workbench')
    expect(surface?.data.headline).toBe('今天先处理这 6 件事')
    const taskCount = surface?.data.groups.reduce((total, group) => total + group.tasks.length, 0) ?? 0
    expect(taskCount).toBe(6)
    expect(surface?.data.groups[0]?.title).toBe('优先处理')
    expect(surface?.data.groups.flatMap(group => group.tasks).some(task => task.project === '数据中心迁移项目')).toBe(true)
    expect(surface?.data.deferred).toHaveLength(1)
    expect(surface?.data.summary.projects).toBe(3)
  })

  it('emits a named interactive surface for the project-copilot scenario', () => {
    const reply = resolveProjectBrainReply('智慧园区建设项目现状怎么样？')
    expect(reply.kind).toBe('handoff')
    // The wrap-up streams as ordinary assistant reply text; the board mounts beneath it from the marker.
    expect(reply.text.startsWith('## AI 项目经理小结')).toBe(true)
    expect(reply.text).toContain('目前最需要关注 3 件事')
    const { visible, hidden } = splitTrailingPrivateMarkers(reply.text)
    expect(visible).toContain('接下来我会继续')
    expect(hidden).toContain('project-brain:surface')
    const surface = parseProjectBrainSurfacePayload<{
      readonly agentStatus: { readonly nextCheckAt: string }
      readonly metrics: readonly { readonly id: string; readonly value: string }[]
      readonly tracking: readonly { readonly id: string; readonly aiActions: readonly string[]; readonly nextStep: string }[]
      readonly findings: readonly unknown[]
      readonly decisions: readonly { readonly id: string; readonly advice: string }[]
      readonly aiNarrative: { readonly focus: readonly string[]; readonly needDecision: string }
      readonly overview: { readonly taskStates: readonly unknown[]; readonly attention: readonly unknown[] }
    }>(reply.text)
    expect(surface?.template).toBe('project-copilot-dashboard')
    expect(surface?.data.agentStatus.nextCheckAt).toContain('16:00')
    expect(surface?.data.metrics.map(metric => metric.id)).toEqual(['progress', 'tracking', 'risks', 'decisions'])
    expect(surface?.data.tracking).toHaveLength(3)
    expect(surface?.data.tracking.every(item => item.aiActions.length > 0)).toBe(true)
    expect(surface?.data.findings).toHaveLength(4)
    expect(surface?.data.decisions).toHaveLength(1)
    expect(surface?.data.decisions[0]?.advice).toContain('备选供应商')
    expect(surface?.data.aiNarrative.focus).toHaveLength(3)
    expect(surface?.data.aiNarrative.needDecision).toContain('备选供应商')
    expect(surface?.data.overview.attention.length).toBeGreaterThan(0)
  })

  it('answers a challenge against the recommended ordering deterministically', () => {
    const challenge = resolveProjectBrainReply('为什么不是先做设备选型方案？')
    expect(challenge.kind).toBe('note')
    expect(challenge.text).toContain('不会立即阻塞其他任务')
    const consent = resolveProjectBrainReply('我想先做设备选型，可以吗？')
    expect(consent.kind).toBe('note')
    expect(consent.text).toContain('按你的偏好重新调整')
  })

  it('returns an executive briefing document with a private confirmation payload', () => {
    const reply = resolveProjectBrainReply('下周要给集团领导汇报，帮我准备好')
    expect(reply.kind).toBe('executive-briefing')
    expect(reply.text).toContain('领导摘要')
    expect(reply.text).toContain('45%')
    expect(reply.text).toContain('采购延期')
    expect(reply.text).toContain('需集团协调事项')
    expect(reply.text).toContain('5 分钟口头稿')
    expect(reply.text).toContain('PPT 汇报提纲')
    expect(reply.text).toContain('project-brain:executive-briefing')
    expect(reply.text).toContain('project-brain:scenario')
  })

  it('returns a low-noise executive briefing receipt limited to the selected materials', () => {
    const materials = ['集团领导汇报_口头稿.md']
    const prompt = `确认生成所选汇报材料（1 项）。\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', { projectId: PROJECT_BRAIN_PLAN.project.id, materials })} -->`
    const reply = resolveProjectBrainReply(prompt)
    expect(reply.kind).toBe('briefing-receipt')
    expect(reply.text).toContain('所选材料已生成')
    expect(reply.text).toContain(materials[0])
    expect(reply.text).not.toContain('集团领导汇报_PPT提纲.pptx')
    expect(reply.text).toContain('project-brain:executive-briefing-ready')
    const confirmPayload = /<!-- project-brain:scenario ([A-Za-z0-9%._~-]+) -->/u.exec(reply.text.slice(reply.text.indexOf('executive-briefing-ready')))
    expect(confirmPayload?.[1]).toBeDefined()
  })

  it('renders a revised launch plan from the hidden project edit payload', () => {
    const revised = {
      ...PROJECT_BRAIN_PLAN,
      project: { ...PROJECT_BRAIN_PLAN.project, name: '武汉经开区智慧园区建设项目' },
      stages: PROJECT_BRAIN_PLAN.stages.map((stage, index) => index === 0
        ? { ...stage, owner: '王莉', startDate: '2026-09-03' }
        : stage),
    }
    const prompt = `请按以下调整重新生成项目方案。\n\n<!-- project-brain:revision ${projectPlanRevisionPayload(revised)} -->`

    const reply = resolveProjectBrainReply(prompt)

    expect(reply.kind).toBe('launch-plan')
    expect(reply.text).toContain('武汉经开区智慧园区建设项目')
    expect(reply.text).toContain('王莉')
    expect(reply.text).toContain('2026-09-03')
  })
})
