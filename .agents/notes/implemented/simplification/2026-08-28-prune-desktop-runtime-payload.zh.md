# Agent Note: 裁剪桌面运行时非运行载荷

Status: implemented

[English](2026-08-28-prune-desktop-runtime-payload.md) | 中文

## Problem

桌面 Host 暂存目录中包含声明文件、source map、包文档、测试、示例，以及当前发行平台和架构无法执行的原生二进制。Windows Demo 原先约有 3 万个文件，展开后约 548 MB，增加了安装器耗时和安全软件扫描负担。

## Decision

暂存阶段清理编译期元数据、包文档、测试/示例目录和明确识别出的非目标平台原生包，同时保留运行时 JavaScript、TypeScript、包清单、前端资源，以及目标平台和架构对应的原生依赖。Windows x64 保留 Sharp、Canvas、Koffi、ripgrep、SQLite 和 node-pty 的目标资源；macOS 保留对应目标资源。暂存目标通过 `DSH_DESKTOP_TARGET_PLATFORM` 和 `DSH_DESKTOP_TARGET_ARCH` 传入。

裁剪器不会按后缀删除所有 `.ts` 或 `.tsx` 文件。部分已发布 Host 模块启动时会通过 ESM 导入解析源码文件，因此源码删除仍由打包运行时检查和启动测试保护。

## Alternatives considered

**删除暂存目录中的全部 TypeScript 文件。** 这种方式表面上能减少更多体积，但已发布入口可能导入源码文件，导致打包后的 Host 在模块解析阶段启动失败。

**保留所有可选原生包。** 这不需要平台筛选逻辑，但会把当前产物无法执行的平台和架构的二进制重复带入安装包。

**改为首次启动下载或解压依赖。** 这可能减少安装包载荷，但会引入网络、权限、离线和首次启动失败问题，不适合当前 Demo 交付流程。

## Consequences

Windows x64 暂存目录第一阶段实测约为 356 MB、25,761 个文件，之前约为 548 MB、30,000 个文件。该裁剪降低了安装器文件 I/O 和安全扫描工作，同时保留现有闭合运行时依赖树。新增可选原生依赖时需要同步更新平台筛选规则，所有打包改动仍需通过暂存和打包运行时聚焦检查。
