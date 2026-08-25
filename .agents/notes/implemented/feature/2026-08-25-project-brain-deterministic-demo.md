# Agent Note: Project Brain deterministic demo mode

Status: implemented

English | [中文](2026-08-25-project-brain-deterministic-demo.zh.md)

## Problem

The Project Brain preset is used for customer-facing demonstrations where the user needs to see a concise project-management story, not a live transcript of file parsing, tool calls, or generated artifacts. The earlier implementation treated the launch scene like a document-processing workflow: scripts read uploaded materials, generated separate files, and then pushed a confirmation fragment back into the conversation. That made the demo sensitive to local files and tool output, and it centered implementation mechanics instead of the product story.

The intended scene is a daily Project Brain workflow. A project manager says one sentence, reviews an editable initialization plan, confirms it, and then continues into normal project work such as meeting follow-up, project hosting, personal tasks, or leadership reporting.

## Decision

Project Brain's first scene is a deterministic browser-side demo owned by `@deepseek-ai/dsh-client-ui-project-brain`. When the active session uses the `project-brain` agent preset, the input dock offers a small launch suggestion that fills the composer instead of starting the flow directly. The conversation submit handler recognizes project-launch wording and consumes the composer send before it reaches the host prompt. It appends fixed scenario messages, opens a right-side workbench, and renders editable project basics, stages, tasks, risks, knowledge folders, and next actions from the in-memory Project Brain store.

The launch scene does not admit a host prompt, so the selected Session may still be blank while the demo state is visible. `ui-layout` therefore allows an explicit details-open action to render the details column for the current selected Session even while it is blank; switching to another Session still closes details before paint.

The confirmation path updates only the demo state. It states that the project has been initialized in the independent Project Brain platform and offers a single platform link plus small next-action entries. The entries prepare the later scenes in the same everyday rhythm: upload meeting minutes, let the agent host the project, inspect today's work, or prepare a leadership briefing. They do not simulate full platform pages inside the conversation.

The old preset scripts under `apps/cli/config/agent-presets/project-brain/scripts/` are removed, and the scenario skill is a CLI fallback that points users back to the Web/Desktop demo. The browser demo does not read document contents, create local directories, generate Word/Excel/Markdown artifacts, call visualize, or depend on model output for the scripted launch scene.

## Alternatives considered

**Model-driven launch generation.** Rejected because a demo scene needs stable pacing, stable copy, and stable visual layout. Letting the model synthesize stages, tasks, and risks would vary the story and could surface tool or reasoning details the audience is not meant to watch.

**Keep file-to-artifact scripts as the primary demo.** Rejected because separate generated files pull attention away from the product surface and require local state that is irrelevant to the Project Brain platform scenario.

**Create a real project directory or local files after confirmation.** Rejected because the confirmed project represents state inside the independent Project Brain platform. Local artifacts would teach the wrong mental model and compete with the platform handoff.

**Render every downstream module as another chat simulation.** Rejected because the post-confirmation actions should feel like normal next work, not a forced presentation tree. The demo keeps them as lightweight transitions that can be wired to later scenarios or the platform.

## Testing

`packages/client/ui-project-brain/tests/state.client.spec.ts` pins the deterministic scenario state: launch creates the fixed project plan, confirmation produces the expected platform-oriented receipt and next actions, and a next action prepares the follow-up scene state. `packages/client/ui-project-brain/tests/message-dock.client.spec.tsx` pins the launch suggestion as composer-fill behavior and the plan-ready details-open effect. `packages/client/ui-conversation/tests/service-orchestration.client.spec.ts` pins the new submit-handler interception seam so a preset client can consume a plain composer send without admitting a host prompt. `packages/client/ui-layout/tests/app-frame.client.spec.tsx` pins the selected-blank Session details behavior.

The client package bundle, focused TypeScript build, and GUI test suite cover the package registration and browser assembly path.

## Consequences

The demo now optimizes for presentation quality and product narrative rather than data fidelity. That is intentional for this preset: uploaded files and project details are visual inputs to the scenario, not authoritative sources.

The cost is that the first scene is not a general project-planning agent. A future production Project Brain flow needs a separate implementation that reads real platform data, validates document inputs, and persists project records through platform APIs instead of reusing this deterministic demo store.
