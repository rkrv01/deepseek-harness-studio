/** Shared deterministic project data and rich replies for the Project Brain demo. */

import { PROJECT_BRAIN_PLAN, MEETING_ANALYSIS_MOCK, MEETING_MINUTES_TEXT } from '@deepseek-ai/dsh-client-ui-project-brain/src/project-data.ts'
import type { ProjectBrainPlanData, ProjectBrainMeetingAnalysis, ProjectBrainMeetingActionItem } from '@deepseek-ai/dsh-client-ui-project-brain/src/project-data.ts'

export type ProjectBrainReplyKind = 'launch-plan' | 'launch-receipt' | 'platform-retry' | 'meeting-analysis' | 'meeting-receipt' | 'handoff' | 'fallback'

export interface ProjectBrainReply { readonly kind: ProjectBrainReplyKind; readonly text: string }
export { PROJECT_BRAIN_PLAN, MEETING_ANALYSIS_MOCK, MEETING_MINUTES_TEXT }
export type { ProjectBrainPlanData, ProjectBrainMeetingAnalysis, ProjectBrainMeetingActionItem }

/** Serialize a revision as an invisible payload carried by the native user message. */
export function projectPlanRevisionPayload(plan: ProjectBrainPlanData): string { return encodeURIComponent(JSON.stringify(plan)) }
/** Serialize edited meeting action items as an invisible payload carried by the native user message. */
export function meetingRevisionPayload(items: readonly ProjectBrainMeetingActionItem[]): string { return encodeURIComponent(JSON.stringify(items)) }

/** Resolve one user prompt to a deterministic, tool-free demo response. */
export function resolveProjectBrainReply(prompt: string): ProjectBrainReply {
  if (prompt.includes('<!-- project-brain:retry-platform -->')) return { kind: 'platform-retry', text: '' }
  const confirmation = parsePlanPayload(prompt, 'confirm')
  if (confirmation !== null) return { kind: 'launch-receipt', text: launchReceipt(confirmation) }
  const revision = parseRevision(prompt)
  if (revision !== null) return { kind: 'launch-plan', text: launchPlan(revision, true) }
  if (prompt.includes('<!-- project-brain:meeting-confirm -->') || /确认执行会议方案/u.test(prompt)) return { kind: 'meeting-receipt', text: meetingReceipt() }
  const meetingRevision = parseMeetingRevision(prompt)
  if (meetingRevision !== null) return { kind: 'meeting-analysis', text: meetingAnalysis(meetingRevision, true) }
  if (/确认|创建项目|按当前方案/u.test(prompt) && /项目/u.test(prompt)) return { kind: 'launch-receipt', text: launchReceipt(PROJECT_BRAIN_PLAN) }
  if (/会议纪要|开完.*会|整理.*项目会议|帮我把会议纪要里的事项落到项目/u.test(prompt)) return { kind: 'meeting-analysis', text: meetingAnalysis() }
  if (/托管|盯项目|跟踪项目/u.test(prompt)) return { kind: 'handoff', text: handoff('项目托管', '从今天开始持续关注进度、风险和阻塞事项，需要你介入时再提醒。') }
  if (/今天.*干什么|今日事项/u.test(prompt)) return { kind: 'handoff', text: handoff('今日工作', '我会按角色、紧急程度和前置依赖整理今天最值得先做的事项。') }
  if (/领导汇报|集团.*汇报/u.test(prompt)) return { kind: 'handoff', text: handoff('领导汇报', '我会汇总项目进展、风险、待决策事项和下一步计划，形成汇报底稿。') }
  if (/启动|创建|新建|初始化/u.test(prompt) && /项目/u.test(prompt)) return { kind: 'launch-plan', text: launchPlan(PROJECT_BRAIN_PLAN, false) }
  return { kind: 'fallback', text: '我可以继续围绕这个项目协助你：启动项目、整理会议纪要、托管项目、安排今日工作，或准备集团领导汇报。' }
}

function parseRevision(prompt: string): ProjectBrainPlanData | null {
  return parsePlanPayload(prompt, 'revision')
}

function parseMeetingRevision(prompt: string): readonly ProjectBrainMeetingActionItem[] | null {
  const match = /<!-- project-brain:meeting-revision ([\s\S]*?) -->/u.exec(prompt)
  if (match?.[1] === undefined) return null
  try {
    const value = JSON.parse(decodeURIComponent(match[1])) as readonly ProjectBrainMeetingActionItem[]
    return Array.isArray(value) && value.length > 0 ? value : null
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
function launchReceipt(plan: ProjectBrainPlanData): string { return `收到，开始按当前方案完成项目初始化。\n\n## 项目初始化进度\n\n1. ✓ 创建项目管理空间\n2. ✓ 初始化阶段与项目计划\n3. ✓ 建立任务、责任关系与风险台账\n4. ✓ 配置项目知识空间与协同规则\n\n## 项目已就绪\n\n**${plan.project.name}**\n\n- ${plan.stages.length} 个项目阶段 · ${plan.tasks.length} 项任务 · ${plan.risks.length} 项初始风险\n- 项目负责人：${plan.project.owner}\n- [进入项目智脑平台](${plan.project.platformUrl ?? 'https://project-brain.local'})` }

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
  const items = actionItems.map(item => {
    const tag = item.type === 'new-task' ? '🔵 新建任务' : item.type === 'update-task' ? '🟢 更新任务' : '🟠 新增风险'
    const related = item.relatedTaskId !== undefined ? `\n  - 关联任务：\`${item.relatedTaskId}\`` : ''
    const source = item.source ? `\n- **会议原文**：\n  > ${item.source}` : ''
    return `### ${tag}：${item.title}\n\n- **负责人**：${item.owner}\n- **截止时间**：${item.dueDate}\n- **说明**：${item.description}${related}${source}`
  }).join('\n\n---\n\n')

  const agendaTimeline = a.agendaItems.map((item, i) => `    A${i + 1}[${item.topic}\\n${item.presenter}]`).join(' --> ')
  const decisionsTable = a.keyDecisions.map(d => `| ${d.decision} | ${d.decidedBy} | ${d.rationale} |`).join('\n')

  return `${revised ? '我已结合这次调整重新生成会议任务拆解，以下内容将作为最新的执行基线。' : ''}${revised ? '\n\n' : ''}<!-- project-brain:meeting-analysis -->\n## 📋 会议纪要分析报告\n\n### 会议概览\n\n| 项目 | 内容 |\n|---|---|\n| 会议名称 | ${a.meetingTitle} |\n| 会议时间 | ${a.meetingDate} |\n| 会议时长 | ${a.duration} |\n| 会议地点 | ${a.location} |\n| 主持人 | ${a.host} |\n| 参会人员 | ${a.attendees.join('、')} |\n\n${a.summary}\n\n### 会议议题流程\n\n\`\`\`mermaid\ngraph LR\n    ${agendaTimeline}\n\`\`\`\n\n| 议题 | 汇报人 | 结论 |\n|---|---|---|\n${a.agendaItems.map(item => `| ${item.topic} | ${item.presenter} | ${item.outcome} |`).join('\n')}\n\n### 会议决议\n\n| 决议内容 | 决策人 | 决策依据 |\n|---|---|---|\n${decisionsTable}\n\n### 行动事项识别结果\n\n| 类型 | 数量 |\n|:---|---:|\n| 🔵 新建任务 | ${stats.newTasks} 项 |\n| 🟢 更新已有任务 | ${stats.updateTasks} 项 |\n| 🟠 新增风险 | ${stats.newRisks} 项 |\n\n### 智能去重分析\n\n已对会议事项与项目现有任务进行比对：\n\n- **安防摄像头采购**（demo-sub-001）：已有任务正处于"进行中"状态，本次会议涉及的到货时间调整将更新该任务的截止时间，不创建重复任务。\n- **设备采购延期风险**（demo-risk-001）：已有风险记录，本次会议将风险等级由中风险升级为高风险，更新风险状态。\n- 其余 ${stats.newTasks} 项为新增行动事项，与现有任务无冲突，将创建新任务。\n\n### 逐项详情\n\n${items}\n\n<!-- project-brain:meeting-plan -->`
}

/** Generate a deterministic meeting execution receipt. */
function meetingReceipt(): string {
  return `收到，开始按会议分析结果执行。\n\n## 执行进度\n\n1. ✓ 已创建 5 项新任务，分配负责人与截止时间\n2. ✓ 已更新 1 项已有任务（安防摄像头采购到货时间调整）\n3. ✓ 已新增 1 项风险（设备采购延期风险升级）\n4. ✓ 已配置任务到期提醒与负责人通知\n\n## 执行完成\n\n**本次会议共处理 7 项行动事项**\n\n- 📋 新建任务：5 项\n- 🔄 更新任务：1 项\n- ⚠️ 新增风险：1 项\n\n> 已创建的任务将在截止日前自动提醒负责人，风险状态已同步至项目风险台账，可在项目智脑平台中查看详情。\n\n<!-- project-brain:meeting-executed -->`
}

function handoff(title: string, description: string): string { return `## 已准备：${title}\n\n${description}\n\n把材料或补充要求发给我，我会沿着当前项目继续推进。` }