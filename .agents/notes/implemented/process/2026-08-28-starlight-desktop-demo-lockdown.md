# Agent Note: Lock down the Starlight desktop demo

Status: implemented

English | [中文](2026-08-28-starlight-desktop-demo-lockdown.zh.md)

## Problem

The Starlight desktop demo needs a constrained default experience while retaining controlled access to project-brain settings for demo operators.

## Decision

The Starlight desktop demo uses the official appearance and a fixed workspace by default. Product-center navigation remains registered but is hidden by four independent project-brain settings, all defaulting to false. A main-process password gate exposes those settings through the application menu for the demo operator.

## Alternatives considered

**Expose all product-center navigation by default.** This would make internal demo configuration visible to ordinary users.

**Keep the developer settings in the renderer.** This would expose the password and configuration gate to packaged renderer code instead of keeping verification in the main process.

## Consequences

Demo users receive a smaller, fixed product surface, while operators can enable individual product-center entries when needed. Developer configuration remains a privileged demo path and does not automatically open DevTools.
