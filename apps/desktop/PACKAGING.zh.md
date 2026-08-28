# Starlight Harness 桌面打包手册

本文只覆盖 Starlight Harness Demo 的桌面打包、验收和交付。开发态启动与桌面功能说明见 [README.zh.md](README.zh.md)。

## 打包范围

- macOS：arm64 DMG，未配置凭据时为未签名、未公证演示包。
- Windows：x64 NSIS 安装包，未配置 Authenticode 时可能触发 SmartScreen。
- Linux：本次不生成发行安装包。
- 应用名：`Starlight Harness`。
- Electron 身份：`ai.starlight.harness.desktop`。
- 在线更新：Demo 暂未开放，不需要更新源或 `app-update.yml`。

## 环境要求

在仓库根目录执行命令，并使用项目声明的 Node 与 pnpm 版本。首次打包前安装依赖：

```sh
pnpm install
```

打包会重建 FF–LLM Wiki 前端、仓库产物和 Host 生产依赖树。`apps/desktop/runtime-host/` 与 `apps/desktop/dist/` 是生成目录，不是发布源文件。

## 本地预览包

生成当前平台的未封装应用，用于快速启动检查：

```sh
pnpm run package:desktop
```

生成目录位于 `apps/desktop/dist/`。首次启动重点检查窗口标题、图标、托盘菜单和 Host 是否成功进入就绪状态。

## macOS DMG

在 macOS 上生成演示 DMG 和 ZIP：

```sh
pnpm run dist:mac:desktop
```

没有 `Developer ID Application` 和公证凭据时，系统可能阻止首次打开。测试用户可在系统设置中允许该应用运行。正式分发前需要完成代码签名、hardened runtime 和 notarization；签名配置方法见 [README.md](README.md#macos-demo-dmg-and-zip)。

## Windows x64 安装包

生成可选择安装目录的 NSIS 安装器：

```sh
pnpm run dist:win:desktop
```

产物名称为：

```text
Starlight-Harness-Desktop-Windows-x64-<version>-Setup.exe
```

测试交付前计算 SHA-256：

```sh
shasum -a 256 apps/desktop/dist/Starlight-Harness-Desktop-Windows-x64-*-Setup.exe
```

Windows 测试重点检查自定义安装目录、桌面快捷方式、开始菜单、运行中卸载、重新安装，以及是否仍能启动 Host。未配置 Authenticode 时，核对 SHA-256 后可在 SmartScreen 中选择“更多信息”→“仍要运行”，不应关闭 Defender。

## 打包前后的验收

运行聚焦测试和桌面类型检查：

```sh
pnpm exec vitest run \
  packages/experimental/project-brain-demo/tests/scenario.spec.ts \
  apps/desktop/tests/verify-packaged-runtime.spec.ts
pnpm --filter @deepseek-ai/dsh-desktop run typecheck
```

打包校验会确认 Host、Web 前端、平台原生模块和 pnpm 版本都存在。Project Brain Demo 只能引用 UI 包发布的 `./scenario` 入口；暂存运行时会移除工作区 `src/` 文件，因此 `afterPack` 会拒绝包含以下引用的产物：

```text
@deepseek-ai/dsh-client-ui-project-brain/src/
```

如果安装后出现 `Cannot find module .../src/project-data.ts`，不要通过复制 `src/` 目录掩盖问题。应重新构建 `@deepseek-ai/dsh-client-ui-project-brain` 的 `lib/scenario.js`，再重建 Project Brain Demo 和安装包。

## 交付信息

交付安装包时同时提供平台、版本、文件大小和 SHA-256。明确说明 Demo 未签名、macOS 未公证、Windows 未配置 Authenticode，以及在线更新暂不可用。安装包与已有 `DeepSeek Harness` 使用不同的应用身份、安装目录、快捷方式和用户数据根目录，可以并存。
