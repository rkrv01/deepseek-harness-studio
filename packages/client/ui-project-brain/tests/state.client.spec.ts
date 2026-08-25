import { describe, expect, it } from 'vitest'
import { PROJECT_BRAIN_PLAN_READY_DELAY_MS } from '../src/client/index.ts'
import { clonePlan, createProjectBrainStore, launchProjectScenario, markProjectPlanReady, projectPlanRevisionSummary, submitProjectPlanRevision } from '../src/client/state.ts'

describe('project brain demo state', () => {
  it('makes the editor entry available when the faster launch stream completes', () => {
    expect(PROJECT_BRAIN_PLAN_READY_DELAY_MS).toBe(14_000)
  })

  it('uses the shared plan as the launch source', () => {
    const store = createProjectBrainStore().create()
    const outcome = launchProjectScenario(store, { text: '帮我启动智慧园区建设项目。', files: [] })

    expect(outcome.kind).toBe('success')
    expect(store.getSnapshot().phase).toBe('generating')
    expect(store.getSnapshot().plan?.project.name).toBe('智慧园区建设项目')
    expect(store.getSnapshot().plan?.stages).toHaveLength(4)
    expect(store.getSnapshot().plan?.tasks).toHaveLength(8)
  })

  it('summarizes a batch revision and retains it while the revised answer streams', () => {
    const store = createProjectBrainStore().create()
    launchProjectScenario(store, { text: '帮我启动智慧园区建设项目。', files: [] })
    const before = store.getSnapshot().plan!
    const copy = clonePlan(before)
    const after = {
      ...copy,
      project: { ...copy.project, name: '武汉经开区智慧园区建设项目' },
      stages: copy.stages.map((stage, index) => index === 0 ? { ...stage, owner: '王莉' } : stage),
      risks: [...copy.risks, { id: 'R-NEW', title: '现场施工风险', type: '现场施工', level: '中', owner: '张明', description: '现场交叉施工', impact: '影响施工计划', mitigation: '按周协调', relatedTaskId: '' }],
    }

    expect(projectPlanRevisionSummary(before, after)).toContain('将项目名称调整为“武汉经开区智慧园区建设项目”')
    expect(projectPlanRevisionSummary(before, after)).toContain('调整阶段信息')
    expect(projectPlanRevisionSummary(before, after)).toContain('新增 1 项风险')

    submitProjectPlanRevision(store, after)
    expect(store.getSnapshot().phase).toBe('revising')
    expect(store.getSnapshot().plan?.project.name).toBe('武汉经开区智慧园区建设项目')
    markProjectPlanReady(store)
    expect(store.getSnapshot().phase).toBe('plan-ready')
  })
})
