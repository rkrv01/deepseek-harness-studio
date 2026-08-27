# 项目智脑独立调试页

脱离 dsh 聊天外壳的看板调试环境：直接改源码即可即时预览，或在上方“实时样式覆盖”输入自定义 CSS 即时看效果（存 localStorage，刷新保留）。

## 启动

```sh
cd apps/web && pnpm exec vite debug/pb --config debug/pb/vite.config.ts
```

打开 http://localhost:5174 。

## 内容

- 三个页签：托管看板（`ProjectCopilotDashboard`）、今日工作台（`MyDayWorkbench`）、会议分析数据占位。
- `tokens.css` 提供接近正式主题的 `--dsw-*` 基线；正式主题由插件注入，如需完全一致请对照 3080 会话。
- 数据源：`packages/client/ui-project-brain/src/project-data.ts`（改完热更新即时生效，无需刷新）。
- 组件源码：`packages/client/ui-project-brain/src/client/ProjectBrainScenarioSurface.tsx` 与同级 `*.module.css`。
- 本目录不进 pnpm 工作区，不参与仓库构建与门禁。