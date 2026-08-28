# Agent Note: 分阶段发布跨平台桌面预览版

Status: implemented

[English](2026-08-16-staged-desktop-preview-release.md) | 中文

## Problem

开发预览版需要先提供可立即评审的 macOS 包，再由原生 Windows runner 构建 Windows 包。签名桌面发布工作流依赖两个平台的签名环境，并且只在两个任务都完成后发布，因此无法表达从已验收 macOS 应用载荷开始、明确不签名的预览发布流程。

## Decision

预览版使用不可变的 `desktop-preview-v<version>` 标签和全新的预发布 Release。macOS arm64 ZIP 从该标签对应的代码在本地构建并优先上传。仅支持手动触发的 Windows 预览工作流检出同一个标签，验证 Release 名称、附件名称和已验收 `app.asar` 的 SHA-256，然后下载该 macOS ZIP。

Starlight Harness 演示预览版使用独立的 Electron 身份、可见应用名、安装包名、快捷方式和用户数据根目录。它不配置在线更新源，因此打包预览版在没有 `app-update.yml` 时仍能通过运行时校验，设置界面会显示在线更新不可用。未提供发布凭据时，macOS 预览构建会禁用证书自动发现并生成未签名演示产物；提供凭据时，签名构建仍使用现有 Developer ID 与公证预检查。

Windows runner 会提取已验收的跨平台应用载荷，暂存其中的 Host 与桌面资源，构建未签名的 Windows x64 Electron 外壳和 NSIS 安装程序，并恢复字节完全一致的 `app.asar`。随后，它会静默安装产物、确认打包 Host 已启动，再执行静默卸载。只有这些检查全部通过后，工作流才会把安装程序、可选 blockmap、校验和与验证回执保留在 Actions artifact 中，而已有预发布 Release 只附加安装程序。工作流不会覆盖任何现有 Release 附件。签名 `desktop-v<version>` 工作流继续作为正式发布路径。

暂存的 Host 保留已发布的 JavaScript 与包元数据，但不包含工作区的 `src/` 目录。需要复用 Project Brain UI 场景数据的 Host 代码因此通过 UI 包已发布的 `./scenario` 入口导入。Electron Builder 的 `afterPack` 检查会拒绝 Project Brain Host 入口仍引用该未随包分发的 UI 源码路径的应用。

如果 Windows 策略拒绝未签名 Host 进程创建 junction，profile fallback 会复制目标包并记录所有权标记。带标记的复制目录会在后续启动中复用，并在安装目标移动时替换；没有标记的真实目录仍视为错误。

## Alternatives considered

**每次预览都使用签名发布工作流。** 普通预览会被 Apple 公证和 Windows Authenticode 密钥阻塞，而且 macOS 评审必须等待两个平台任务都完成。

**基于持续变化的默认分支独立构建 Windows。** 若 macOS 包验收后默认分支继续变化，两个平台可能包含不同的应用代码。

**不做原生冒烟测试就附加 Windows 安装程序。** 打包命令成功无法证明安装程序、打包 Host 启动和卸载程序能在 Windows 上正常工作。

**只替换可见标签和图标。** 这会让预览包继续共享上游应用的 bundle 身份、安装目录、快捷方式、更新身份或用户数据根目录，从而使它与已安装上游版本的共存关系变得含糊。

## Consequences

评审者可以在 Windows runner 完成前先取得 macOS 预览包，同时两个平台仍使用相同的应用载荷。Windows 预览版只有在取得原生安装、Host 启动与卸载证据后才会发布，但公开下载列表只包含用户可以运行的两个文件；技术证据由维护者从保留的 Actions artifact 获取。这些预览包仍是未签名的开发产物；签名公开发布仍必须使用正式发布工作流及其签名环境。

演示版可以与已经安装上游桌面应用的机器共存。演示用户仍会看到 macOS 和 Windows 对未签名产物的系统提示；在线更新需要后续配置 Starlight 专用更新源后才能启用。
