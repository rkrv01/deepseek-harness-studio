/** Shared deterministic project data and rich replies for the Project Brain demo. */

import {
  DEFAULT_PLATFORM_BASE_URL,
  MEETING_ANALYSIS_MOCK,
  MEETING_MINUTES_TEXT,
  matchProjectBrainScenario,
  parseProjectBrainScenarioPayload,
  PROJECT_BRAIN_PLAN,
  projectBrainScenarioPayload,
  projectBrainSurfacePayload,
  resolveProjectBrainData,
} from '@deepseek-ai/dsh-client-ui-project-brain/scenario'
import type { ProjectBrainLocale } from '@deepseek-ai/dsh-client-ui-project-brain/scenario'
import type {
  ProjectBrainMeetingActionItem,
  ProjectBrainMeetingAnalysis,
  ProjectBrainCopilotDecisionSelection,
  ProjectBrainPlanData,
  ProjectBrainScenarioId,
} from '@deepseek-ai/dsh-client-ui-project-brain/scenario'

export type ProjectBrainReplyKind = 'launch-plan' | 'launch-receipt' | 'platform-retry' | 'meeting-analysis' | 'meeting-receipt' | 'executive-briefing' | 'briefing-receipt' | 'copilot-decision-receipt' | 'handoff' | 'note' | 'fallback'

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

/**
 * Resolve one user prompt to a deterministic, tool-free demo response.
 * @param prompt - user prompt text.
 * @param locale - reply locale; defaults to Chinese for backward compatibility.
 */
export function resolveProjectBrainReply(prompt: string, locale: ProjectBrainLocale = 'zh'): ProjectBrainReply {
  const data = resolveProjectBrainData(locale)
  if (prompt.includes('<!-- project-brain:retry-platform -->')) return { kind: 'platform-retry', text: '' }
  const envelope = parseProjectBrainScenarioPayload<ProjectBrainPlanData | readonly ProjectBrainMeetingActionItem[] | unknown>(prompt)
  if (envelope?.scenarioId === 'project-launch' && envelope.action === 'confirm') return { kind: 'launch-receipt', text: launchReceipt(envelope.payload as ProjectBrainPlanData, locale) }
  if (envelope?.scenarioId === 'project-launch' && envelope.action === 'revision') return { kind: 'launch-plan', text: launchPlan(envelope.payload as ProjectBrainPlanData, true, locale) }
  if (envelope?.scenarioId === 'meeting-actions' && envelope.action === 'confirm') return { kind: 'meeting-receipt', text: meetingReceipt(envelope.payload as readonly ProjectBrainMeetingActionItem[], locale) }
  if (envelope?.scenarioId === 'meeting-actions' && envelope.action === 'revision') return { kind: 'meeting-analysis', text: meetingAnalysis(envelope.payload as readonly ProjectBrainMeetingActionItem[], true, locale) }
  if (envelope?.scenarioId === 'executive-briefing' && envelope.action === 'confirm') {
    const materials = extractBriefingMaterials(envelope.payload)
    return { kind: 'briefing-receipt', text: executiveBriefingReceipt(materials, locale) }
  }
  if (envelope?.scenarioId === 'project-copilot' && envelope.action === 'confirm') {
    const decision = parseCopilotDecision(envelope.payload)
    if (decision !== null) return { kind: 'copilot-decision-receipt', scenarioId: 'project-copilot', text: copilotDecisionReceipt(decision, locale) }
  }
  const confirmation = parsePlanPayload(prompt, 'confirm')
  if (confirmation !== null) return { kind: 'launch-receipt', text: launchReceipt(confirmation, locale) }
  const revision = parseRevision(prompt)
  if (revision !== null) return { kind: 'launch-plan', text: launchPlan(revision, true, locale) }
  if (prompt.includes('<!-- project-brain:meeting-confirm -->') || (locale === 'en' ? /confirm.*meeting/i.test(prompt) : /确认执行会议方案/u.test(prompt))) return { kind: 'meeting-receipt', text: meetingReceipt(data.meetingAnalysis.actionItems, locale) }
  const meetingRevision = parseMeetingRevision(prompt)
  if (meetingRevision !== null) return { kind: 'meeting-analysis', text: meetingAnalysis(meetingRevision, true, locale) }
  if (locale === 'en'
    ? /confirm|create the project|proceed as planned/i.test(prompt) && /project/i.test(prompt)
    : /确认|创建项目|按当前方案/u.test(prompt) && /项目/u.test(prompt)) {
    return { kind: 'launch-receipt', text: launchReceipt(data.plan, locale) }
  }
  if (locale === 'en'
    ? /why.*equipment selection/i.test(prompt)
    : /为什么(不是|不先做?)是?先?做?设备选型/u.test(prompt) || /为什么.*设备选型.*排.*(后|不)/u.test(prompt)) {
    return { kind: 'note', text: locale === 'en'
      ? 'The equipment selection proposal does need to be finished today, but it is not currently blocking other tasks. By contrast, the supplier confirmation is already affecting the critical path, with 2 downstream tasks waiting on its result, which is why I ranked it first. If you still want to change the order, just tell me.'
      : '设备选型方案虽然今天需要完成，但当前不会立即阻塞其他任务。相比之下，供应商确认已经影响关键路径，并且有 2 项后续任务在等待结果，因此我把供应商确认排在前面。如果你仍想调整顺序，告诉我即可。' }
  }
  if (locale === 'en'
    ? /equipment selection.*first|reorder.*my preference|adjust the order/i.test(prompt)
    : /(我想|我要|可以)?先做设备选型|按我的偏好调整顺序/u.test(prompt)) {
    return { kind: 'note', text: locale === 'en'
      ? 'Sure, that will not create an immediate project risk. However, the supplier confirmation is still affecting the critical path, so I would suggest not skipping it today. If you like, I can reorder today\u2019s items to match your preference.'
      : '可以，这样不会立即造成新的项目风险。不过供应商确认目前仍然影响关键路径，建议今天不要遗漏。需要的话，我可以按你的偏好重新调整今天的排序。' }
  }
  const scenario = matchProjectBrainScenario(prompt, locale)
  if (scenario?.id === 'meeting-actions') return { kind: 'meeting-analysis', text: meetingAnalysis(undefined, false, locale) }
  if (scenario?.id === 'project-copilot') return { kind: 'handoff', scenarioId: 'project-copilot', text: projectCopilotSurface(locale) }
  if (scenario?.id === 'my-day' || (locale === 'en' ? /what.*today|today.*plan/i.test(prompt) : /今天.*干什么|今日事项/u.test(prompt))) return { kind: 'handoff', scenarioId: 'my-day', text: myDaySurface(locale) }
  if (scenario?.id === 'executive-briefing') return { kind: 'executive-briefing', scenarioId: 'executive-briefing', text: executiveBriefingDocument(locale) }
  if (scenario?.id === 'project-launch') return { kind: 'launch-plan', text: launchPlan(data.plan, false, locale) }
  return { kind: 'fallback', text: locale === 'en'
    ? 'I can keep helping with this project: launch it, organize meeting minutes, check status, plan today\u2019s work, or prepare a group-leadership briefing.'
    : '我可以继续围绕这个项目协助你：启动项目、整理会议纪要、查看项目现状、安排今日工作，或准备集团领导汇报。' }
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

interface CopilotDecision {
  readonly decisionId: 'decision-1'
  readonly selection: ProjectBrainCopilotDecisionSelection
}

function parseCopilotDecision(payload: unknown): CopilotDecision | null {
  if (typeof payload !== 'object' || payload === null) return null
  const value = payload as { readonly decisionId?: unknown; readonly selection?: unknown }
  if (value.decisionId !== 'decision-1') return null
  if (value.selection !== 'wait-for-confirmation' && value.selection !== 'start-backup-supplier') return null
  return { decisionId: value.decisionId, selection: value.selection }
}

function launchPlan(plan: ProjectBrainPlanData, revised: boolean, locale: ProjectBrainLocale): string {
  const p = plan.project
  const stages = plan.stages.map(stage => `| ${stage.name} | ${dateRange(stage.startDate, stage.endDate, locale)} | ${stage.owner} | ${stage.deliverable} |`).join('\n')
  const tasks = plan.tasks.map(task => `| ${task.id} | ${task.title} | ${task.owner} | ${dateRange(task.startDate, task.endDate, locale)} | ${task.dependency} |`).join('\n')
  const risks = plan.risks.map(risk => `| ${risk.title} | ${risk.type} | ${risk.owner} | ${risk.description} | ${risk.level} | ${risk.mitigation} |`).join('\n')
  const flow = plan.stages.map((stage, index) => `${index === 0 ? '' : ` --> S${index + 1}`}S${index + 1}[${stage.name}\\n${stage.startDate.slice(0, 7)}]`).join('')
  const gantt = plan.tasks.map((task, index) => `    ${task.title} :${index === 0 ? 'done, ' : ''}t${index + 1}, ${task.startDate}, ${task.endDate}`).join('\n')
  const folderRows = plan.knowledgeFolders.map((folder, index) => `${index === plan.knowledgeFolders.length - 1 ? '└' : '├'}── ${String(index + 1).padStart(2, '0')}-${folder}`).join('\n')
  const meetingActions = plan.meeting.actions.map(action => `- **${action.title}** · ${action.owner} · ${locale === 'en' ? `Due ${action.dueDate}` : `截止 ${action.dueDate}`}`).join('\n')
  const knowledgeDocuments = plan.knowledgeDocuments.map(document => `| ${document.title} | ${document.category} | ${document.fileName} | ${document.author} | ${document.status} |`).join('\n')
  if (locale === 'en') {
    const highRiskCount = plan.risks.filter(risk => risk.level === 'High').length
    return `${revised ? 'I have reorganized the project plan based on these adjustments; the following will serve as the latest project plan in the Project Brain.' : 'I identified a smart park construction project in progress. Let me first collect the current project documents, progress, risks, and coordination items, then initialize it into the Project Brain platform.'}\n\n<!-- project-brain:launch-plan -->\n# 🚀 Project Import & Initialization Plan: ${p.name}\n\n## 📊 Executive Summary\n\n| Project Period | Progress | Demo Budget | Owner | Current Risk |\n|---|---:|---:|---|---|\n| ${dateRange(p.startDate, p.endDate, 'en')} | ${p.progress}% | ¥${formatBudget(p.budget, 'en')} | ${p.owner} | High risk ${highRiskCount} item(s) |\n\n> ${p.summary}\n\n> The budget is presentation supplement data; project documents, tasks, meetings, risks, and knowledge information have been collected from the current project snapshot.\n\n## 🎯 Project Goal\n\n${p.goal}\n\n## 🗺️ Stage Plan\n\n\`\`\`mermaid\ngraph LR\n    ${flow}\n\`\`\`\n\n| Stage | Period | Owner | Key Deliverable |\n|---|---|---|---|\n${stages}\n\n## 💰 Budget Breakdown\n\n\`\`\`mermaid\npie title Budget Breakdown (in ¥10k)\n    "Smart devices & IoT integration" : ${Math.round(p.budget * 0.35 / 10_000)}\n    "Platform software & data platform" : ${Math.round(p.budget * 0.30 / 10_000)}\n    "Implementation & field services" : ${Math.round(p.budget * 0.20 / 10_000)}\n    "Security & operations support" : ${Math.round(p.budget * 0.10 / 10_000)}\n    "Project reserve fund" : ${Math.round(p.budget * 0.05 / 10_000)}\n\`\`\`\n\n## 📅 Critical Path & Milestones\n\n\`\`\`mermaid\ngantt\n    title ${p.name} Critical Path\n    dateFormat YYYY-MM-DD\n    axisFormat %m/%d\n${gantt}\n\`\`\`\n\n## 📝 Current Task Breakdown\n\n| ID | Task | Owner | Period | Dependency |\n|---|---|---|---|---|\n${tasks}\n\n## ⚠️ Current Risks\n\n| Risk | Type | Owner | Description | Level | Mitigation |\n|---|---|---|---|---|---|\n${risks}\n\n## 🗓️ Latest Meeting & Pending Items\n\n**${plan.meeting.title}** · ${plan.meeting.date} · Host: ${plan.meeting.host}\n\n${plan.meeting.summary}\n\n${meetingActions}\n\n## 📁 Project Knowledge Space\n\n\`\`\`text\n${p.name}/\n${folderRows}\n\`\`\`\n\n## 📚 Collected Knowledge Documents\n\n| Document | Category | File | Maintainer | Status |\n|---|---|---|---|---|\n${knowledgeDocuments}\n\nTo adjust the plan, click "Edit Project Plan" at the bottom of this message.`
  }
  return `${revised ? '我已结合这次调整重新整理项目方案，以下内容将作为项目智脑中的最新项目方案。' : '已识别到一个正在推进的园区建设项目。我会先归集当前项目资料、进度、风险与协同事项，再将它初始化到项目智脑平台。'}\n\n<!-- project-brain:launch-plan -->\n# 🚀 项目导入与初始化方案：${p.name}\n\n## 📊 执行摘要\n\n| 项目周期 | 当前进度 | 演示预算 | 项目负责人 | 当前风险 |\n|---|---:|---:|---|---|\n| ${dateRange(p.startDate, p.endDate)} | ${p.progress}% | ¥${formatBudget(p.budget)} | ${p.owner} | 高风险 ${plan.risks.filter(risk => risk.level === '高').length} 项 |\n\n> ${p.summary}\n\n> 预算为演示补充数据；项目资料、任务、会议、风险与知识信息已按当前项目快照归集。\n\n## 🎯 项目目标\n\n${p.goal}\n\n## 🗺️ 阶段规划\n\n\`\`\`mermaid\ngraph LR\n    ${flow}\n\`\`\`\n\n| 阶段 | 时间 | 负责人 | 关键交付物 |\n|---|---|---|---|\n${stages}\n\n## 💰 预算构成\n\n\`\`\`mermaid\npie title 预算构成（万元）\n    "智能设备与物联接入" : ${Math.round(p.budget * 0.35 / 10_000)}\n    "平台软件与数据中台" : ${Math.round(p.budget * 0.30 / 10_000)}\n    "实施集成与现场服务" : ${Math.round(p.budget * 0.20 / 10_000)}\n    "安全与运维保障" : ${Math.round(p.budget * 0.10 / 10_000)}\n    "项目预备费" : ${Math.round(p.budget * 0.05 / 10_000)}\n\`\`\`\n\n## 📅 关键路径与里程碑\n\n\`\`\`mermaid\ngantt\n    title ${p.name}关键路径\n    dateFormat YYYY-MM-DD\n    axisFormat %m/%d\n${gantt}\n\`\`\`\n\n## 📝 当前任务分解\n\n| 编号 | 任务 | 负责人 | 时间 | 前置依赖 |\n|---|---|---|---|---|\n${tasks}\n\n## ⚠️ 当前风险\n\n| 风险 | 类型 | 负责人 | 风险描述 | 等级 | 应对措施 |\n|---|---|---|---|---|---|\n${risks}\n\n## 🗓️ 最新会议与待落实事项\n\n**${plan.meeting.title}** · ${plan.meeting.date} · 主持人：${plan.meeting.host}\n\n${plan.meeting.summary}\n\n${meetingActions}\n\n## 📁 项目知识空间\n\n\`\`\`text\n${p.name}/\n${folderRows}\n\`\`\`\n\n## 📚 已归集知识资料\n\n| 资料 | 分类 | 文件 | 维护人 | 状态 |\n|---|---|---|---|---|\n${knowledgeDocuments}\n\n如需调整方案内容，可在本消息底部点击"编辑项目方案"。`
}

/** @param locale - range wording locale; defaults to Chinese for backward compatibility. */
function dateRange(startDate: string, endDate: string, locale: ProjectBrainLocale = 'zh'): string {
  return locale === 'en' ? `${startDate} to ${endDate}` : `${startDate} 至 ${endDate}`
}

/** @param locale - unit wording locale; defaults to Chinese for backward compatibility. */
function formatBudget(budget: number, locale: ProjectBrainLocale = 'zh'): string {
  return locale === 'en'
    ? `${(budget / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
    : budget >= 10_000 ? `${(budget / 10_000).toLocaleString('zh-CN')} 万` : budget.toLocaleString('zh-CN')
}

function launchReceipt(plan: ProjectBrainPlanData, locale: ProjectBrainLocale): string {
  if (locale === 'en') {
    return `Received. Starting project initialization per the current plan.\n\n## Project Initialization Progress\n\n1. ✓ Create the project management space\n2. ✓ Initialize the phases and project plan\n3. ✓ Set up tasks, ownership, and the risk ledger\n4. ✓ Configure the project knowledge space and collaboration rules\n\n## Project Ready\n\n**${plan.project.name}**\n\n- ${plan.stages.length} project phases · ${plan.tasks.length} tasks · ${plan.risks.length} initial risks\n- Project owner: ${plan.project.owner}\n- [Open the Project Brain platform](${demoPlatformBaseUrl()}/business-xmzn/#/projectAdmin)`
  }
  return `收到，开始按当前方案完成项目初始化。\n\n## 项目初始化进度\n\n1. ✓ 创建项目管理空间\n2. ✓ 初始化阶段与项目计划\n3. ✓ 建立任务、责任关系与风险台账\n4. ✓ 配置项目知识空间与协同规则\n\n## 项目已就绪\n\n**${plan.project.name}**\n\n- ${plan.stages.length} 个项目阶段 · ${plan.tasks.length} 项任务 · ${plan.risks.length} 项初始风险\n- 项目负责人：${plan.project.owner}\n- [进入项目智脑平台](${demoPlatformBaseUrl()}/business-xmzn/#/projectAdmin)`
}

/** Generate a deterministic meeting analysis report, optionally from edited action items. */
function meetingAnalysis(editedItems: readonly ProjectBrainMeetingActionItem[] | undefined, revised: boolean, locale: ProjectBrainLocale): string {
  const a = resolveProjectBrainData(locale).meetingAnalysis
  const actionItems = editedItems ?? a.actionItems
  const stats = editedItems
    ? {
      newTasks: editedItems.filter(i => i.type === 'new-task').length,
      updateTasks: editedItems.filter(i => i.type === 'update-task').length,
      newRisks: editedItems.filter(i => i.type === 'new-risk').length,
    }
    : a.stats
  const items = actionItems.map((item) => {
    const tag = locale === 'en'
      ? item.type === 'new-task' ? '🔵 New task' : item.type === 'update-task' ? '🟢 Update task' : '🟠 New risk'
      : item.type === 'new-task' ? '🔵 新建任务' : item.type === 'update-task' ? '🟢 更新任务' : '🟠 新增风险'
    const related = item.relatedTaskId !== undefined ? `\n  - ${locale === 'en' ? 'Related task' : '关联任务'}：\`${item.relatedTaskId}\`` : ''
    const source = item.source ? `\n- **${locale === 'en' ? 'Meeting source' : '会议原文'}**：\n  > ${item.source}` : ''
    if (locale === 'en') {
      return `### ${tag}: ${item.title}\n\n- **Owner**: ${item.owner}\n- **Due date**: ${item.dueDate}\n- **Description**: ${item.description}${related}${source}`
    }
    return `### ${tag}：${item.title}\n\n- **负责人**：${item.owner}\n- **截止时间**：${item.dueDate}\n- **说明**：${item.description}${related}${source}`
  }).join('\n\n---\n\n') + `\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('meeting-actions', 'revision', actionItems)} -->`

  const agendaTimeline = a.agendaItems.map((item, i) => `    A${i + 1}[${item.topic}\\n${item.presenter}]`).join(' --> ')
  const decisionsTable = a.keyDecisions.map(d => `| ${d.decision} | ${d.decidedBy} | ${d.rationale} |`).join('\n')

  if (locale === 'en') {
    return `${revised ? 'I have regenerated the meeting task breakdown based on these changes; the following will serve as the latest execution baseline.' : ''}${revised ? '\n\n' : ''}<!-- project-brain:meeting-analysis -->\n## 📋 Meeting Analysis Report\n\n### Meeting Overview\n\n| Item | Content |\n|---|---|\n| Meeting Title | ${a.meetingTitle} |\n| Meeting Time | ${a.meetingDate} |\n| Duration | ${a.duration} |\n| Location | ${a.location} |\n| Chair | ${a.host} |\n| Attendees | ${a.attendees.join(', ')} |\n\n${a.summary}\n\n### Meeting Agenda Flow\n\n\`\`\`mermaid\ngraph LR\n    ${agendaTimeline}\n\`\`\`\n\n| Topic | Presenter | Outcome |\n|---|---|---|\n${a.agendaItems.map(item => `| ${item.topic} | ${item.presenter} | ${item.outcome} |`).join('\n')}\n\n### Meeting Decisions\n\n| Decision | Decided By | Rationale |\n|---|---|---|\n${decisionsTable}\n\n### Action Item Identification\n\n| Type | Count |\n|:---|---:|\n| 🔵 New task | ${stats.newTasks} item(s) |\n| 🟢 Update existing task | ${stats.updateTasks} item(s) |\n| 🟠 New risk | ${stats.newRisks} item(s) |\n\n<!-- project-brain:meeting-plan -->\n\n### Smart Deduplication Analysis\n\nI compared the meeting items against the project\u2019s existing tasks:\n\n- **Security camera procurement** (demo-sub-001): an existing task is already in "In progress" status, so the arrival-time adjustment from this meeting will update that task\u2019s due date instead of creating a duplicate task.\n- **Equipment procurement delay risk** (demo-risk-001): an existing risk record covers this, so the meeting elevates the risk level from medium to high and updates the risk status.\n- The remaining ${stats.newTasks} item(s) are new action items with no conflict against existing tasks and will be created as new tasks.\n\n### Item Details\n\n${items}`
  }
  return `${revised ? '我已结合这次调整重新生成会议任务拆解，以下内容将作为最新的执行基线。' : ''}${revised ? '\n\n' : ''}<!-- project-brain:meeting-analysis -->\n## 📋 会议纪要分析报告\n\n### 会议概览\n\n| 项目 | 内容 |\n|---|---|\n| 会议名称 | ${a.meetingTitle} |\n| 会议时间 | ${a.meetingDate} |\n| 会议时长 | ${a.duration} |\n| 会议地点 | ${a.location} |\n| 主持人 | ${a.host} |\n| 参会人员 | ${a.attendees.join('、')} |\n\n${a.summary}\n\n### 会议议题流程\n\n\`\`\`mermaid\ngraph LR\n    ${agendaTimeline}\n\`\`\`\n\n| 议题 | 汇报人 | 结论 |\n|---|---|---|\n${a.agendaItems.map(item => `| ${item.topic} | ${item.presenter} | ${item.outcome} |`).join('\n')}\n\n### 会议决议\n\n| 决议内容 | 决策人 | 决策依据 |\n|---|---|---|\n${decisionsTable}\n\n### 行动事项识别结果\n\n| 类型 | 数量 |\n|:---|---:|\n| 🔵 新建任务 | ${stats.newTasks} 项 |\n| 🟢 更新已有任务 | ${stats.updateTasks} 项 |\n| 🟠 新增风险 | ${stats.newRisks} 项 |\n\n<!-- project-brain:meeting-plan -->\n\n### 智能去重分析\n\n已对会议事项与项目现有任务进行比对：\n\n- **安防摄像头采购**（demo-sub-001）：已有任务正处于"进行中"状态，本次会议涉及的到货时间调整将更新该任务的截止时间，不创建重复任务。\n- **设备采购延期风险**（demo-risk-001）：已有风险记录，本次会议将风险等级由中风险升级为高风险，更新风险状态。\n- 其余 ${stats.newTasks} 项为新增行动事项，与现有任务无冲突，将创建新任务。\n\n### 逐项详情\n\n${items}`
}

/** Generate a deterministic meeting execution receipt. */
function meetingReceipt(items: readonly ProjectBrainMeetingActionItem[], locale: ProjectBrainLocale): string {
  const newTasks = items.filter(item => item.type === 'new-task').length
  const updatedTasks = items.filter(item => item.type === 'update-task').length
  const newRisks = items.filter(item => item.type === 'new-risk').length
  if (locale === 'en') {
    return `Received. Starting to execute per the meeting analysis.\n\n## Execution Progress\n\n1. ✓ Created ${newTasks} new task(s) with owners and due dates assigned\n2. ✓ Updated ${updatedTasks} existing task(s)\n3. ✓ Added ${newRisks} risk(s)\n4. ✓ Configured task due-date reminders and owner notifications\n\n## Execution Complete\n\n**${items.length} action item(s) processed from this meeting**\n\n- 📋 New tasks: ${newTasks}\n- 🔄 Updated tasks: ${updatedTasks}\n- ⚠️ New risks: ${newRisks}\n\n> Created tasks will auto-remind their owners before the due date, and the risk status has been synced to the project risk ledger.\n\n<!-- project-brain:meeting-executed -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('meeting-actions', 'confirm', items)} -->`
  }
  return `收到，开始按会议分析结果执行。\n\n## 执行进度\n\n1. ✓ 已创建 ${newTasks} 项新任务，分配负责人与截止时间\n2. ✓ 已更新 ${updatedTasks} 项已有任务\n3. ✓ 已新增 ${newRisks} 项风险\n4. ✓ 已配置任务到期提醒与负责人通知\n\n## 执行完成\n\n**本次会议共处理 ${items.length} 项行动事项**\n\n- 📋 新建任务：${newTasks} 项\n- 🔄 更新任务：${updatedTasks} 项\n- ⚠️ 新增风险：${newRisks} 项\n\n> 已创建的任务将在截止日前自动提醒负责人，风险状态已同步至项目风险台账。\n\n<!-- project-brain:meeting-executed -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('meeting-actions', 'confirm', items)} -->`
}

function myDaySurface(locale: ProjectBrainLocale): string {
  const day = resolveProjectBrainData(locale).myDay
  if (locale === 'en') {
    return `I have combined the projects you are involved in, task due dates, risks, dependencies, and where people are waiting on you to rank today\u2019s 6 most worthwhile items.\n\n2 of them need priority handling, 1 is affecting downstream tasks, and 1 is waiting on your feedback.\n\n<!-- project-brain:surface ${projectBrainSurfacePayload('my-day', 'my-day-workbench', day)} -->`
  }
  return `我已经结合你当前参与的项目、任务截止时间、风险、依赖关系和协作等待情况，把今天最值得推进的 6 件事排好了。\n\n其中 2 件需要优先处理，1 件正在影响后续任务，另外有 1 项在等你反馈。\n\n<!-- project-brain:surface ${projectBrainSurfacePayload('my-day', 'my-day-workbench', day)} -->`
}

/** The AI manager wrap-up as visible markdown, streamed after the inline board. */
function copilotNarrativeText(locale: ProjectBrainLocale): string {
  const narrative = resolveProjectBrainData(locale).copilot.aiNarrative
  if (locale === 'en') {
    return [
      '## AI Project Manager Summary',
      '',
      '**3 things need attention right now:**',
      '',
      ...narrative.focus.map((item, index) => `${index + 1}. ${item}`),
      '',
      '**Here is what I have already handled:**',
      '',
      ...narrative.executed.map(item => `- ${item}`),
      '',
      `**Only 1 thing needs your confirmation:**${narrative.needDecision}`,
      '',
      `**I will continue with:**${narrative.next}`,
    ].join('\n')
  }
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

function projectCopilotSurface(locale: ProjectBrainLocale): string {
  // The leading marker inlines the board above the prose; the wrap-up streams
  // as ordinary reply text beneath it.
  return `<!-- project-brain:surface ${projectBrainSurfacePayload('project-copilot', 'project-copilot-dashboard', resolveProjectBrainData(locale).copilot)} -->\n\n${copilotNarrativeText(locale)}`
}

function copilotDecisionReceipt(decision: CopilotDecision, locale: ProjectBrainLocale): string {
  const payload = projectBrainScenarioPayload('project-copilot', 'confirm', decision)
  if (decision.selection === 'wait-for-confirmation') {
    if (locale === 'en') {
      return `The conditional plan is in effect: I will keep confirming the final delivery date with the original supplier before 10:00 tomorrow; if a firm date is still not confirmed by then, I will activate the backup supplier plan and report the evaluation progress back to you.\n\n<!-- project-brain:copilot-decision-result -->\n<!-- project-brain:scenario ${payload} -->`
    }
    return `条件预案已生效：明日 10:00 前继续向原供应商确认最终交期；如仍未取得明确交期，我将启动备选供应商方案，并向你回传评估进展。\n\n<!-- project-brain:copilot-decision-result -->\n<!-- project-brain:scenario ${payload} -->`
  }
  if (locale === 'en') {
    return `The backup supplier evaluation has started: Wang Gang will complete qualification review and quote comparison for at least two suppliers; the procurement delay risk keeps tracking at high level, and I will report the first-round results back to you before end of day today.\n\n<!-- project-brain:copilot-decision-result -->\n<!-- project-brain:scenario ${payload} -->`
  }
  return `备选供应商评估已启动：王刚将完成至少两家供应商的资质审核与报价对比；采购延期风险继续按高风险跟踪，并在今日下班前向你回传首轮结果。\n\n<!-- project-brain:copilot-decision-result -->\n<!-- project-brain:scenario ${payload} -->`
}

function executiveBriefingDocument(locale: ProjectBrainLocale): string {
  const plan = resolveProjectBrainData(locale).plan
  const p = plan.project
  const highRisk = plan.risks.find(risk => risk.level === (locale === 'en' ? 'High' : '高')) ?? (locale === 'en' ? { title: 'Key risk to be confirmed', impact: 'Impact scope needs to be confirmed at the next project meeting.' } : { title: '关键风险待确认', impact: '需要在下一次项目例会中确认影响范围。' })
  const completedTasks = plan.tasks.filter(task => task.progress === 100)
  const delayedTasks = plan.tasks.filter(task => task.progress < 40 && task.endDate <= '2026-09-30')
  const stageRows = plan.stages.map(stage => `| ${stage.name} | ${dateRange(stage.startDate, stage.endDate, locale)} | ${stage.owner} | ${stage.deliverable} |`).join('\n')
  const pptOutline = (locale === 'en'
    ? ['Overall project status and current progress', 'Achievements completed this phase', 'Key deviations and the procurement delay risk', 'Items requiring group coordination', 'Next-phase plan and safeguards']
    : ['项目总体情况与当前进度', '本阶段已完成成果', '关键偏差与采购延期风险', '需集团协调事项', '下一阶段计划与保障措施']
  ).map((item, index) => `${index + 1}. ${item}`).join('\n')
  const payload = { projectId: p.id, projectName: p.name, progress: p.progress, generatedAt: '2026-08-26' }
  if (locale === 'en') {
    return `I will organize this around what group leadership cares about most: conclusions first, then progress, deviations, risks, and items that need coordination.\n\n<!-- project-brain:executive-briefing -->\n# Project Phase Briefing: ${p.name}\n\n## Leadership Summary\n\n${p.name} is at **${p.progress}%** overall progress. The design phase is complete, and equipment procurement and system integration are running in parallel, so the project remains broadly under control; the biggest current risk is **${highRisk.title}**, which is expected to set system integration testing back by about 2 weeks.\n\n| Focus | Current Assessment |\n|---|---|\n| Project progress | ${p.progress}%, ${completedTasks.length} critical tasks completed |\n| Current deviation | Equipment procurement delays spill into the system integration testing window |\n| Biggest risk | ${highRisk.title}: ${highRisk.impact} |\n| Group coordination needed | Align supplier resources and backup procurement channels; clarify delay accountability and delivery priority |\n\n## Project Progress\n\n| Stage | Period | Owner | Stage Deliverable |\n|---|---|---|---|\n${stageRows}\n\n## Key Achievements This Phase\n\n- Completed the smart park construction plan review and implementation plan approval, forming the project execution baseline.\n- The first batch of security cameras passed factory inspection, and the access control equipment contract is signed and in production scheduling.\n- Security system-platform integration has started; test environment resources are approved and the minimal usable environment is being stood up.\n- Collected ${plan.knowledgeDocuments.length} project knowledge documents covering technical proposals, implementation plans, and supplier evaluations.\n\n## Deviations & Risk Measures\n\n- **Procurement delay**: the second batch of security cameras is expected to slip about 2 weeks, affecting ${delayedTasks.length} procurement/integration task(s).\n- **Mitigation**: start the backup supplier evaluation, require the original supplier to commit to phased deliveries, and prioritize the minimal security system test chain.\n- **Management actions**: elevate the procurement delay risk to high and add it to managed monitoring and the weekly-meeting fixed tracking item.\n\n## Items Requiring Group Coordination\n\n1. Coordinate core equipment suppliers to release priority capacity so the second security camera batch is delivered on time.\n2. Clarify whether the energy-consumption monitoring module is within this phase\u2019s scope to avoid repeated acceptance disputes.\n3. Support cross-department resource scheduling so the test environment and field construction windows stop waiting on each other.\n\n## Next-Phase Plan\n\n- Complete the backup supplier evaluation, the final equipment selection proposal, and the minimal test environment setup by the end of August.\n- In September, push forward equipment arrival acceptance, security system integration, and closing out the procurement delay risk.\n- From October, move into acceptance documentation preparation and consolidating the phase deliverables.\n\n## 5-Minute Verbal Briefing\n\nLadies and gentlemen, the project is currently at ${p.progress}% overall progress. The design phase is complete, and equipment procurement and system integration are running in parallel. The key item to watch is the equipment procurement delay: the second batch of security cameras is expected to slip about 2 weeks, which may affect integration testing. The project team has started the backup supplier evaluation and is pushing the minimal test environment forward to contain the impact locally. What we need from the group is supplier resource coordination, change-scope confirmation, and cross-department test resource support.\n\n## PPT Outline\n\n${pptOutline}\n\nOnce confirmed, I will package the above into a briefing kit and keep it as the presentation material for this group report.\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', payload)} -->`
  }
  return `我会按集团领导最关心的口径整理：先给结论，再讲进展、偏差、风险和需要协调的事项。\n\n<!-- project-brain:executive-briefing -->\n# 项目阶段汇报材料：${p.name}\n\n## 领导摘要\n\n${p.name}当前整体进度 **${p.progress}%**。方案设计已完成，设备采购与系统集成正在并行推进，项目总体仍可控；当前最大风险是**${highRisk.title}**，预计会对系统集成测试造成约 2 周影响。\n\n| 汇报重点 | 当前判断 |\n|---|---|\n| 项目进度 | ${p.progress}%，已完成 ${completedTasks.length} 项关键任务 |\n| 当前偏差 | 设备采购延迟传导到系统集成测试窗口 |\n| 最大风险 | ${highRisk.title}：${highRisk.impact} |\n| 需集团协调 | 协调供应商资源与备选采购通道，明确延期责任与交付优先级 |\n\n## 项目进展\n\n| 阶段 | 周期 | 负责人 | 阶段成果 |\n|---|---|---|---|\n${stageRows}\n\n## 本阶段主要成果\n\n- 完成智慧园区建设方案评审与实施方案审核，形成项目实施基线。\n- 安防摄像头首批设备已完成出厂检测，门禁设备合同已签订并进入排产。\n- 安防系统与平台对接已启动，测试环境资源已批复，正在推进最小可用环境。\n- 已归集 ${plan.knowledgeDocuments.length} 份项目知识资料，覆盖技术方案、实施方案和供应商评估。\n\n## 偏差说明与风险措施\n\n- **采购延期**：第二批安防摄像头预计延迟 2 周，关联 ${delayedTasks.length} 项采购/集成任务。\n- **应对措施**：启动备选供应商评估，要求原供应商提供分批到货承诺，同时优先保障安防系统最小链路测试。\n- **管理动作**：将采购延期风险提升为高风险，纳入托管监测与周例会固定跟踪项。\n\n## 需集团协调事项\n\n1. 协调核心设备供应商释放优先产能，保障安防摄像头第二批交付。\n2. 明确能耗监测模块是否纳入本期范围，避免后续验收口径反复。\n3. 支持跨部门资源调度，确保测试环境和现场施工窗口不再互相等待。\n\n## 下一阶段计划\n\n- 8 月底前完成备选供应商评估、设备选型终稿和最小测试环境搭建。\n- 9 月推进设备到货验收、安防系统对接和采购延期风险闭环。\n- 10 月起进入验收资料准备和阶段性成果固化。\n\n## 5 分钟口头稿\n\n各位领导，本项目目前整体进度 45%，方案设计阶段已经完成，设备采购和系统集成正在并行推进。当前需要重点关注的是设备采购延期风险，第二批安防摄像头预计延迟 2 周，可能影响系统集成测试。项目组已经启动备选供应商评估，并同步推进最小测试环境，尽量把影响控制在局部。需要集团层面协助的是供应商资源协调、变更范围确认以及跨部门测试资源保障。\n\n## PPT 汇报提纲\n\n${pptOutline}\n\n确认后，我会把以上内容整理成汇报包，并保留为本次集团汇报的演示材料。\n\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', payload)} -->`
}

/** Collect valid material names from a briefing confirm payload. */
function extractBriefingMaterials(payload: unknown): readonly string[] {
  if (typeof payload !== 'object' || payload === null) return []
  const materials = (payload as { readonly materials?: unknown }).materials
  return Array.isArray(materials) ? materials.filter((name): name is string => typeof name === 'string') : []
}

function executiveBriefingReceipt(materials: readonly string[], locale: ProjectBrainLocale): string {
  const plan = resolveProjectBrainData(locale).plan
  const list = materials.length > 0 ? materials.map(name => `- ${name}`).join('\n') : (locale === 'en' ? '- Leadership summary and progress notes\n- 5-minute verbal briefing\n- PPT outline' : '- 领导摘要与进度说明\n- 5 分钟口头稿\n- PPT 汇报提纲')
  if (locale === 'en') {
    return `<!-- project-brain:executive-briefing-ready -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', { projectId: plan.project.id, projectName: plan.project.name, progress: plan.project.progress, materials })} -->\n## Selected Materials Ready\n\nPrepared to the group leadership reporting standard:\n\n${list}\n\nYou can keep refining the angle later, for example "lean into business value" or "compress it into a 3-page PPT deck".`
  }
  return `<!-- project-brain:executive-briefing-ready -->\n<!-- project-brain:scenario ${projectBrainScenarioPayload('executive-briefing', 'confirm', { projectId: plan.project.id, projectName: plan.project.name, progress: plan.project.progress, materials })} -->\n## 所选材料已生成\n\n已按集团领导汇报口径整理完成：\n\n${list}\n\n后续可以继续补充口径，例如"更偏经营价值"或"压缩成 3 页 PPT"。`
}
