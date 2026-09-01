# Starlight AI助手 桌面打包手册

本文只覆盖 Starlight AI助手 Demo 的桌面打包、验收和交付。开发态启动与桌面功能说明见 [README.zh.md](README.zh.md)。

## 打包范围

- macOS：arm64 DMG，未配置凭据时为未签名、未公证演示包。
- Windows：x64 NSIS 安装包，未配置 Authenticode 时可能触发 SmartScreen。
- Linux：本次不生成发行安装包。
- 应用名：`Starlight AI助手`。
- Electron 身份：`ai.starlight.harness.desktop`。
- 在线更新：Demo 暂未开放，不需要更新源或 `app-update.yml`。

## 环境要求

在仓库根目录执行命令，并使用项目声明的 Node 与 pnpm 版本。首次打包前安装依赖：

```sh
pnpm install
```

打包会重建 FF–LLM Wiki 前端、仓库产物和 Host 生产依赖树。`apps/desktop/runtime-host/` 与 `apps/desktop/dist/` 是生成目录，不是发布源文件。最终交付文件统一放在 `apps/desktop/dist/windows/` 和 `apps/desktop/dist/mac/`。

暂存运行时会清理声明文件、source map、包文档、测试/示例目录，以及其他平台或架构的原生依赖，只保留当前目标平台的二进制文件。JavaScript 和 TypeScript 运行时文件不会按后缀全部删除，因为部分 Host 包启动时会通过发布后的 ESM 导入解析源码文件。暂存目标由 `DSH_DESKTOP_TARGET_PLATFORM` 和 `DSH_DESKTOP_TARGET_ARCH` 控制。

Demo 使用 NSIS 普通压缩级别，以减少测试机安装时的 CPU 解压和展开耗时。安装包体积可能略大于最高压缩级别，但不会改变安装后的运行时内容和文件数量。

## 本地预览包

生成当前平台的未封装应用，用于快速启动检查：

```sh
pnpm run package:desktop
```

生成目录位于 `apps/desktop/dist/`。首次启动重点检查窗口标题、图标、托盘菜单和 Host 是否成功进入就绪状态。

## Windows 全新安装测试

如果电脑已经安装过 Starlight AI助手，可双击运行 [uninstall-starlight-harness.bat](uninstall-starlight-harness.bat)。脚本会从安装注册表项读取实际目录，结束 Starlight 进程，调用已安装目录中的 NSIS 卸载程序，再删除 Starlight 残留安装目录、用户配置、`web` 工作档案、快捷方式和卸载注册表项，然后即可重新运行最新安装器。若应用目录被移动或是从其他电脑复制而来，可传入实际目录：`uninstall-starlight-harness.bat "D:\实际目录\Starlight AI助手"`。脚本不会删除内部 DSH 运行时数据；其中删除 `web` 工作档案会清空当前用户该工作档案下的测试数据。

旧版 `Starlight Harness` 已使用临时清理脚本处理，后续新版 Windows 交付包只包含当前 Starlight AI助手的卸载脚本，不再打包旧版清理脚本。

## macOS DMG

在 macOS 上生成演示 DMG 和 ZIP：

```sh
pnpm run dist:mac:desktop
```

没有 `Developer ID Application` 和公证凭据时，系统可能阻止首次打开。测试用户可在系统设置中允许该应用运行。正式分发前需要完成代码签名、hardened runtime 和 notarization；签名配置方法见 [README.md](README.md#macos-demo-dmg-and-zip)。

macOS 交付目录还包含 `uninstall.command` 和 `Starlight-AI-Assistant-macOS-<architecture>-delivery.zip`。双击 `uninstall.command` 后输入 `YES`，会退出并删除 Starlight AI助手应用、配置、缓存、日志、保存状态和 `web` 工作档案。交付 ZIP 包含 DMG 和该清理脚本，适合在下一次全新安装测试前使用。

如果旧版本仍残留为 `Starlight Harness.app`，可运行交付目录中的 `uninstall-old.command`，输入 `YES` 后清理旧版应用及旧版名称数据。该脚本不会删除当前 Starlight AI助手。

Windows 和 macOS 的任务栏/托盘图标统一使用 `resources/trayTemplate.png`，与安装器使用的 Starlight logo 保持一致。

## Windows x64 安装包

生成可选择安装目录的 NSIS 安装器：

```sh
pnpm run dist:win:desktop
```

Windows 交付目录为 `apps/desktop/dist/windows/`，包含以下文件：

```text
Starlight-AI-Assistant-Windows-<version>.exe
uninstall.bat
Starlight-AI-Assistant-Windows-<version>.zip
```

每次 Windows 打包会清理旧的 Windows 交付文件，并把安装包和卸载脚本一起放入 ZIP。macOS 的 DMG、ZIP 和 blockmap 统一放在 `apps/desktop/dist/mac/`，文件名使用 `Starlight-AI-Assistant-macOS-<architecture>.*`。测试交付前计算 Windows ZIP 的 SHA-256：

```sh
shasum -a 256 apps/desktop/dist/windows/Starlight-AI-Assistant-Windows-*.zip
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

Windows 上 Host 通常会在 Harness profile fallback 中创建 junction。如果安全软件拦截未签名进程创建 junction，启动流程会复制目标包并写入标记，后续启动可复用该复制目录；没有标记的真实目录仍会明确报错。

如果安装后出现 `Cannot find module .../src/project-data.ts`，不要通过复制 `src/` 目录掩盖问题。应重新构建 `@deepseek-ai/dsh-client-ui-project-brain` 的 `lib/scenario.js`，再重建 Project Brain Demo 和安装包。

## 交付信息

交付安装包时同时提供平台、版本、文件大小和 SHA-256。明确说明 Demo 未签名、macOS 未公证、Windows 未配置 Authenticode，以及在线更新暂不可用。安装包与已有 `DeepSeek Harness` 使用不同的应用身份、安装目录、快捷方式和用户数据根目录，可以并存。
# Starlight AI助手 桌面演示版配置

桌面演示版首次启动不显示内测声明，固定使用官方原版背景，并默认启用唯一工作区。插件中心、插件发现、Preset 广场和应用中心默认隐藏；通过菜单栏“开发者模式”并输入 `Starlight2026@321` 后，可在“开发者配置”中分别打开这些入口。

开发者模式只影响当前运行会话，不自动打开 DevTools。安装包更新后需重新安装新生成的 macOS 或 Windows 产物。

## 网页拉起与设置恢复

网页端接入代码和联调清单见 [WEB-INTEGRATION.zh.md](WEB-INTEGRATION.zh.md)。

安装后的桌面端会注册 `starlight-ai://` 协议。网页可以通过 `starlight-ai://open?source=business-xmzn` 请求打开当前应用；macOS 接收 `open-url` 事件，Windows 处理首次启动参数或第二实例参数。桌面端只接受 `open` 操作和允许列表中的来源，然后聚焦已有窗口。网页侧应使用 `blur` 或 `visibilitychange` 配合超时判断，因为浏览器协议确认弹窗和应用启动较慢会造成检测结果存在误差。

设置写入会在锁文件记录的进程已经退出时自动恢复孤儿 `settings.yaml.lock`，并清理中断原子写入留下的临时文件；仍存活的锁不会被删除。用户不需要删除 `settings.yaml`，如果保存仍然失败，开发者配置页面会显示写入错误，便于继续排查。
