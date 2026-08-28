# Agent Note: meeting confirm turns on the platform demo and task-creation switches

Status: implemented

English | [中文](2026-08-27-project-brain-meeting-platform-sync.zh.md)

## Problem

The project-launch flow (流程一) turns the platform demo switch on through the Host-side execution receipt: after the initialization steps stream, a four-second pause, `synchronizeDemoStatus(true)`, and a「平台模拟数据已加载」tail with a `platform-ready` marker complete the hand-off to the business platform. The meeting flow (流程二) had no equivalent: its「确认执行」button only updated local state (`applyMeetingItems` in the browser store), so the platform never learned that AI-created tasks existed — the 任务管理 module had no reason to load the meeting-derived task rows.

The status client only understood the master switch. `DemoStatusSynchronizer.ensure(enabled)` read `demoEnabled` from `GET /api/demo/config` and toggled it via `POST /api/demo/config` when the read state differed; there was no path for the per-item `POST /api/demo/toggle {key}` endpoint, so the「AI 任务创建」item (`aiTaskCreated`) could not be driven from the demo at all.

## Decision

The meeting execution receipt now performs the same platform hand-off as the launch receipt. `streamProjectBrainReply` routes `meeting-receipt` replies into a new exported generator `streamMeetingExecutionReceipt`: it paces the receipt's visible body with the meeting-actions scenario rhythm, streams「正在同步会议任务数据到项目智脑平台，请稍候…」, waits the shared four-second `PROJECT_EXECUTION_SYNC_DELAY_MS`, then turns on both switches — the master via the existing `ensure(true)` and the task-creation item via the new `ensureItem('aiTaskCreated', true)` — followed by the same「平台模拟数据已加载」tail and `platform-ready`/`platform-failed` markers the launch flow uses. The meeting-private markers (`meeting-executed` + the confirm envelope) attach last, so the client's completion card keeps mounting at the end of the reply; the client locates those markers by substring search, not position.

`demo-status.ts` gained the per-item capability: `demoItemToggleEndpoint(baseUrl)` builds the reverse-proxy-aware `api/demo/toggle` endpoint, `ensureDemoItem(baseUrl, key, enabled, fetchImpl)` reads `config[key]` from the shared config endpoint and toggles only when the read state differs (then verifies the settled state), and `DemoStatusSynchronizer.ensureItem(key, enabled)` queues behind the same serialized `tail` as `ensure`. The wiring sites pass both callbacks (`synchronizeDemoStatus`, `synchronizeDemoItem`) into the adapter and the `llm/stream` handler.

## Verification

`demo-status.spec.ts` covers the item endpoint prefix, idempotent reads (two GETs, zero toggles), the GET→POST→GET toggle sequence with the `{key}` body, HTTP 400 propagation, and the still-different rejection. `scenario.spec.ts` covers both `streamMeetingExecutionReceipt` paths with a fake clock: the success path asserts both callbacks fire (`true` and `('aiTaskCreated', true)`) and that `platform-ready` precedes the meeting markers; the failure path asserts `platform-failed` and that the item callback is not reached. The live demo-status service exposes exactly `demoEnabled` and `aiTaskCreated`, matching the constant.

## Alternatives considered

**Toggle search order: `POST /api/demo/ai-task` (compat) instead of `/api/demo/toggle {key}`.** Rejected because the generic per-key endpoint is the documented protocol for demo items; the compat route exists only for the H5 control page's own button.

**Silent enable at confirm time.** Rejected because the demo's visible hand-off (syncing line → loaded tail → `platform-ready`) is the same contract the launch flow already establishes, and the user asked for the same base address and behavior as 流程一.

## Consequences

Meeting execution now leaves the platform in a real observable state: master demo data ON and AI task creation ON, so the business platform can serve the meeting-derived tasks after「确认执行」. The two switches are driven separately, so a future item (beyond `aiTaskCreated`) needs only another `ensureItem` call. The meeting receipt gained ~6 s of runtime (pacing + the four-second pause) before its completion card, consistent with the launch receipt; `streamScenarioText` is untouched because the receipt is paced manually like the execution receipt.

## Follow-up: local http endpoints reachable under the self-signed bypass (2026-08-27, same day)

Repointing the 接口地址 to a local `http://127.0.0.1:9006` made every synchronization call fail before the request. `createDemoStatusFetch`'s self-signed bypass routed every URL through `node:https`, which rejects plain http with `ERR_INVALID_PROTOCOL` — so the launch-plan pre-close (「平台模拟数据暂不可用」) and the meeting confirm hand-off both threw at the fetch step, while the server log proved the configured address resolved and the local uvicorn was listening. The bypass now engages only for `https:` URLs and lets http hosts fall through to the global fetch (new spec: self-signed on + http address still takes the plain-fetch path). The developer settings section also gained an 接口连通性测试 area: a 测试连接 button (GET config → echo `demoEnabled`/`aiTaskCreated` + HTTP code) plus 切换模拟数据 and 切换AI任务创建 buttons (POST toggles, then re-read), so address reachability can be checked from the browser against the 9006 debugging server — browsers cannot bypass https self-signed certificates, so the remote default endpoint will show the certificate error in the probe output, which is expected and itself diagnostic.