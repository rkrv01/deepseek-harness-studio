# Agent Note: Project Brain deterministic demo mode

Status: implemented

[English](2026-08-25-project-brain-deterministic-demo.md) | 中文

## Problem

项目智脑 preset 用于面向客户的演示，用户需要看到的是一条简洁的项目管理故事，而不是文件解析、工具调用或生成物的实时记录。早期实现把启动场景当作文档处理工作流：脚本读取上传资料，生成独立文件，再把确认片段塞回对话。这让 demo 依赖本地文件和工具输出，并把实现机制放在了产品故事前面。

目标场景是一种日常的项目智脑工作流。项目经理说一句话，检查一个可编辑的初始化方案，确认后继续进入会议跟进、项目托管、个人今日事项或领导汇报等正常项目工作。

## Decision

项目智脑的第一个场景是由 `@deepseek-ai/dsh-client-ui-project-brain` 拥有的浏览器端确定性 demo。当当前会话使用 `project-brain` agent preset 时，输入 dock 会提供一个轻量启动建议；点击它只填入输入框，不直接开始流程。对话提交处理器识别项目启动类措辞，并在消息进入 host prompt 之前消费这次发送。它追加固定场景消息，打开右侧工作台，并从内存中的项目智脑 store 渲染可编辑的项目基础信息、阶段、任务、风险、知识目录和后续动作。

启动场景不会向 host prompt 提交消息，所以 demo 状态可见时，当前选中 Session 可能仍是 blank。`ui-layout` 因此允许显式打开详情栏的操作为当前已选中 Session 渲染详情列，即使该 Session 仍是 blank；切换到另一个 Session 时仍会在绘制前关闭详情栏。

确认路径只更新 demo 状态。它说明项目已经在独立的项目智脑平台中初始化完成，并提供一个平台链接和若干弱化的后续动作入口。这些入口以日常使用的节奏准备后续场景：上传会议纪要、让 agent 托管项目、查看今天该做什么，或准备领导汇报。它们不在对话中模拟完整平台页面。

`apps/cli/config/agent-presets/project-brain/scripts/` 下的旧 preset 脚本被移除，场景 skill 只作为 CLI 兜底，提示用户回到 Web/Desktop demo。浏览器 demo 不读取文档内容，不创建本地目录，不生成 Word、Excel 或 Markdown 产物，不调用 visualize，也不依赖模型输出来完成脚本化启动场景。

## Alternatives considered

**由模型驱动启动方案生成。** 否决，因为 demo 场景需要稳定的节奏、稳定的文案和稳定的视觉布局。让模型综合生成阶段、任务和风险会让故事变化，并可能暴露观众无意关注的工具或推理细节。

**继续把文件到产物脚本作为主要 demo。** 否决，因为独立生成文件会把注意力从产品界面拉走，并要求维护与项目智脑平台场景无关的本地状态。

**确认后创建真实项目目录或本地文件。** 否决，因为已确认项目代表独立项目智脑平台中的状态。本地产物会传达错误的心智模型，并与平台承接发生竞争。

**把每个后续模块都渲染成另一段聊天模拟。** 否决，因为确认后的动作应该像正常下一步工作，而不是生硬的演示树。demo 将它们保留为轻量转场，之后可以连接到更多场景或真实平台。

## Testing

`packages/client/ui-project-brain/tests/state.client.spec.ts` 固定确定性场景状态：启动会创建固定项目方案，确认会生成面向平台的回执和后续动作，后续动作会准备跟进场景状态。`packages/client/ui-project-brain/tests/message-dock.client.spec.tsx` 固定启动建议只填入输入框，以及方案就绪后打开详情栏的效果。`packages/client/ui-conversation/tests/service-orchestration.client.spec.ts` 固定新的提交处理器拦截点，使 preset 客户端可以消费一次普通输入框发送，而不把它提交给 host prompt。`packages/client/ui-layout/tests/app-frame.client.spec.tsx` 固定已选中 blank Session 的详情栏行为。

客户端包 bundle、聚焦 TypeScript 构建和 GUI 测试套件覆盖包注册与浏览器组装路径。

## Consequences

demo 现在优先服务演示质感和产品叙事，而不是数据真实性。这对该 preset 是有意选择：上传文件和项目细节是场景中的视觉输入，不是权威数据源。

代价是第一个场景不是通用项目规划 agent。未来的生产级项目智脑流程需要一个单独实现，通过平台 API 读取真实平台数据、校验文档输入并持久化项目记录，而不是复用这个确定性 demo store。
