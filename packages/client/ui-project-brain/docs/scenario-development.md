# 项目智脑场景开发指南

本文档是项目智脑演示场景的实现约定。目标是让场景内容保持配置化，共用一套对话生命周期，并仅在确实需要具体交互界面时增加 React 模板。

## 选择展示模式

| 模式 | 适用场景 | 主要输出 | 常见改动 |
|---|---|---|---|
| `document` | 分析、方案、会议结果、汇报和确认流程 | Markdown、表格、Mermaid 图表、消息卡片 | 场景注册、模拟数据、确定性回复 |
| `surface` | 看板、个人工作台、交互列表和任务操作 | 在助手消息中渲染的白名单 React 界面 | 场景注册、模拟数据、一个命名界面模板 |

`surface` 通过 React 生成真实 HTML 界面。场景数据不得包含可执行 HTML、脚本、行内事件或任意组件名称。白名单模板负责渲染、可访问性、响应式布局和交互。

默认使用 `document`。只有直接操作或可视化分组是演示价值的重要组成部分时，才选择 `surface`。

## 文件职责

| 文件 | 职责 | 场景开发者是否可以修改 |
|---|---|---|
| [`../src/scenarios.json`](../src/scenarios.json) | 场景身份、触发词、文案、展示模式、流式节奏、确认文案和执行步骤 | 可以 |
| [`../src/project-data.ts`](../src/project-data.ts) | 共享的项目、任务、会议、风险和知识模拟数据 | 可以，但必须保证跨场景一致 |
| [`../../../experimental/project-brain-demo/src/scenario.ts`](../../../experimental/project-brain-demo/src/scenario.ts) | 确定性文档回复和界面数据组装 | 可以，但仅增加场景自身输出 |
| [`../src/client/ProjectBrainScenarioSurface.tsx`](../src/client/ProjectBrainScenarioSurface.tsx) | 具体交互界面的白名单和实现 | 仅在新增 `surface` 模板时修改 |
| [`../src/scenario-registry.ts`](../src/scenario-registry.ts) | 注册类型、场景匹配和私有消息载荷 | 仅在新增场景 ID 或修改共用协议时修改 |
| [`../src/client/index.ts`](../src/client/index.ts) | 共用提交路由和按会话隔离的状态 | 纯内容场景不得修改 |
| [`../src/client/ProjectBrainTurnTail.tsx`](../src/client/ProjectBrainTurnTail.tsx) | 共用的消息归属卡片和历史恢复 | 除非增加新的可复用卡片类别，否则不得修改 |

场景不得增加另一套全局触发树、消息协议、会话状态仓库、流式引擎或历史消息渲染器。应扩展场景注册表和现有确定性适配器。

## 演示附件与汇报包

项目智脑会话支持前端模拟级文件交互。输入框负责显式上传按钮、格式过滤和图片／文档分流；项目智脑提交处理器只接收 `{ name, type, size }` 元数据，并把它写入项目导入方案的快照。文件字节不进入解析器、模型请求、服务端或持久化日志。

集团领导汇报场景的结果卡使用 [`../src/client/briefing-materials.ts`](../src/client/briefing-materials.ts) 的固定清单。Word、PPT 和 Excel 文件由浏览器端以 store-only ZIP 打包最小 OOXML 结构生成，Markdown 文件由 UTF-8 文本生成；下载只是本地 Blob 交互。修改清单或模板时必须同步测试，不得把演示输出伪装成真实业务归档。

## 标准开发流程

### 1. 定义场景

在 `scenarios.json` 中增加或补全一个条目。触发词重叠时，较高的 `priority` 优先。

```json
{
  "id": "executive-briefing",
  "priority": 10,
  "title": "准备集团领导汇报",
  "suggestion": "下周要给集团领导汇报，帮我准备好",
  "triggers": [{ "all": ["汇报"], "any": ["领导", "集团"] }],
  "thinking": "正在汇总项目进展、成果、关键风险和待决策事项…",
  "presentation": { "mode": "document", "template": "executive-briefing" },
  "stream": { "introDelayMs": 900, "chunkChars": 112, "intervalMs": 350 },
  "review": {
    "title": "汇报材料已就绪",
    "summary": "可继续调整口径与详细程度",
    "confirmLabel": "确认汇报材料",
    "editLabel": "调整汇报重点"
  },
  "execution": {
    "title": "正在生成汇报包",
    "steps": ["整理领导摘要", "生成数据图表", "归集待决策事项"]
  }
}
```

使用多组具体触发条件，不要依赖一个宽泛关键词。必须测试与高优先级场景重叠的输入。如果新增的不是当前已登记的五个 ID，需要同时在 `scenario-registry.ts` 的 `ProjectBrainScenarioId` 中补充 ID。

### 2. 准备一致的模拟数据

项目、阶段、任务、会议、风险和知识信息统一复用 `project-data.ts`。只有不代表共享业务实体的界面数据才可以放在场景内部。

同一业务实体在所有场景中的 ID、名称、负责人、日期、状态和数量必须一致。指标可以从共享数据计算，不得在组件中复制并修改第二份项目快照。

演示数据保持确定性。除非场景说明明确增加外部演示接口，否则不得读取或创建真实项目文件、目录、任务或平台数据。

### 3A. 生成文档型场景

在确定性适配器中增加一个回复生成函数。函数可以组合 Markdown 表格、Mermaid 图表、摘要以及共用的确认或执行数据。通过 `matchProjectBrainScenario(prompt)` 或共用的修订与确认载荷进入该函数。

回复生成函数保持纯函数形式：输入模拟数据或编辑后的场景数据，输出一个字符串。不要加入工具调用过程。可见进度应使用简洁的业务语言。

需要确认或编辑时，使用 `projectBrainScenarioPayload(scenarioId, action, payload)` 携带更新数据。私有标记保存在持久消息中，用于确定性重放，但不会出现在气泡和复制文本中。

### 3B. 生成交互界面型场景

将 `presentation.mode` 设置为 `surface`，并选择稳定的模板名称。在 `ProjectBrainScenarioSurface.tsx` 中增加数据类型、运行时校验和组件，再加入一个白名单分支：

```tsx
if (surface.template === 'project-copilot-dashboard' && isProjectCopilotData(surface.data)) {
  return <ProjectCopilotDashboard data={surface.data} />
}
```

确定性适配器先输出简短的可读说明，再附带编码后的界面数据：

```ts
return `项目托管视图已经准备好。\n\n<!-- project-brain:surface ${projectBrainSurfacePayload(
  'project-copilot',
  'project-copilot-dashboard',
  data,
)} -->`
```

组件必须提供可访问区域名称、窄聊天列响应式布局、可通过键盘操作的控件和空状态。演示性交互可以使用组件本地状态。需要持久化的修改必须通过共用修订或确认载荷提交，不能直接修改其他会话的状态。

### 4. 仅在演示确实需要时增加编辑器

存在确认文案不代表必须开发编辑器。纯内容确认卡片可以直接确认当前数据。

确实需要批量编辑时，将草稿保存在该场景的会话状态中，保留原助手消息，提交一条可读的用户修改摘要，并通过共用私有载荷附带更新数据。重新打开编辑器时必须恢复最新确认或修订后的数据。

项目方案字段继续使用现有项目编辑器，会议行动项继续使用现有会议编辑器。只有出现不同的业务数据类型时，才新增编辑器。

### 5. 保证消息归属和历史恢复

确认、执行、失败和结果卡片必须渲染在拥有对应标记的助手消息下方，不得固定在输入框区域。重新加载历史消息后，应恢复相同卡片或界面。

私有 `project-brain:*` 标记不得在流式输出、最终 Markdown、用户气泡或复制内容中出现。引入需要兼容的旧标记时，应扩展严格的消息投影白名单；新场景优先使用通用 `scenario` 和 `surface` 载荷。

看板中的待决策事项不得用本地“已处理”状态伪造闭环。选择必须提交一条可读的用户消息和受控 `scenario / confirm` 载荷；确定性回复在同一载荷中返回选择结果，`ProjectBrainTurnTail` 只在该结果助手消息下恢复回执卡。演示分支只描述模拟动作，不得创建真实任务、通知或平台写入。

## 剩余场景建议

| 场景 | 推荐首版 | 自定义代码范围 |
|---|---|---|
| AI 项目托管 | `surface`：项目健康摘要、延期里程碑、风险变化和待协调事项 | 一个 `project-copilot-dashboard` 模板及数据校验，复用共用确认与执行流程 |
| 我今天到底该干什么 | `surface`：按优先级、原因、截止时间分组的个人工作台，支持完成交互 | 已实现 `my-day-workbench`，后续通常只修改数据或样式 |
| 集团领导汇报 | `document`：领导摘要、进度与预算图、成果、风险、待决策事项和下一步计划 | 一个确定性文档生成函数；只有需要选择汇报页或交互演练时才增加界面模板 |

首版只交付足以支撑演示的最小闭环。后续入口可以提交下一个已配置提示词，但不得为了占位增加不完整的平行工作流。

## 测试要求

每项行为变化都需要对应的聚焦测试：

- 场景注册：目标输入匹配正确场景，重叠输入遵守优先级。
- 确定性回复：输出使用共享模拟数据，并包含预期私有载荷。
- 文档模式：标题、数量以及修订后的确认或结果标记正确。
- 界面模式：有效数据渲染命名区域，非法数据或未知模板不渲染，主要交互可用。
- 历史恢复：重新加载或切换会话后，归属卡片、修订数据和交互界面仍然存在。
- 私有数据：完整或流式中的部分私有标记都不会出现在渲染和复制内容中。
- 布局：宽聊天列和窄聊天列均不溢出。

运行覆盖本次改动包的聚焦检查；场景交付过程不得运行格式化或 lint 命令。

```sh
pnpm exec tsc -b packages/client/ui-conversation/tsconfig.json packages/client/ui-project-brain/tsconfig.json packages/experimental/project-brain-demo/tsconfig.json --pretty false
pnpm exec vitest run packages/client/ui-project-brain/tests packages/experimental/project-brain-demo/tests/scenario.spec.ts packages/client/ui-conversation/tests/project-brain-revision-message.client.spec.ts
git diff --check
```

在 `test1` 工作区新建对话完成一次浏览器流程：提交快捷指令，观察思考与流式输出，验证最终文档或界面，操作存在的编辑或确认功能，重新加载会话，再验证历史结果。

## 完成检查表

- 场景文案和触发词位于 `scenarios.json`。
- 业务实体复用共享模拟数据。
- 场景使用 `document` 或一个命名 `surface` 模板。
- 共用客户端文件中没有新增场景专用路由或全局状态仓库。
- 确认和结果控件归属于对应助手消息。
- 私有标记在流式输出、历史消息和复制内容中均不可见。
- 聚焦测试、TypeScript 检查、`git diff --check` 和 `test1` 浏览器流程通过。
- 没有包含构建产物、本地服务残留、凭据或无关工作区文件。

## 交给其他 Agent 的任务模板

复制以下内容并替换尖括号中的信息：

```text
请按照 packages/client/ui-project-brain/docs/scenario-development.md 开发项目智脑场景：<场景 ID 和名称>。

场景目标：<一句话描述用户要完成的事情>
演示输入：<用户在对话中发送的句子>
展示模式：<document 或 surface；如果是 surface，填写模板名称>
模拟数据来源：<共享数据字段或资料路径>
需要确认或编辑的内容：<没有则填写“无”>
确认后的演示结果：<执行进度和最终卡片>

必须复用 scenarios.json、scenario-registry.ts、按会话状态和现有私有载荷，不得增加独立触发树、全局状态仓库或固定在输入框区域的结果卡片。完成后在 test1 新建会话验证流式输出、宽窄布局和历史消息恢复，不要提交 Git。
```
