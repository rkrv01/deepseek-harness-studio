/** Canonical Project Brain demo data shared by the deterministic model and browser UI. */

export const PROJECT_BRAIN_PLATFORM_URL = 'https://7koxhpk4.ipyingshe.net:54928/business-xmzn/#/projectAdmin'

export interface ProjectBrainProjectData {
  readonly id: string
  readonly name: string
  readonly companyName: string
  readonly management: string
  readonly summary: string
  readonly goal: string
  readonly owner: string
  readonly startDate: string
  readonly endDate: string
  readonly progress: number
  readonly pendingTaskCount: number
  /** This amount is a presentation-only supplement absent from the source platform fixture. */
  readonly budget: number
  readonly platformUrl: string
}

export interface ProjectBrainStageData { readonly id: string; readonly name: string; readonly owner: string; readonly startDate: string; readonly endDate: string; readonly deliverable: string }
export interface ProjectBrainTaskData { readonly id: string; readonly title: string; readonly owner: string; readonly startDate: string; readonly endDate: string; readonly dependency: string; readonly progress: number; readonly deliverable: string; readonly packageId: string }
export interface ProjectBrainRiskData { readonly id: string; readonly title: string; readonly type: string; readonly level: string; readonly owner: string; readonly description: string; readonly impact: string; readonly mitigation: string; readonly relatedTaskId: string }
export interface ProjectBrainMeetingData { readonly id: string; readonly title: string; readonly date: string; readonly host: string; readonly location: string; readonly summary: string; readonly actions: readonly { readonly title: string; readonly owner: string; readonly dueDate: string }[] }
export interface ProjectBrainKnowledgeDocument { readonly id: string; readonly title: string; readonly category: string; readonly fileName: string; readonly author: string; readonly status: '已发布' | '草稿'; readonly summary: string }
export interface ProjectBrainPlanData {
  readonly project: ProjectBrainProjectData
  readonly stages: readonly ProjectBrainStageData[]
  readonly tasks: readonly ProjectBrainTaskData[]
  readonly risks: readonly ProjectBrainRiskData[]
  readonly knowledgeFolders: readonly string[]
  readonly meeting: ProjectBrainMeetingData
  readonly knowledgeDocuments: readonly ProjectBrainKnowledgeDocument[]
}

/**
 * Source-aligned demo snapshot from the Project Brain platform fixture.
 * The budget is intentionally retained as a scenario presentation supplement.
 */
export const PROJECT_BRAIN_PLAN: ProjectBrainPlanData = {
  project: { id: '-1', name: '智慧园区建设项目', companyName: '智算科技有限公司', management: '项目管理部', summary: '智慧园区建设项目，涵盖园区智能化系统建设、设备集成、平台开发、系统联调测试等全部环节，共4个当前实施阶段、8项关键任务。', goal: '完成园区智能化系统建设、设备集成、平台联调测试与验收交付，保障关键风险受控。', owner: '张明', startDate: '2026-03-01', endDate: '2026-12-31', progress: 45, pendingTaskCount: 6, budget: 12_000_000, platformUrl: PROJECT_BRAIN_PLATFORM_URL },
  stages: [
    { id: 'stage-design', name: '方案设计', owner: '赵雪', startDate: '2026-03-01', endDate: '2026-05-30', deliverable: '建设方案评审纪要、实施方案确认' },
    { id: 'stage-procurement', name: '设备采购', owner: '王刚', startDate: '2026-06-01', endDate: '2026-09-30', deliverable: '采购合同、采购清单、设备验收报告' },
    { id: 'stage-integration', name: '系统集成', owner: '刘洋', startDate: '2026-08-01', endDate: '2026-11-15', deliverable: '接口文档、集成报告' },
    { id: 'stage-acceptance', name: '验收交付', owner: '陈涛', startDate: '2026-10-01', endDate: '2026-12-31', deliverable: '验收方案、验收报告、交付资料' },
  ],
  tasks: [
    { id: 'demo-sub-004', title: '智能化建设方案评审', owner: '赵雪', startDate: '2026-03-15', endDate: '2026-04-20', dependency: '—', progress: 100, deliverable: '评审纪要', packageId: 'demo-pkg-002' },
    { id: 'demo-sub-005', title: '实施方案审核确认', owner: '赵雪', startDate: '2026-04-01', endDate: '2026-05-15', dependency: 'demo-sub-004', progress: 100, deliverable: '确认签字', packageId: 'demo-pkg-002' },
    { id: 'demo-sub-001', title: '安防摄像头采购', owner: '王刚', startDate: '2026-06-01', endDate: '2026-07-15', dependency: 'demo-sub-005', progress: 60, deliverable: '采购合同', packageId: 'demo-pkg-001' },
    { id: 'demo-sub-002', title: '门禁系统设备采购', owner: '王刚', startDate: '2026-07-01', endDate: '2026-08-30', dependency: 'demo-sub-001', progress: 20, deliverable: '采购清单', packageId: 'demo-pkg-001' },
    { id: 'demo-sub-003', title: '设备到货验收', owner: '王刚', startDate: '2026-08-01', endDate: '2026-09-30', dependency: 'demo-sub-002', progress: 0, deliverable: '验收报告', packageId: 'demo-pkg-001' },
    { id: 'demo-sub-006', title: '安防系统与平台对接', owner: '刘洋', startDate: '2026-08-01', endDate: '2026-09-30', dependency: 'demo-sub-003', progress: 30, deliverable: '接口文档', packageId: 'demo-pkg-003' },
    { id: 'demo-sub-007', title: '能耗系统数据集成', owner: '刘洋', startDate: '2026-09-01', endDate: '2026-10-31', dependency: 'demo-sub-006', progress: 0, deliverable: '集成报告', packageId: 'demo-pkg-003' },
    { id: 'demo-sub-008', title: '验收文档编写', owner: '陈涛', startDate: '2026-10-01', endDate: '2026-11-15', dependency: 'demo-sub-007', progress: 5, deliverable: '验收方案', packageId: 'demo-pkg-004' },
  ],
  risks: [
    { id: 'demo-risk-001', title: '设备采购延期风险', type: '延期', level: '高', owner: '王刚', description: '安防摄像头供应商产能不足，首批交货预计延期 2 周。', impact: '系统集成测试将推迟至少 2 周，影响整体验收节点。', mitigation: '启动备选供应商方案，协调分批交货并约定延期责任。', relatedTaskId: 'demo-sub-003' },
    { id: 'demo-risk-002', title: '供应商评估不足风险', type: '阻塞', level: '中', owner: '王刚', description: '部分供应商资质文件不完整，关键认证缺失。', impact: '设备质量与交付存在不确定性。', mitigation: '重新评估资质，限期补充认证材料并建立供应商黑名单。', relatedTaskId: '' },
    { id: 'demo-risk-003', title: '测试环境交付延迟风险', type: '延期', level: '中', owner: '刘洋', description: '服务器资源申请尚未批复，测试环境搭建滞后。', impact: '系统集成测试周期压缩，影响测试覆盖率。', mitigation: '优先搭建最小测试环境，并加快资源审批。', relatedTaskId: 'demo-sub-006' },
    { id: 'demo-risk-004', title: '核心人员流失风险', type: '阻塞', level: '低', owner: '赵雪', description: '技术组关键开发人员存在离职意向。', impact: '关键模块交接与开发进度可能延误。', mitigation: '启动人才储备、知识转移并推进保留方案。', relatedTaskId: '' },
    { id: 'demo-risk-005', title: '需求变更风险', type: '阻塞', level: '低', owner: '张明', description: '甲方提出新增园区能耗监测模块需求。', impact: '项目成本可能增加约 15%，工期可能延长约 1 个月。', mitigation: '启动变更管理，评估范围、成本与分阶段实施方案。', relatedTaskId: '' },
  ],
  knowledgeFolders: ['项目文档', '技术方案', '评估报告'],
  meeting: { id: 'demo-meeting-001', title: '智慧园区项目第三次周例会', date: '2026-08-15 14:00', host: '张明', location: '智算科技 3F 会议室A', summary: '会议聚焦设备采购延期风险与系统集成测试准备，决定启动备选供应商方案并加快最小测试环境搭建。', actions: [{ title: '确定备选供应商方案', owner: '王刚', dueDate: '2026-08-22' }, { title: '完成最小测试环境搭建', owner: '刘洋', dueDate: '2026-08-20' }, { title: '完成设备选型方案', owner: '赵雪', dueDate: '2026-08-28' }, { title: '提交供应商资质补充材料', owner: '王刚', dueDate: '2026-08-25' }] },
  knowledgeDocuments: [
    { id: 'demo-know-001', title: '智慧园区建设方案', category: '技术方案', fileName: '智慧园区建设方案_v2.3.pdf', author: '赵雪', status: '已发布', summary: '覆盖安防、门禁、能耗、停车等子系统的总体建设方案。' },
    { id: 'demo-know-002', title: '项目实施方案', category: '项目文档', fileName: '项目实施方案_2026.docx', author: '张明', status: '已发布', summary: '阶段划分、资源安排、里程碑和风险应对策略。' },
    { id: 'demo-know-003', title: '供应商评估报告', category: '评估报告', fileName: '供应商评估报告_2026Q2.pdf', author: '王刚', status: '已发布', summary: '主要设备供应商的资质、能力与报价对比。' },
    { id: 'demo-know-004', title: '设备选型方案', category: '技术方案', fileName: '设备选型方案_草稿.pdf', author: '技术组', status: '草稿', summary: '核心设备参数、兼容性与成本估算。' },
  ],
}
