/** Shared deterministic project data and rich replies for the Project Brain demo. */

import { PROJECT_BRAIN_COPILOT_DEMO, PROJECT_BRAIN_MY_DAY_DEMO, PROJECT_BRAIN_PLAN, MEETING_ANALYSIS_MOCK, MEETING_MINUTES_TEXT } from '@deepseek-ai/dsh-client-ui-project-brain/src/project-data.ts'
import type { ProjectBrainPlanData, ProjectBrainMeetingAnalysis, ProjectBrainMeetingActionItem } from '@deepseek-ai/dsh-client-ui-project-brain/src/project-data.ts'
import { matchProjectBrainScenario, parseProjectBrainScenarioPayload, projectBrainScenarioPayload, projectBrainSurfacePayload } from '@deepseek-ai/dsh-client-ui-project-brain/src/scenario-registry.ts'
import type { ProjectBrainScenarioId } from '@deepseek-ai/dsh-client-ui-project-brain/src/scenario-registry.ts'
import { DEFAULT_PLATFORM_BASE_URL } from '@deepseek-ai/dsh-client-ui-project-brain/src/client/platform-config.ts'

export type ProjectBrainReplyKind = 'launch-plan' | 'launch-receipt' | 'platform-retry' | 'meeting-analysis' | 'meeting-receipt' | 'executive-briefing' | 'briefing-receipt' | 'handoff' | 'note' | 'fallback'

/** Runtime-configured platform origin the deterministic replies derive links from. */
let platformBase = DEFAULT_PLATFORM_BASE_URL

/** Install the configured platform origin (settings-backed); pass nothing to restore the default. */
export function setDemoPlatformBase(base: string | undefined): void {
  platformBase = base === undefined || base === '' ? DEFAULT_PLATFORM_BASE_URL : base
}

/** @returns the currently configured platform origin. */
export function demoPlatformBaseUrl(): string {
  return platformBase
}

export interface ProjectBrainReply { readonly kind: ProjectBrainReplyKind; readonly text: string; readonly scenarioId?: ProjectBrainScenarioId }
export { PROJECT_BRAIN_PLAN, MEETING_ANALYSIS_MOCK, MEETING_MINUTES_TEXT }
export type { ProjectBrainPlanData, ProjectBrainMeetingAnalysis, ProjectBrainMeetingActionItem }

/** Serialize a revision as an invisible payload carried by the native user message. */
export function projectPlanRevisionPayload(plan: ProjectBrainPlanData): string { return encodeURIComponent(JSON.stringify(plan)) }
/** Serialize edited meeting action items as an invisible payload carried by the native user message. */
export function meetingRevisionPayload(items: readonly ProjectBrainMeetingActionItem[]): string { return encodeURIComponent(JSON.stringify(items)) }

/** Resolve one user prompt to a deterministic, tool-free demo response. */
export function resolveProjectBrainReply(prompt: string): ProjectBrainReply {
  if (prompt.includes('<!-- project-brain:retry-platform -->')) return { kind: 'platform-retry', text: '' }
  const envelope = parseProjectBrainScenarioPayload<ProjectBrainPlanData | readonly ProjectBrainMeetingActionItem[] | unknown>(prompt)
  if (envelope?.scenarioId === 'project-launch' && envelope.action === 'confirm') return { kind: 'launch-receipt', text: launchReceipt(envelope.payload as ProjectBrainPlanData) }
  if (envelope?.scenarioId === 'project-launch' && envelope.action === 'revision') return { kind: 'launch-plan', text: launchPlan(envelope.payload as ProjectBrainPlanData, true) }
  if (envelope?.scenarioId === 'meeting-actions' && envelope.action === 'confirm') return { kind: 'meeting-receipt', text: meetingReceipt(envelope.payload as readonly ProjectBrainMeetingActionItem[]) }
  if (envelope?.scenarioId === 'meeting-actions' && envelope.action === 'revision') return { kind: 'meeting-analysis', text: meetingAnalysis(envelope.payload as readonly ProjectBrainMeetingActionItem[], true) }
  if (envelope?.scenarioId === 'executive-briefing' && envelope.action === 'confirm') {
    const materials = extractBriefingMaterials(envelope.payload)
    return { kind: 'briefing-receipt', text: executiveBriefingReceipt(materials) }
  }
  const confirmation = parsePlanPayload(prompt, 'confirm')
  if (confirmation !== null) return { kind: 'launch-receipt', text: launchReceipt(confirmation) }
  const revision = parseRevision(prompt)
  if (revision !== null) return { kind: 'launch-plan', text: launchPlan(revision, true) }
  if (prompt.includes('<!-- project-brain:meeting-confirm -->') || /确认执行会议方案/u.test(prompt)) return { kind: 'meeting-receipt', text: meetingReceipt(MEETING_ANALYSIS_MOCK.actionItems) }
  const meetingRevision = parseMeetingRevision(prompt)
  if (meetingRevision !== null) return { kind: 'meeting-analysis', text: meetingAnalysis(meetingRevision, true) }
  if (/确认|创建项目|按当前方案/u.test(prompt) && /项目/u.test(prompt)) return { kind: 'launch-receipt', text: launchReceipt(PROJECT_BRAIN_PLAN) }
  if (/为什么(不是|不先做?)是?先?做?设备选型/u.test(prompt) || /为什么.*设备选型.*排.*(后|不)/u.test(prompt)) {
    return { kind: 'note', text: '设备选型方案虽然今天需要完成，但当前不会立即阻塞其他任务。相比之下，供应商确认已经影响关键路径，并且有 2 项后续任务在等待结果，因此我把供应商确认排在前面。如果你仍想调整顺序，告诉我即可。' }
  }
  if (/(我想|我要|可以)?先做设备选型|按我的偏好调整顺序/u.test(prompt)) {
    return { kind: 'note', text: '可以，这样不会立即造成新的项目风险。不过供应商确认目前仍然影响关键路径，建议今天不要遗漏。需要的话，我可以按你的偏好重新调整今天的排序。' }
  }
  const scenario = matchProjectBrainScenario(prompt)
  if (scenario?.id === 'meeting-actions') return { kind: 'meeting-analysis', text: meetingAnalysis() }
  if (scenario?.id === 'project-copilot') return { kind: 'handoff', scenarioId: 'project-copilot', text: projectCopilotSurface() }
  if (scenario?.id === 'my-day' || /今天.*干什么|今日事项/u.test(prompt)) return { kind: 'handoff', scenarioId: 'my-day', text: myDaySurface() }
  if (scenario?.id === 'executive-briefing') return { kind: 'executive-briefing', scenarioId: 'executive-briefing', text: executiveBriefingDocument() }
  if (scenario?.id === 'project-launch') return { kind: 'launch-plan', text: launchPlan(PROJECT_BRAIN_PLAN, false) }
  return { kind: 'fallback', text: '我可以继续围绕这个项目协助你：启动项目、整理会议纪要、查看项目现状、安排今日工作，或准备集团领导汇报。' }
}

function parseRevision(prompt: string): ProjectBrainPlanData | null {
  return parsePlanPayload(prompt, 'revision')
}

function parseMeetingRevision(prompt: string): readonly ProjectBrainMeetingActionItem[] | null {
  const match = /<!-- project-brain:meeting-revision ([\s\S]*?) -->/u.exec(prompt)
  if (match?.[1] === undefined) return null
  try {
    const value = JSON.parse(decodeURIComponent(match[1])) as readonly ProjectBrainMeetingActionItem[]
    return Array.isArray(value) ? value : null
  } catch { return null }
}

function parsePlanPayload(prompt: string, marker: 'revision' | 'confirm'): ProjectBrainPlanData | null {
  const match = new RegExp(`<!-- project-brain:${marker} ([\\s\\S]*?) -->`, 'u').exec(prompt)
  if (match?.[1] === undefined) return null
  try {
    const value = JSON.parse(decodeURIComponent(match[1])) as Partial<ProjectBrainPlanData>
    return value.project !== undefined && Array.isArray(value.stages) && Array.isArray(value.tasks) && Array.isArray(value.risks) && Array.isArray(value.knowledgeFolders) ? value as ProjectBrainPlanData : null
  } catch { return null }
}

function launchPlan(plan: ProjectBrainPlanData, revised: boolean): string {
  const p = plan.project
  const stages = plan.stages.map(stage => `| ${stage.name} | ${dateRange(stage.startDate, stage.endDate)} | ${stage.owner} | ${stage.deliverable} |`).join('\n')
  const tasks = plan.tasks.map(task => `| ${task.id} | ${task.title} | ${task.owner} | ${dateRange(task.startDate, task.endDate)} | ${task.dependency} |`).join('\n')
  const risks = plan.risks.map(risk => `| ${risk.title} | ${risk.type} | ${risk.owner} | ${risk.description} | ${risk.level} | ${risk.mitigation} |`).join('\n')
  const flow = plan.stages.map((stage, index) => `${index === 0 ? '' : ` --> S${index + 1}`}S${index + 1}[${stage.name}\\n${stage.startDate.slice(0, 7)}]`).join('')
  const gantt = plan.tasks.map((task, index) => `    ${task.title} :${index === 0 ? 'done, ' : ''}t${index + 1}, ${task.startDate}, ${task.endDate}`).join('\n')
  const folderRows = plan.knowledgeFolders.map((folder, index) => `${index === plan.knowledgeFolders.length - 1 ? '└' : '├'}── ${String(index + 1).padStart(2, '0')}-${folder}`).join('\n')
  const meetingActions = plan.meeting.actions.map(action => `- **${action.title}** · ${action.owner} · 截止 ${action.dueDate}`).join('\n')
  const knowledgeDocuments = plan.knowledgeDocuments.map(document => `| ${document.title} | ${document.category} | ${document.fileName} | ${document.author} | ${document.status} |`).join('\n')
  return `${revised ? '我已结合这次调整重新整理项目方案，以下内容将作为项目智脑中的最新项目方案。' : '已识别到一个正在推进的园区建设项目。我会先归集当前项目资料、进度、风险与协同事项，再将它初始化到项目智脑平台。'}\n\n<!-- project-brain:launch-plan -->\n# 🚀 项目导入与初始化方案：${p.name}\n\n## 📊 执行摘要\n\n| 项目周期 | 当前进度 | 演示预算 | 项目负责人 | 当前风险 |\n|---|---:|---:|---|---|\n| ${dateRange(p.startDate, p.endDate)} | ${p.progress}% | ¥${formatBudget(p.budget)} | ${p.owner} | 高风险 ${plan.risks.filter(risk => risk.level === '高').length} 项 |\n\n> ${p.summary}\n\n> 预算为演示补充数据；项目资料、任务、会议、风险与知识信息已按当前项目快照归集。\n\n## 🎯 项目目标\n\n${p.goal}\n\n## 🗺️ 阶段规划\n\n\`\`\`mermaid\ngraph LR\n    ${flow}\n\`\`\`\n\n| 阶段 | 时间 | 负责人 | 关键交付物 |\n|---|---|---|---|\n${stages}\n\n## 💰 预算构成\n\n\`\`\`mermaid\npie title 预算构成（万元）\n    "智能设备与物联接入" : ${Math.round(p.budget * 0.35 / 10_000)}\n    "平台软件与数据中台" : ${Math.round(p.budget * 0.30 / 10_000)}\n    "实施集成与现场服务" : ${Math.round(p.budget * 0.20 / 10_000)}\n    "安全与运维保障" : ${Math.round(p.budget * 0.10 / 10_000)}\n    "项目预备费" : ${Math.round(p.budget * 0.05 / 10_000)}\n\`\`\`\n\n## 📅 关键路径与里程碑\n\n\`\`\`mermaid\ngantt\n    title ${p.name}关键路径\n    dateFormat YYYY-MM-DD\n    axisFormat %m/%d\n${gantt}\n\`\`\`\n\n## 📝 当前任务分解\n\n| 编号 | 任务 | 负责人 | 时间 | 前置依赖 |\n|---|---|---|---|---|\n${tasks}\n\n## ⚠️ 当前风险\n\n| 风险 | 类型 | 负责人 | 风险描述 | 等级 | 应对措施 |\n|---|---|---|---|---|---|\n${risks}\n\n## 🗓️ 最新会议与待落实事项\n\n**${plan.meeting.title}** · ${plan.meeting.date} · 主持人：${plan.meeting.host}\n\n${plan.meeting.summary}\n\n${meetingActions}\n\n## 📁 项目知识空间\n\n\`\`\`text\n${p.name}/\n${folderRows}\n\`\`\`\n\n## 📚 已归集知识资料\n\n| 资料 | 分类 | 文件 | 维护人 | 状态 |\n|---|---|---|---|---|\n${knowledgeDocuments}\n\n如需调整方案内容，可在本消息底部点击"编辑项目方案"。`
}

function dateRange(startDate: string, endDate: string): string { return `${startDate} 至 ${endDate}` }
function formatBudget(budget: number): string { return budget >= 10_000 ? `${(budget / 10_000).toLocaleString('zh-CN')} 万` : budget.toLocaleString('zh-CN') }
function launchReceipt(plan: ProjectBrainPlanData): string { return `收到，开始按当前方案完成项目初始化。\n\n## 项目初始化进度\n\n1. ✓ 创建项目管理空间\n2. ✓ 初始化阶段与项目计划\n3. ✓ 建立任务、责任关系与风险台账\n4. ✓ 配置项目知识空间与协同规则\n\n## 项目已就绪\n\n**${plan.project.name}**\n\n- ${plan.stages.length} 个项目阶段 · ${plan.tasks.length} 项任务 · ${plan.risks.length} 项初始风险\n- 项目负责人：${plan.project.owner}\n- [进入项目智脑平台](${demoPlatformBaseUrl()}/business-xmzn/#/projectAdmin)` }

/** Generate a deterministic meeting analysis report, optionally from edited action items. */
function meetingAnalysis(editedItems?: readonly ProjectBrainMeetingActionItem[], revised = false): string {
  const a = MEETING_ANALYSIS_MOCK
  const actionItems = editedItems ?? a.actionItems
  const stats = editedItems
    ? {
      newTasks: editedItems.filter(i => i.type === 'new-task').length,
      updateTasks: editedItems.filter(i => i.type === 'update-task').length,
      newRisks: editedItems.filter(i => i.type === 'new-risk').length,
    }
    : a.stats
  const items = actionItems.map((item) => {
    const tag = item.type === 'new-task' ? '🔵 新建任务' : item.type === 'update-task' ? '🟢 更新任务' : '🟠 新增风险'
    const related = item.relatedTaskId !== undefined ? `\n  - 关联任务：\`${item.relatedTaskId}\`` : ''
    const source = item.source ? `\n- **会议原文**：\n  > ${item.source}` : ''
    return `### ${tag}：${item.title}\n\n- **负责人**：${item.owner}\n- **截止时间**：${item.dueDate}\n- **说明**：${item.description}${related}${source}`
  }).join('\n\n---\n\n') + `\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('meeting-actions', 'revision', actionItems)} -->`

  const agendaTimeline = a.agendaItems.map((item, i) => `    A${i + 1}[${item.topic}\\n${item.presenter}]`).join(' --> ')
  const decisionsTable = a.keyDecisions.map(d => `| ${d.decision} | ${d.decidedBy} | ${d.rationale} |`).join('\n')

  return `${revised ? '我已结合这次调整重新生成会议任务拆解，以下内容将作为最新的执行基线。' : ''}${revised ? '\n\n' : ''}<!-- project-brain:meeting-analysis -->\n## 📋 会议纪要分析报告\n\n### 会议概览\n\n| 项目 | 内容 |\n|---|---|\n| 会议名称 | ${a.meetingTitle} |\n| 会议时间 | ${a.meetingDate} |\n| 会议时长 | ${a.duration} |\n| 会议地点 | ${a.location} |\n| 主持人 | ${a.host} |\n| 参会人员 | ${a.attendees.join('、')} |\n\n${a.summary}\n\n### 会议议题流程\n\n\`\`\`mermaid\ngraph LR\n    ${agendaTimeline}\n\`\`\`\n\n| 议题 | 汇报人 | 结论 |\n|---|---|---|\n${a.agendaItems.map(item => `| ${item.topic} | ${item.presenter} | ${item.outcome} |`).join('\n')}\n\n### 会议决议\n\n| 决议内容 | 决策人 | 决策依据 |\n|---|---|---|\n${decisionsTable}\n\n### 行动事项识别结果\n\n| 类型 | 数量 |\n|:---|---:|\n| 🔵 新建任务 | ${stats.newTasks} 项 |\n| 🟢 更新已有任务 | ${stats.updateTasks} 项 |\n| 🟠 新增风险 | ${stats.newRisks} 项 |\n\n<!-- project-brain:meeting-plan -->\n\n### 智能去重分析\n\n已对会议事项与项目现有任务进行比对：\n\n- **安防摄像头采购**（demo-sub-001）：已有任务正处于"进行中"状态，本次会议涉及的到货时间调整将更新该任务的截止时间，不创建重复任务。\n- **设备采购延期风险**（demo-risk-001）：已有风险记录，本次会议将风险等级由中风险升级为高风险，更新风险状态。\n- 其余 ${stats.newTasks} 项为新增行动事项，与现有任务无冲突，将创建新任务。\n\n### 逐项详情\n\n${items}`
}

/** Generate a deterministic meeting execution receipt. */
function meetingReceipt(items: readonly ProjectBrainMeetingActionItem[]): string {
  const newTasks = items.filter(item => item.type === 'new-task').length
  const updatedTasks = items.filter(item => item.type === 'update-task').length
  const newRisks = items.filter(item => item.type === 'new-risk').length
  return `收到，开始按会议分析结果执行。\n\n## 执行进度\n\n1. ✓ 已创建 ${newTasks} 项新任务，分配负责人与截止时间\n2. ✓ 已更新 ${updatedTasks} 项已有任务\n3. ✓ 已新增 ${newRisks} 项风险\n4. ✓ 已配置任务到期提醒与负责人通知\n\n## 执行完成\n\n**本次会议共处理 ${items.length} 项行动事项**\n\n- 📋 新建任务：${newTasks} 项\n- 🔄 更新任务：${updatedTasks} 项\n- ⚠️ 新增风险：${newRisks} 项\n\n> 已创建的任务将在截止日前自动提醒负责人，风险状态已同步至项目风险台账。\n\n<!-- project-brain:meeting-executed -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('meeting-actions', 'confirm', items)} -->`
}

function myDaySurface(): string {
  return `我已经结合你当前参与的项目、任务截止时间、风险、依赖关系和协作等待情况，把今天最值得推进的 6 件事排好了。\n\n其中 2 件需要优先处理，1 件正在影响后续任务，另外有 1 项在等你反馈。\n\n<!-- project-brain:surface ${projectBrainSurfacePayload('my-day', 'my-day-workbench', PROJECT_BRAIN_MY_DAY_DEMO)} -->`
}

/** The AI manager wrap-up as visible markdown so it streams as an ordinary assistant reply. */
function copilotNarrativeText(): string {
  const narrative = PROJECT_BRAIN_COPILOT_DEMO.aiNarrative
  return [
    '## AI 项目经理小结',
    '',
    '**目前最需要关注 3 件事：**',
    '',
    ...narrative.focus.map((item, index) => `${index + 1}. ${item}`),
    '',
    '**我已经做了这些处理：**',
    '',
    ...narrative.executed.map(item => `- ${item}`),
    '',
    `**目前只有 1 件事需要你确认：**${narrative.needDecision}`,
    '',
    `**接下来我会继续：**${narrative.next}`,
  ].join('\n')
}

function projectCopilotSurface(): string {
  // The wrap-up is ordinary reply text; the board mounts beneath it from the surface marker.
  return `${copilotNarrativeText()}\n\n<!-- project-brain:surface ${projectBrainSurfacePayload('project-copilot', 'project-copilot-dashboard', PROJECT_BRAIN_COPILOT_DEMO)} -->`
}

function executiveBriefingDocument(): string {
  const p = PROJECT_BRAIN_PLAN.project
  const highRisk = PROJECT_BRAIN_PLAN.risks.find(risk => risk.level === '高') ?? { title: '关键风险待确认', impact: '需要在下一次项目例会中确认影响范围。' }
  const completedTasks = PROJECT_BRAIN_PLAN.tasks.filter(task => task.progress === 100)
  const delayedTasks = PROJECT_BRAIN_PLAN.tasks.filter(task => task.progress < 40 && task.endDate <= '2026-09-30')
  const stageRows = PROJECT_BRAIN_PLAN.stages.map(stage => `| ${stage.name} | ${dateRange(stage.startDate, stage.endDate)} | ${stage.owner} | ${stage.deliverable} |`).join('\n')
  const pptOutline = ['项目总体情况与当前进度', '本阶段已完成成果', '关键偏差与采购延期风险', '需集团协调事项', '下一阶段计划与保障措施'].map((item, index) => `${index + 1}. ${item}`).join('\n')
  const payload = { projectId: p.id, projectName: p.name, progress: p.progress, generatedAt: '2026-08-26' }
  return `我会按集团领导最关心的口径整理：先给结论，再讲进展、偏差、风险和需要协调的事项。\n\n<!-- project-brain:executive-briefing -->\n# 项目阶段汇报材料：${p.name}\n\n## 领导摘要\n\n${p.name}当前整体进度 **${p.progress}%**。方案设计已完成，设备采购与系统集成正在并行推进，项目总体仍可控；当前最大风险是**${highRisk.title}**，预计会对系统集成测试造成约 2 周影响。\n\n| 汇报重点 | 当前判断 |\n|---|---|\n| 项目进度 | ${p.progress}%，已完成 ${completedTasks.length} 项关键任务 |\n| 当前偏差 | 设备采购延迟传导到系统集成测试窗口 |\n| 最大风险 | ${highRisk.title}：${highRisk.impact} |\n| 需集团协调 | 协调供应商资源与备选采购通道，明确延期责任与交付优先级 |\n\n## 项目进展\n\n| 阶段 | 周期 | 负责人 | 阶段成果 |\n|---|---|---|---|\n${stageRows}\n\n## 本阶段主要成果\n\n- 完成智慧园区建设方案评审与实施方案审核，形成项目实施基线。\n- 安防摄像头首批设备已完成出厂检测，门禁设备合同已签订并进入排产。\n- 安防系统与平台对接已启动，测试环境资源已批复，正在推进最小可用环境。\n- 已归集 ${PROJECT_BRAIN_PLAN.knowledgeDocuments.length} 份项目知识资料，覆盖技术方案、实施方案和供应商评估。\n\n## 偏差说明与风险措施\n\n- **采购延期**：第二批安防摄像头预计延迟 2 周，关联 ${delayedTasks.length} 项采购/集成任务。\n- **应对措施**：启动备选供应商评估，要求原供应商提供分批到货承诺，同时优先保障安防系统最小链路测试。\n- **管理动作**：将采购延期风险提升为高风险，纳入托管监测与周例会固定跟踪项。\n\n## 需集团协调事项\n\n1. 协调核心设备供应商释放优先产能，保障安防摄像头第二批交付。\n2. 明确能耗监测模块是否纳入本期范围，避免后续验收口径反复。\n3. 支持跨部门资源调度，确保测试环境和现场施工窗口不再互相等待。\n\n## 下一阶段计划\n\n- 8 月底前完成备选供应商评估、设备选型终稿和最小测试环境搭建。\n- 9 月推进设备到货验收、安防系统对接和采购延期风险闭环。\n- 10 月起进入验收资料准备和阶段性成果固化。\n\n## 5 分钟口头稿\n\n各位领导，本项目目前整体进度 45%，方案设计阶段已经完成，设备采购和系统集成正在并行推进。当前需要重点关注的是设备采购延期风险，第二批安防摄像头预计延迟 2 周，可能影响系统集成测试。项目组已经启动备选供应商评估，并同步推进最小测试环境，尽量把影响控制在局部。需要集团层面协助的是供应商资源协调、变更范围确认以及跨部门测试资源保障。\n\n## PPT 汇报提纲\n\n${pptOutline}\n\n确认后，我会把以上内容整理成汇报包，并保留为本次集团汇报的演示材料。\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', payload)} -->`
}

/** Collect valid material names from a briefing confirm payload. */
function extractBriefingMaterials(payload: unknown): readonly string[] {
  if (typeof payload !== 'object' || payload === null) return []
  const materials = (payload as { readonly materials?: unknown }).materials
  return Array.isArray(materials) ? materials.filter((name): name is string => typeof name === 'string') : []
}

function executiveBriefingReceipt(materials: readonly string[]): string {
  const list = materials.length > 0 ? materials.map(name => `- ${name}`).join('\n') : '- 领导摘要与进度说明\n- 5 分钟口头稿\n- PPT 汇报提纲'
  return `<!-- project-brain:executive-briefing-ready -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', { projectId: PROJECT_BRAIN_PLAN.project.id, projectName: PROJECT_BRAIN_PLAN.project.name, progress: PROJECT_BRAIN_PLAN.project.progress, materials })} -->\n## 所选材料已生成\n\n已按集团领导汇报口径整理完成：\n\n${list}\n\n后续可以继续补充口径，例如“更偏经营价值”或“压缩成 3 页 PPT”。`
}
