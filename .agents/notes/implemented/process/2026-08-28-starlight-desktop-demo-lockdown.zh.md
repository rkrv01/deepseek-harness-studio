# Agent Note: 收敛 Starlight 桌面演示版配置

Status: implemented

English | [English](2026-08-28-starlight-desktop-demo-lockdown.md)

## Problem

Starlight 桌面演示版需要保持普通用户可见范围固定，同时为演示操作人员保留受控的项目智脑配置入口。

## Decision

Starlight 桌面演示版默认使用官方原版背景并启用固定工作区。产品中心导航继续注册，但由项目智脑设置中的四个独立字段控制显示，默认全部关闭。应用菜单中的主进程密码验证只向演示操作人员开放这些配置。

## Alternatives considered

**默认展示全部产品中心入口。** 这会让普通用户看到内部演示配置入口。

**把开发者配置放在 renderer 中。** 这会让打包后的 renderer 代码持有密码和配置门禁，而不是由主进程完成验证。

## Consequences

演示用户获得更小且固定的产品界面，操作人员仍可按需打开单独的产品中心入口。开发者配置仍是受保护的演示路径，不会自动打开 DevTools。
