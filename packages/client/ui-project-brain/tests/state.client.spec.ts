import { describe, expect, it } from 'vitest'
import { clonePlan, confirmMeetingExecution, createProjectBrainStore, launchMeetingScenario, launchProjectScenario, markMeetingExecuted, markProjectPlanReady, meetingRevision, projectPlanRevisionSummary, submitMeetingRevision, submitProjectPlanRevision } from '../src/client/state.ts'

describe('project brain demo state', () => {
  it('uses the shared plan as the launch source', () => {
    const store = createProjectBrainStore().create()
    const outcome = launchProjectScenario(store, { text: '帮我启动智慧园区建设项目。', files: [] })

    expect(outcome.kind).toBe('success')
    expect(store.getSnapshot().phase).toBe('analyzing')
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
    expect(store.getSnapshot().phase).toBe('review-ready')
  })

  it('keeps revised meeting items through confirmation and applies them to the project snapshot', () => {
    const store = createProjectBrainStore().create()
    launchMeetingScenario(store)
    const item = { id: 'meeting-new-1', type: 'new-task' as const, title: '会议新任务', description: '根据会议执行', owner: '王刚', dueDate: '2026-08-30', source: '会议决议', subtasks: [] }
    submitMeetingRevision(store, [item])
    expect(store.getSnapshot().meetingItems).toEqual([item])
    store.store.update((draft) => { draft.phase = 'review-ready' })
    confirmMeetingExecution(store)
    markMeetingExecuted(store)
    expect(store.getSnapshot().phase).toBe('completed')
    expect(store.getSnapshot().plan?.tasks.some(task => task.id === item.id)).toBe(true)
  })

  it('summarizes meeting revisions as readable change lists', () => {
    const before = [
      { id: 'a', type: 'new-task' as const, title: '搭建最小测试环境', description: '', owner: '刘洋', dueDate: '2026-08-25', source: '', subtasks: [] },
      { id: 'b', type: 'update-task' as const, title: '调整采购到货时间', description: '', owner: '王刚', dueDate: '2026-09-15', source: '', subtasks: [] },
    ]
    const after = [
      { ...before[0]!, owner: '陈涛' },
      before[1]!,
      { id: 'c', type: 'new-risk' as const, title: '供应商产能风险', description: '', owner: '王刚', dueDate: '2026-09-01', source: '', subtasks: [] },
    ]
    const revision = meetingRevision(before, after)
    expect(revision.summary).toContain('新增 1 项行动事项')
    expect(revision.summary).toContain('「搭建最小测试环境」：负责人 刘洋 → 陈涛')
    expect(revision.details).toHaveLength(2)
    expect(meetingRevision(before, before).summary).toBe('未修改会议任务。')
  })
})
