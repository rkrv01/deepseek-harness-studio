# Agent Note: Configured Project Brain scenarios and named conversation surfaces

Status: implemented

English | [中文](2026-08-26-configured-project-brain-scenarios.zh.md)

## Problem

The Project Brain preset began with two scripted demonstrations whose trigger routing, lifecycle names, editor state, stream timing, message markers, and result cards were repeated across the browser plugin and deterministic model adapter. The browser also kept one mutable store for every session. Adding a scenario therefore required coordinated TypeScript and TSX edits, while switching sessions could erase or misattribute controls. This made the remaining demonstrations slower to deliver and made an interactive daily-work view especially likely to become another scenario-specific branch.

## Decision

Project Brain scenarios are catalogued in `packages/client/ui-project-brain/src/scenarios.json`. Each entry owns trigger phrases, thinking copy, presentation mode and named template, stream pacing, review labels, and execution steps. `scenario-registry.ts` is the single matcher and defines one versioned private envelope for revision and confirmation. The browser and deterministic adapter consume that registry instead of maintaining independent trigger trees.

The browser keeps one scenario store per session. The store uses shared lifecycle phases (`analyzing`, `review-ready`, `revising`, `executing`, `syncing`, `failed`, and `completed`) and carries scenario data such as the current project plan or meeting action items. Controls render only beneath the assistant turn whose strict private marker identifies that presentation. Historical turns reconstruct their review data from the same marker, and user-message projection removes private envelopes from rendering and copying.

Presentation has two modes. `document` uses the native Markdown and diagram renderer. `surface` names an allow-listed React template and supplies JSON data through a versioned marker. It does not execute arbitrary HTML from scenario data. `my-day-workbench` and `project-copilot-dashboard` prove that scenarios can present concrete interactive work views inside the conversation while their copy and data remain configuration- or fixture-owned. The `executive-briefing` scenario stays document-first, with a private confirmation marker and a compact receipt card, because its value is the prepared material rather than an editable control surface.

## Alternatives considered

**Continue adding one component and routing branch per scenario.** This preserves maximum local freedom, but repeats lifecycle and protocol behavior and makes every content-only demonstration a code change across the client and adapter.

**Store arbitrary HTML in scenario JSON.** This would make mockups quick to paste but gives up component consistency, accessibility, responsive behavior, type checking, and a safe rendering policy. Named React templates retain those properties while keeping scenario selection and data declarative.

**Use one global browser store and reset it on session changes.** This appears simpler but makes historical controls depend on whichever session was selected most recently. Session-keyed stores keep scenario state aligned with the session-scoped slots that render it.

## Consequences

The project-launch and meeting-actions demonstrations share routing, phases, private protocol, and session ownership. Meeting revisions now flow into their review card, confirmation payload, execution totals, and project snapshot instead of changing only the Markdown. The first five demo shortcuts use the registry suggestions and submit through the native composer, so scenario entry remains visible but not tied to fixed result areas. Future document-style scenarios normally add a registry entry, data, and a reply template; future interactive scenarios additionally add one named surface component. A genuinely new interaction pattern can still require TypeScript, but it does not require another submit router or scenario lifecycle.

The scenario registry and surface envelopes are internal demo formats with version `1`; unsupported versions are rejected. The in-memory session-store map intentionally lasts for the browser plugin lifetime and is not durable project state. Focused component and adapter tests pin trigger priority, private-message projection, revision continuity, dynamic meeting totals, and the named daily-work surface.
