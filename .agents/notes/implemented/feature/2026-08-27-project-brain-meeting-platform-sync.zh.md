# Agent Note：会议确认执行后开启平台模拟数据与任务创建开关

Status: implemented

[English](2026-08-27-project-brain-meeting-platform-sync.md) | 中文

## 问题

项目初始化流程（流程一）通过 Host 侧执行回执完成与业务平台的交接：初始化步骤播完后停顿四秒、`synchronizeDemoStatus(true)`、「平台模拟数据已加载」尾段与 `platform-ready` 标记收尾。会议流程（流程二）没有同等逻辑：它的「确认执行」按钮只更新本地状态（浏览器 store 里的 `applyMeetingItems`），平台完全不知道有 AI 创建的任务——任务管理模块没有理由加载会议拆解出的任务行。

状态客户端原本只认识主开关。`DemoStatusSynchronizer.ensure(enabled)` 从 `GET /api/demo/config` 读 `demoEnabled`，状态不一致时用 `POST /api/demo/config` 取反；没有任何路径走按项的 `POST /api/demo/toggle {key}` 接口，所以「AI 任务创建」这项（`aiTaskCreated`）根本无法由 demo 驱动。

## 决策

会议执行回执现在执行与初始化回执相同的平台交接。`streamProjectBrainReply` 把 `meeting-receipt` 回复路由到新导出的生成器 `streamMeetingExecutionReceipt`：按 meeting-actions 场景节奏播放回执可见正文，流出「正在同步会议任务数据到项目智脑平台，请稍候…」，等待共用的四秒常量 `PROJECT_EXECUTION_SYNC_DELAY_MS`，然后同时打开两个开关——主开关走已有的 `ensure(true)`，任务创建项走新增的 `ensureItem('aiTaskCreated', true)`——最后追加与流程一同款的「平台模拟数据已加载」尾段与 `platform-ready`/`platform-failed` 标记。会议私有标记（`meeting-executed` 与 confirm envelope）最后附加，客户端完成卡片仍在回复末尾挂载；客户端的标记定位是子串查找，与位置无关。

`demo-status.ts` 增加了按项能力：`demoItemToggleEndpoint(baseUrl)` 构建保留反向代理前缀的 `api/demo/toggle` 端点；`ensureDemoItem(baseUrl, key, enabled, fetchImpl)` 从共享的 config 端点读 `config[key]`，仅当读到的状态不一致时才取反（随后校验落定状态）；`DemoStatusSynchronizer.ensureItem(key, enabled)` 与 `ensure` 共用同一条串行 `tail` 队列。接线处把两个回调（`synchronizeDemoStatus`、`synchronizeDemoItem`）同时注入 adapter 与 `llm/stream` 处理器。

## 验证

`demo-status.spec.ts` 覆盖模拟项端点前缀保真、幂等读取（两次 GET、零取反）、GET→POST→GET 取反序列与 `{key}` 请求体、HTTP 400 传播、以及取反后仍不一致的拒绝。`scenario.spec.ts` 用假时钟覆盖 `streamMeetingExecutionReceipt` 两条路径：成功路径断言两个回调都被调用（`true` 与 `('aiTaskCreated', true)`）、`platform-ready` 先于会议标记；失败路径断言 `platform-failed` 且模拟项回调未被触达。线上 demo-status 服务恰好暴露 `demoEnabled` 与 `aiTaskCreated` 两个键，与常量一致。

## 备选方案

**优先使用 `POST /api/demo/ai-task`（兼容接口）而不是 `/api/demo/toggle {key}`。** 未采纳：按 key 的通用端点才是文档规定的模拟项协议；兼容接口只服务于 H5 控制页自身的按钮。

**确认时就静默开启。** 未采纳：可见的交接呈现（同步播报 → 已加载尾段 → `platform-ready`）是流程一已经建立的同一契约，且用户明确要求与流程一同地址、同行为。

## 后果

会议执行后平台进入真实可观察的状态：主模拟数据开启、AI 任务创建开启，业务平台可以在「确认执行」后按会议拆解数据提供任务。两个开关分开驱动，未来新增模拟项只需再接一个 `ensureItem` 调用。会议回执在完成卡片之前增加约 6 秒运行时间（节奏播放 + 四秒停顿），与初始化回执一致；`streamScenarioText` 未改动，因为回执与执行回执一样手工按节奏播放。

## Follow-up：自签豁免下本地 http 地址可通（2026-08-27 同日）

把「接口地址」改成本地 `http://127.0.0.1:9006` 后，所有同步调用都在发请求前失败。`createDemoStatusFetch` 的自签豁免把每个 URL 都丢给 `node:https`，而它拒绝纯 http（ERR_INVALID_PROTOCOL）——于是初始化前「关闭模拟数据」（平台模拟数据暂不可用）与会议确认后的开关交接都在 fetch 一步抛错，服务端日志却证明配置地址已解析、本地 uvicorn 也在监听。现在豁免路径只在 `https:` 协议下启用，http 主机回落到全局 `fetch`（新 spec：自签开启 + http 地址仍走普通 fetch）。开发者配置还新增「接口连通性测试」区：一个「测试连接」按钮（GET config → 回显 `demoEnabled`/`aiTaskCreated` 与 HTTP 码），外加「切换模拟数据」「切换AI任务创建」按钮（POST 取反后重新读取）——可以在浏览器里对 9006 调试服务验证地址可达性。浏览器无法绕过 https 自签证书，线上默认端点会在测试输出里显示证书错误，属预期且本身就有诊断价值。