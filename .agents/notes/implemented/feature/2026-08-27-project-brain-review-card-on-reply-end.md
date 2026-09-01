# Agent Note: Project Brain review cards appear when the reply ends

Status: implemented

English | [中文](2026-08-27-project-brain-review-card-on-reply-end.zh.md)

## Problem

The launch and meeting scenario review cards became visible only through submit-time timers (`14_000` ms and `7_000` ms measured from the moment the user message was sent). The timers raced the deterministic streams instead of following them: whenever a document streamed longer than its timer, the confirmation card appeared only after the text had already finished — the exact wait the demonstration was tuned to avoid — and slowing the streams would have made the mismatch worse because nothing flipped the phase once an over-long reply settled.

Pacing lived in two disagreeing places at the same time. The scenario registry declared `{128 chars / 300 ms}` for every document while the demo adapter secretly streamed meeting analysis on a separate hardcoded `{192 chars / 220 ms}` track (~870 chars/s), so the registered meeting row was dead configuration and could not be tuned from the registry.

## Decision

Review readiness is event-driven. The analysis replies carry their private markers in the step data, so when the owning assistant turn ends and its `ProjectBrainTurnTail` mounts, one effect flips `analyzing`/`revising` to `review-ready` for both the project-launch and meeting-actions scenarios; the store actions keep their existing phase guards, which also prevents stale turns from dragging a completed session backwards. The two submit-time constants, their five `setTimeout` call sites, and the workbench revision timer are deleted.

Stream pacing has one source: `scenarios.json`. The adapter resolves each reply kind to its owning scenario definition (new exported pure helper `replyStreamScenario`) and runs a single chunked-text generator that optionally opens with the scenario's thinking preamble; the bespoke execution-receipt and platform-retry presentations are unchanged. All five scenarios now stream visibly slower (~320 chars/s, meeting ~500) so long documents stay readable during the leadership demo.

## Verification

Focused Vitest suites for the demo adapter and browser plugin cover kind-to-scenario pacing resolution, the slowed registry values, and new TurnTail cases asserting that mounting an analysis turn flips the phase and renders the confirmation card without any timer. TypeScript builds of `ui-conversation`, `ui-project-brain`, and `project-brain-demo` pass together. A real-browser flow remains the checkpoint for perceived pacing before each demonstration.

## Alternatives considered

**Rebalance the fixed timers against stream duration.** Rejected because it reintroduces the race with every content or pacing edit, which is how the 7 s / 14 s values drifted in the first place.

**Expose stream completion through the turn data.** Rejected because the turn tail only exists after the turn ends, so mount time already is the completion signal; plumbing a new flag would add protocol surface without changing observable behavior.

## Consequences

Confirmation cards now appear directly under the analysis text as soon as the stream settles, history restore keeps working because it reuses the same marker-based ownership rules, and future pacing changes are one `scenarios.json` row away. In exchange, runtime pacing depends solely on registry values, so deleting a scenario id must update the kind-mapping table alongside the registry.

## Follow-up: trailing payloads also streamed at visible pace (2026-08-27, same day)

The event-driven flip exposed a second delay source that had been hidden inside the old numbers: the meeting analysis document ends with a ~10 KB percent-encoded `project-brain:scenario` payload, and `streamScenarioText` was chunking the whole text — so after the last visible character the adapter kept crawling through kilobytes of invisible marker for several more seconds before finishing the turn. End to end the meeting flow took ~28 s with a ~20 s silent tail.

`streamScenarioText` now splits off any trailing run of `<!-- project-brain:* -->` markers (`splitTrailingPrivateMarkers`) and attaches them in one unpaced delta, so the turn finishes right after the last visible character while every delta still concatenates to the original byte-for-byte stream. Measured on the live demo: reply wall time dropped from ~28 s to ~8 s and the confirmation card mounts immediately. The first regex attempt failed silently because real markers embed a keyword plus a space before the encoded payload (`scenario %7B...`), which the value charset rejected; the pattern now models `<keyword> [space payload]` explicitly, and a fake-clock regression test pins both delta fidelity and the post-visible-char budget. A practical restart lesson from verifying this fix: always confirm the listening PID's start time after a port-bound server "restart", because a short-circuited shell chain can leave the old process serving stale code with no error anywhere.

## Follow-up 2: demo content pass per scenario briefs (2026-08-27, same day)

A second demo-tuning round reshaped the input area and three scenario surfaces. Shortcuts now render permanently above the composer (guarded only by preset and empty draft) so one scenario flows into the next; the composer placeholder and the drag overlay gained project-brain-specific copy describing mixed image-and-document intake; document chips cap at 280px so long names ellipsize. Meeting revisions now send a `projectPlanRevision`-style readable summary with a `revision-summary` payload, reusing the existing collapsible details projection. The copilot scenario answers 「现状怎么样」 with an agent-manager dashboard (status strip, AI-tracking list with executed actions, findings-only anomalies, condensed decisions, low-emphasis overview), and the my-day workbench became a cross-project orchestration panel (numbered ordering across three projects, deferred area, done-today area, completion-driven reorder notice). The briefing review card now presents six selectable materials with four defaults and generates only the chosen set; the receipt restores the selection from its persisted confirm payload. Registry pacing for the briefing scenario slowed to ~230 chars/s.

## Follow-up 3: real presentation files embedded for downloads (2026-08-27, same day)

The briefing downloads were switched from client-generated placeholders to the three fixed presentation files (口头稿.md, 风险与协调事项.xlsx, PPT提纲.pptx), embedded verbatim into `src/briefing-assets.ts` as base64 constants generated from the presentation folder. `createBriefingMaterialBlob` now decodes those bytes (actual file content, correct MIME types) instead of fabricating minimal OOXML; the card offers all three preselected, generates only the chosen ones, and the receipt adds a one-click download of the whole selection. Regeneration note lives in the generated file header.

## Follow-up 4: seven demo-polish fixes (2026-08-27, same day)

- Drag overlay copy: the mixed image-and-document text was wired but its package bundle (`ui-attachment`) had not been rebuilt after the label change — rebuilt together with a unit test pinning the documents branch.
- Workbench date picker popover now renders an opaque white background (the elevated token carries alpha, letting the editor beneath bleed through).
- Copilot dashboard is narrowed to the chat column (no more whole-width bleed) and its 项目全貌 area gained proper inner padding, a fixed three-column grid, and vertical attention rows.
- Ordering flip: the copilot handoff text carries only the surface marker, and the AI verdict/actions/decision/next narrative render as a conversation-style 小结 bubble below the dashboard.
- My-day右栏 deferred/done blocks got their missing horizontal margins.
- The briefing material picker gained real checkbox row styling (previously referenced CSS classes that did not exist).

## Follow-up 5: configurable platform origin + interaction polish (2026-08-27, same day)

- A settings namespace `project-brain` (host-registered with a schemastery schema) now owns `platformBaseUrl`; 设置 gains a 智脑平台 section (settings.section slot) bound through `ctx.settingsScope`. Every platform link (进入项目智脑, launch receipt link, my-day 打开任务, origin matching in the tab-reuse interceptor) and the demo-status connector now derive from this one configured origin; connector URL = config override or `${base}/demo-control/`.
- Briefing picker button moved to the card header top-right; the receipt dropped its 演示数据 footnote.
- My-day primary actions became a single 打开任务 link that opens the platform workbench route.
- The copilot AI wrap-up moved OUT of the dashboard and renders as its own conversation-style block beneath the board.
- The composer placeholder mentions drag-upload in every state.
- Cordis hardened: both host and client plugins declare `settings`/`settingsScope` in `inject` (an undeclared access fails load), and settings namespaces must be kebab-case — two boot crashes caught and fixed.

## Follow-up 6: round-three demo fixes (2026-08-27, same day)

- Briefing picker card is a column now: header (title left, 生成所选材料 right) sits on top and the material list spans the full width below — the card had been a flex row that put header and list side by side.
- The receipt dropped its remaining 固定演示文件 span (footer keeps only 一键全部下载, right-aligned). The older 演示数据 line the user still reported was a stale bundle, cleared by rebuild + restart.
- The demo-status URL is config-only and resolved live. `DemoStatusSynchronizer` takes `string | (() => string)` and re-resolves per call: plugin `demoStatusApiUrl` config wins, otherwise `${智脑平台 platformBaseUrl}/demo-control/`. The real root cause of "the configured address does not take effect" was a hardcoded `demoStatusApiUrl` in `packages/bundle/web-app/cordis.patch.yml` overriding the settings value at every boot — removed; keep the override only for a genuinely separate endpoint. Every call logs `[project-brain-demo] demo-status: <endpoint> enabled=` server-side, and the client logs the resolved endpoint when an initialization turn mounts, so DevTools shows the address being used.
- The copilot AI wrap-up is real reply text: `projectCopilotSurface()` streams a markdown 小结 (same four sections as the old card) as the assistant message, and the board mounts beneath it from the surface marker; the HTML narrative card and its CSS are deleted.
- The copilot board container gains `padding: 20px` plus a staggered block reveal (nth-child delays, ~1.5 s total, zeroed under reduced motion), and the 今日发现 panel body shares a `.panelBody` padding with the other panels.
- The my-day 打开任务 link now shares the button styling (radius 10px, no underline) after the switch to an `<a>`.
- My-day and the copilot board both use `.surfaceNarrow`, so the two boards render at the same width.

## Follow-up 7: split addresses, dev-gated settings, board-first wrap-up (2026-08-27, same day)

- The business origin (`platformBaseUrl`, links render `${base}/business-xmzn/#/...`) and the demo-status API base (`demoApiBaseUrl`, endpoint = `${base}/api/demo/config`) are now separate settings fields with separate defaults — the business origin may sit behind a proxy that is awkward to debug locally. `PROJECT_BRAIN_DEMO_STATUS_PATH` is the single endpoint-suffix constant; `DemoStatusSynchronizer` keeps receiving a base and appends the path exactly once (an earlier draft returned a full endpoint from the getter and double-appended).
- The settings section became 开发者配置 and is hidden by default: the `settings.section` slot is registered dynamically by an effect that watches `localStorage['starlight:dev-mode']`; the console command `window.toStarlightDev()` sets the key and re-evaluates, and a 关闭开发者模式 button inside the section removes it until the command runs again. Static registration leaked an empty navigation entry, which is why registration itself is conditional.
- The copilot dashboard dropped the 托管权限模式 switcher, and the AI wrap-up moved back out of the reply text: the reply is the bare surface marker again, and the surface renders board first, then a conversation-style 小结 bubble (`.narrativeBubble`) beneath it — the user wanted the visual order board → dialogue.

## Follow-up 8: inline board above real wrap-up prose (2026-08-27, same day)

The copilot wrap-up is a real assistant message again, but ordered board-first: the reply opens with the surface marker, and ui-conversation gained an optional `assistantSurface` service (same shape as `chatFileMentions`) that `AssistantMarkdown` consults when the FIRST text block opens with a complete `project-brain:surface` marker — the payload renders as an inline board at the top of the message, and the strips prose that follows streams as ordinary markdown beneath it. The turn tail returns null for copilot-surface turns so the board is not duplicated; other surfaces (my-day trailing marker) keep the turn-tail mount. `streamScenarioText` gained the symmetric leading-marker rule: a leading run of private markers attaches unpaced so the board mounts before the first visible character. The board container switched from the narrow breakout class to `.surfaceInline` (message width, no bleed). The dashboard also dropped its previous bubble variant, `.copilotGrid` padding is now `20px 0` (vertical padding kept), and the 项目全貌 section gained status accents: package cards get a left color bar by status and overview counts a stop-light tone (完成/正常/低风险 green, 临期/中风险 amber, 滞后/高风险 red).

## Follow-up 9: framework convergence — hidden entries, temporary dev mode, optional fixed workspace (2026-08-27, same day)

- The sidebar now ships only 插件中心/插件发现: the Preset 广场 and 应用中心 sidebar entries plus their primary pages are no longer registered (they were plain unconditional registrations in ui-plugin-center; client plugins receive no cordis patch config, so this is a source-level demo convergence, not a config flag). The trajectory conversation tab is likewise not registered anymore (data view, compaction, and session-log projections stay — only the UI tab is dropped, so ConversationSession's `tabs.length > 1` rule hides the whole tab row).
- Developer mode became strictly temporary: `isProjectBrainDevMode()` is session-resident state (module boolean + event), reloads always close it, and the 关闭开发者模式 button is gone — there is nothing to persist and no way to leave it on.
- The fixed-workspace switch is a `project-brain` settings field (`fixedWorkspace`, default false) exposed in the developer section. When armed, the demo plugin creates `~/starlight_xmzn` and its titled workspace record, then the gateway locks: create ignores the request path, rename/delete return the new `workspace-readonly` error code, list returns only the fixed directory. A `fixedWorkspaceControl` cordis service carries the switch so the tsdown demo bundle and the source-run gateway share one instance (module state would split across the two module graphs); `IWorkspaces` gained a public `refresh()` so the browser re-lists on toggle.

## Follow-up 10: copilot supplier-risk decision receipt (2026-08-31)

The project-copilot dashboard keeps risk facts and the recommendation but no longer mutates local “handled” state. Its owning assistant turn now carries a two-choice decision card. A choice submits readable user text plus the existing private `project-brain:scenario` confirm envelope, constrained to `decision-1` and either `wait-for-confirmation` or `start-backup-supplier`. The deterministic adapter returns an explicitly marked assistant receipt for that selection; `ProjectBrainTurnTail` reconstructs the conditional-plan or backup-supplier result card only from the receipt's private envelope, so persisted history preserves the decision without exposing private data or performing a real platform write.
