import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PROJECT_BRAIN_MEETING_STREAM_CONFIG, PROJECT_BRAIN_STREAM_CONFIG } from '../src/index.ts'
import { PROJECT_BRAIN_PLAN, projectPlanRevisionPayload, resolveProjectBrainReply } from '../src/scenario.ts'
import { parseProjectBrainSurfacePayload, projectBrainScenarioPayload } from '@deepseek-ai/dsh-client-ui-project-brain/src/scenario-registry.ts'

describe('project brain scripted scenario', () => {
  it('uses the faster presentation stream pacing', () => {
    expect(PROJECT_BRAIN_STREAM_CONFIG).toEqual({ introDelayMs: 1_000, chunkChars: 128, intervalMs: 300 })
  })

  it('uses a faster stream pace for meeting analysis', () => {
    expect(PROJECT_BRAIN_MEETING_STREAM_CONFIG).toEqual({ introDelayMs: 700, chunkChars: 192, intervalMs: 220 })
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
    expect(reply.text).toContain('project-brain:surface')
    const surface = parseProjectBrainSurfacePayload<{
      readonly tasks: readonly unknown[]
      readonly summary: { readonly urgent: number; readonly meetings: number; readonly waiting: number }
    }>(reply.text)
    expect(surface?.template).toBe('my-day-workbench')
    expect(surface?.data.tasks).toHaveLength(6)
    expect(surface?.data.summary).toMatchObject({ urgent: 2, meetings: 1, waiting: 1 })
  })

  it('emits a named interactive surface for the project-copilot scenario', () => {
    const reply = resolveProjectBrainReply('帮我托管这个项目')
    expect(reply.kind).toBe('handoff')
    const surface = parseProjectBrainSurfacePayload<{
      readonly discoveries: { readonly highRisks: number; readonly abnormalTasks: number; readonly dueSoon: number; readonly coordination: number }
      readonly decisions: readonly unknown[]
    }>(reply.text)
    expect(surface?.template).toBe('project-copilot-dashboard')
    expect(surface?.data.discoveries).toEqual({ highRisks: 1, abnormalTasks: 2, dueSoon: 4, coordination: 3 })
    expect(surface?.data.decisions).toHaveLength(3)
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

  it('returns a low-noise executive briefing receipt after confirmation', () => {
    const prompt = `确认生成汇报包。\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', { projectId: PROJECT_BRAIN_PLAN.project.id })} -->`
    const reply = resolveProjectBrainReply(prompt)
    expect(reply.kind).toBe('briefing-receipt')
    expect(reply.text).toContain('汇报包已生成')
    expect(reply.text).toContain('领导摘要')
    expect(reply.text).toContain('PPT 汇报提纲')
    expect(reply.text).toContain('project-brain:executive-briefing-ready')
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
