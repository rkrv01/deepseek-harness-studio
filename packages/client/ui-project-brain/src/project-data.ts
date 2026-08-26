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

export interface ProjectBrainCopilotData {
  readonly projectName: string
  readonly progress: number
  readonly permissionMode: string
  readonly trackingItems: readonly { readonly id: string; readonly title: string; readonly owner: string; readonly status: string; readonly description: string }[]
  readonly discoveries: { readonly highRisks: number; readonly abnormalTasks: number; readonly dueSoon: number; readonly coordination: number }
  readonly decisions: readonly { readonly id: string; readonly title: string; readonly reason: string; readonly owner: string; readonly due: string }[]
  readonly nextPlan: readonly string[]
}

export interface ProjectBrainMyDayData {
  readonly date: string
  readonly owner: string
  readonly role: string
  readonly focusMinutes: number
  readonly summary: { readonly urgent: number; readonly today: number; readonly meetings: number; readonly waiting: number }
  readonly tasks: readonly {
    readonly id: string
    readonly title: string
    readonly project: string
    readonly due: string
    readonly priority: '紧急' | '今日' | '会议' | '等待'
    readonly group: string
    readonly reason: string
    readonly detail: string
    readonly primaryAction: string
  }[]
  readonly waiting: readonly { readonly id: string; readonly title: string; readonly owner: string; readonly since: string }[]
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

/** Visual dashboard data for the AI project-copilot scenario. */
export const PROJECT_BRAIN_COPILOT_DEMO: ProjectBrainCopilotData = {
  projectName: PROJECT_BRAIN_PLAN.project.name,
  progress: PROJECT_BRAIN_PLAN.project.progress,
  permissionMode: '辅助执行模式',
  trackingItems: [
    { id: 'copilot-track-1', title: '设备采购交付', owner: '王刚', status: '高风险', description: '第二批安防摄像头预计延期 2 周，已影响系统集成测试窗口。' },
    { id: 'copilot-track-2', title: '最小测试环境', owner: '刘洋', status: '需跟进', description: '服务器资源已批复，但机房改造仍需确认现场时间。' },
    { id: 'copilot-track-3', title: '能耗模块变更', owner: '张明', status: '待决策', description: '甲方新增需求预计带来 15% 工作量，需要确认变更边界。' },
  ],
  discoveries: { highRisks: 1, abnormalTasks: 2, dueSoon: 4, coordination: 3 },
  decisions: [
    { id: 'copilot-decision-1', title: '是否启用备选供应商', reason: '采购延期是当前最大风险，需在供应商报价到齐后确定切换策略。', owner: '张明', due: '今天 16:00 前' },
    { id: 'copilot-decision-2', title: '是否压缩集成测试批次', reason: '测试环境延迟会挤压联调窗口，需要决定是否先保障安防链路。', owner: '刘洋', due: '明天 10:00 前' },
    { id: 'copilot-decision-3', title: '能耗模块是否纳入本期', reason: '新增范围可能影响成本与验收口径，需要甲方与集团统一意见。', owner: '张明', due: '本周五前' },
  ],
  nextPlan: ['16:00 跟进备选供应商报价与交期承诺', '明早自动检查 demo-sub-006 集成任务阻塞状态', '周五生成托管周报草稿并标出需协调事项'],
}

/** Personal workbench data for the "what should I do today" scenario. */
export const PROJECT_BRAIN_MY_DAY_DEMO: ProjectBrainMyDayData = {
  date: '2026 年 8 月 26 日',
  owner: '张明',
  role: '项目负责人',
  focusMinutes: 360,
  summary: { urgent: 2, today: 2, meetings: 1, waiting: 1 },
  tasks: [
    { id: 'today-1', title: '确认安防摄像头备选供应商', project: PROJECT_BRAIN_PLAN.project.name, due: '10:30 前', priority: '紧急', group: '紧急处理', reason: '采购延期已影响系统集成关键路径', detail: '排在第一是因为它直接决定第二批设备能否按新计划到货，若今天不确认，系统集成测试窗口会继续被压缩。', primaryAction: '打开任务' },
    { id: 'today-2', title: '推动最小测试环境今日可用', project: PROJECT_BRAIN_PLAN.project.name, due: '12:00 前', priority: '紧急', group: '紧急处理', reason: '测试环境延迟会放大采购延期影响', detail: '它排在第二，因为服务器资源已批复，只差现场改造时间确认，今天推进能为安防系统对接争取缓冲。', primaryAction: '催办协同' },
    { id: 'today-3', title: '审阅设备选型方案终稿', project: PROJECT_BRAIN_PLAN.project.name, due: '15:00 前', priority: '今日', group: '今日完成', reason: '明天采购决策会需要明确选型依据', detail: '这项不是最高风险，但会影响供应商评估质量，适合安排在上午阻塞事项处理后完成。', primaryAction: '查看资料' },
    { id: 'today-4', title: '更新采购延期风险缓解措施', project: PROJECT_BRAIN_PLAN.project.name, due: '下班前', priority: '今日', group: '今日完成', reason: '风险等级已升高，需要同步台账口径', detail: '风险处置措施需要跟随会议结论更新，便于明天自动生成周报和托管提醒。', primaryAction: '更新风险' },
    { id: 'today-5', title: '参加供应商协调会', project: PROJECT_BRAIN_PLAN.project.name, due: '14:00', priority: '会议', group: '今日会议', reason: '确认备选供应商报价、交期和违约责任', detail: '会议安排在下午，前置工作是先拿到备选供应商基本信息；会议后会自动沉淀行动项。', primaryAction: '查看会议' },
    { id: 'today-6', title: '等待甲方确认能耗模块变更范围', project: PROJECT_BRAIN_PLAN.project.name, due: '待反馈', priority: '等待', group: '等待反馈', reason: '变更范围未确认前不建议投入详细设计', detail: '这项暂不建议主动开工，只需发送一次提醒并等待甲方明确是否纳入本期验收。', primaryAction: '发送提醒' },
  ],
  waiting: [
    { id: 'wait-1', title: '甲方确认能耗模块变更范围', owner: '甲方项目办', since: '已等待 2 天' },
  ],
}

/** Mock meeting minutes text simulating the 5th weekly project meeting. */
export const MEETING_MINUTES_TEXT = `智慧园区项目第5次周例会会议纪要

会议时间：2026-08-22 14:00-15:30
会议地点：智算科技 3F 会议室A
主持人：张明
参会人员：张明、王刚、赵雪、刘洋、陈涛、李华（供应商代表）

会议内容：

一、上周工作回顾
1. 设备采购方面：安防摄像头首批设备已完成出厂检测，预计下周到货。门禁系统设备采购已签订合同，正在排产中。
2. 系统集成方面：安防系统与平台对接已完成接口联调，正在进行数据联调测试，预计本周完成。
3. 方案设计方面：智能化建设方案评审已完成，实施方案已通过审核确认。

二、重点讨论事项

1. 设备采购延期问题
王刚汇报：安防摄像头供应商反馈，由于近期原材料价格上涨，第二批设备交付可能延迟2周，预计9月中旬才能到货。
讨论：张明指出，到货延迟将直接影响系统集成测试进度，需要尽快确定备选方案。
决定：启动备选供应商评估，由王刚负责，本周内完成至少两家备选供应商的资质审核和报价对比。

2. 测试环境搭建
刘洋汇报：服务器资源申请已获批，但机房改造尚未完成，预计9月5日才能投入使用。
讨论：赵雪建议可以先在现有测试服务器上搭建最小可用环境，不影响集成测试进度。
决定：刘洋负责在本周内搭建最小测试环境，优先保障安防系统对接测试。

3. 能耗监测模块需求变更
张明反馈：甲方正式提出新增园区能耗监测模块需求，要求纳入本次项目建设范围。
讨论：经评估，新增模块预计增加15%的工作量，工期延长约1个月。需要启动变更管理流程。
决定：由张明负责与甲方沟通变更范围、成本和时间影响，下周三前提交变更申请。

4. 供应商资质问题
王刚补充：在供应商评估过程中发现，备选供应商之一的"华信科技"提供的认证文件不完整，缺少ISO9001认证。
讨论：建议要求华信科技限期补充，同时启动第三家供应商的评估作为备选。
决定：王刚负责通知华信科技补充认证材料，期限为8月28日；同时启动对"鼎信科技"的评估。

三、风险更新
1. 设备采购延期风险：已由中风险升级为高风险，启动备选方案后有望缓解。
2. 测试环境延迟风险：通过搭建最小环境可降低影响，维持中风险等级。
3. 新增需求变更风险：评估中，待变更申请确认后更新风险等级。

四、行动事项汇总
1. 王刚：完成备选供应商评估，提交评估报告 — 截止8月28日
2. 王刚：通知华信科技补充认证材料 — 截止8月25日
3. 王刚：启动鼎信科技资质评估 — 截止8月28日
4. 刘洋：搭建最小测试环境 — 截止8月25日
5. 张明：拟定变更申请，与甲方沟通 — 截止9月2日
6. 赵雪：完成设备选型方案终稿 — 截止8月28日
7. 陈涛：准备验收文档模板 — 截止8月30日`

/** Subtask of a meeting action item. */
export interface ProjectBrainMeetingSubtask {
  readonly id: string
  readonly title: string
  readonly owner: string
  readonly dueDate: string
}

/** Action item identified from meeting minutes. */
export interface ProjectBrainMeetingActionItem {
  readonly id: string
  readonly type: 'new-task' | 'update-task' | 'new-risk'
  readonly title: string
  readonly description: string
  readonly owner: string
  readonly dueDate: string
  readonly relatedTaskId?: string
  /** Source quotation from the meeting minutes. */
  readonly source: string
  readonly subtasks: readonly ProjectBrainMeetingSubtask[]
}

/** AI analysis result for a meeting. */
export interface ProjectBrainMeetingAnalysis {
  readonly meetingTitle: string
  readonly meetingDate: string
  readonly duration: string
  readonly location: string
  readonly host: string
  readonly attendees: readonly string[]
  readonly summary: string
  readonly agendaItems: readonly { readonly topic: string; readonly presenter: string; readonly outcome: string }[]
  readonly keyDecisions: readonly { readonly decision: string; readonly decidedBy: string; readonly rationale: string }[]
  readonly actionItems: readonly ProjectBrainMeetingActionItem[]
  readonly stats: { readonly newTasks: number; readonly updateTasks: number; readonly newRisks: number }
}

/** Mock meeting analysis result for the 5th weekly meeting. */
export const MEETING_ANALYSIS_MOCK: ProjectBrainMeetingAnalysis = {
  meetingTitle: '智慧园区项目第5次周例会',
  meetingDate: '2026-08-22 14:00',
  duration: '90 分钟',
  location: '智算科技 3F 会议室A',
  host: '张明',
  attendees: ['张明', '王刚', '赵雪', '刘洋', '陈涛', '李华'],
  summary: '本次会议重点讨论了设备采购延期、测试环境搭建、能耗监测模块需求变更等核心议题，共识别出 7 项行动事项和 2 项风险更新。',
  agendaItems: [
    { topic: '上周工作回顾', presenter: '张明', outcome: '确认各模块进展，设备采购首批已到货，方案设计已完成评审。' },
    { topic: '设备采购延期问题', presenter: '王刚', outcome: '启动备选供应商评估，要求本周内完成资质审核和报价对比。' },
    { topic: '测试环境搭建', presenter: '刘洋', outcome: '决定先搭建最小可用环境，优先保障安防系统对接测试。' },
    { topic: '能耗监测模块需求变更', presenter: '张明', outcome: '启动变更管理流程，下周三前提交变更申请。' },
    { topic: '供应商资质问题', presenter: '王刚', outcome: '要求华信科技限期补充认证，同时启动鼎信科技评估。' },
  ],
  keyDecisions: [
    { decision: '启动备选供应商评估', decidedBy: '张明', rationale: '原材料价格上涨导致第二批交付延迟2周，需尽快确定备选方案降低风险。' },
    { decision: '搭建最小测试环境', decidedBy: '张明', rationale: '机房改造未完成，先在现有服务器上搭建最小环境不影响集成测试进度。' },
    { decision: '启动变更管理流程', decidedBy: '张明', rationale: '甲方正式提出新增能耗监测模块，需评估范围、成本与时间影响后提交变更申请。' },
    { decision: '启动鼎信科技评估', decidedBy: '张明', rationale: '华信科技认证文件不完整，需引入第三家供应商作为备选。' },
  ],
  actionItems: [
    { id: 'mtg-new-001', type: 'new-task', title: '完成备选供应商评估', description: '对至少两家备选供应商进行资质审核和报价对比，提交评估报告。', owner: '王刚', dueDate: '2026-08-28', source: '启动备选供应商评估，由王刚负责，本周内完成至少两家备选供应商的资质审核和报价对比。', subtasks: [
      { id: 'mtg-new-001-st-01', title: '收集备选供应商资质文件', owner: '王刚', dueDate: '2026-08-24' },
      { id: 'mtg-new-001-st-02', title: '开展报价对比分析', owner: '王刚', dueDate: '2026-08-26' },
      { id: 'mtg-new-001-st-03', title: '提交供应商评估报告', owner: '王刚', dueDate: '2026-08-28' },
    ] },
    { id: 'mtg-new-002', type: 'new-task', title: '搭建最小测试环境', description: '在现有测试服务器上搭建最小可用环境，优先保障安防系统对接测试。', owner: '刘洋', dueDate: '2026-08-25', source: '刘洋负责在本周内搭建最小测试环境，优先保障安防系统对接测试。', subtasks: [
      { id: 'mtg-new-002-st-01', title: '部署测试服务器基础环境', owner: '刘洋', dueDate: '2026-08-23' },
      { id: 'mtg-new-002-st-02', title: '完成安防系统对接联调', owner: '刘洋', dueDate: '2026-08-25' },
    ] },
    { id: 'mtg-new-003', type: 'new-task', title: '拟定变更申请并与甲方沟通', description: '与甲方沟通能耗监测模块变更范围、成本和时间影响，提交变更申请。', owner: '张明', dueDate: '2026-09-02', source: '由张明负责与甲方沟通变更范围、成本和时间影响，下周三前提交变更申请。', subtasks: [
      { id: 'mtg-new-003-st-01', title: '测算变更成本与工期影响', owner: '张明', dueDate: '2026-08-27' },
      { id: 'mtg-new-003-st-02', title: '与甲方召开变更沟通会', owner: '张明', dueDate: '2026-08-29' },
      { id: 'mtg-new-003-st-03', title: '提交正式变更申请单', owner: '张明', dueDate: '2026-09-02' },
    ] },
    { id: 'mtg-new-004', type: 'new-task', title: '完成设备选型方案终稿', description: '根据评审意见完成设备选型方案终稿。', owner: '赵雪', dueDate: '2026-08-28', source: '赵雪：完成设备选型方案终稿 — 截止8月28日', subtasks: [
      { id: 'mtg-new-004-st-01', title: '汇总评审意见并修订方案', owner: '赵雪', dueDate: '2026-08-26' },
      { id: 'mtg-new-004-st-02', title: '输出设备选型方案终稿', owner: '赵雪', dueDate: '2026-08-28' },
    ] },
    { id: 'mtg-new-005', type: 'new-task', title: '准备验收文档模板', description: '启动验收文档编写工作，准备验收文档模板和编写规范。', owner: '陈涛', dueDate: '2026-08-30', source: '陈涛：准备验收文档模板 — 截止8月30日', subtasks: [
      { id: 'mtg-new-005-st-01', title: '制定验收文档编写规范', owner: '陈涛', dueDate: '2026-08-27' },
      { id: 'mtg-new-005-st-02', title: '输出验收文档模板', owner: '陈涛', dueDate: '2026-08-30' },
    ] },
    { id: 'mtg-upd-001', type: 'update-task', title: '调整安防摄像头采购到货时间', description: '由于供应商产能问题，第二批设备交付时间由原计划9月初调整为9月中旬。', owner: '王刚', dueDate: '2026-09-15', relatedTaskId: 'demo-sub-001', source: '安防摄像头供应商反馈，由于近期原材料价格上涨，第二批设备交付可能延迟2周，预计9月中旬才能到货。', subtasks: [
      { id: 'mtg-upd-001-st-01', title: '与供应商确认新交付计划', owner: '王刚', dueDate: '2026-08-24' },
      { id: 'mtg-upd-001-st-02', title: '更新采购任务排期', owner: '王刚', dueDate: '2026-08-25' },
    ] },
    { id: 'mtg-risk-001', type: 'new-risk', title: '设备采购延期风险升级', description: '安防摄像头供应商产能不足，第二批交付延迟2周，已由中风险升级为高风险。', owner: '王刚', dueDate: '2026-09-15', relatedTaskId: 'demo-sub-003', source: '设备采购延期风险：已由中风险升级为高风险，启动备选方案后有望缓解。', subtasks: [
      { id: 'mtg-risk-001-st-01', title: '登记风险升级并通知干系人', owner: '王刚', dueDate: '2026-08-23' },
      { id: 'mtg-risk-001-st-02', title: '跟踪备选供应商落地情况', owner: '王刚', dueDate: '2026-09-15' },
    ] },
  ],
  stats: { newTasks: 5, updateTasks: 1, newRisks: 1 },
}
