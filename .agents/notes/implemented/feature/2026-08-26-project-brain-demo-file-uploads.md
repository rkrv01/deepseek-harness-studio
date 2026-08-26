# Agent Note: Project Brain demo file uploads

Status: implemented

English | [中文](2026-08-26-project-brain-demo-file-uploads.zh.md)

## Problem

The Project Brain scenarios needed visible file context and downloadable executive-report deliverables for a leadership demonstration, but the composer deliberately had no file picker or upload protocol. A real storage, parsing, and persistence path would exceed the demo scope and create product promises that the mock scenario engine cannot honor.

## Decision

Project Brain sessions route paste and whole-page drops through a mixed intake path and show an explicit paperclip control beside the command launcher. Its hidden multi-file picker accepts images and `.txt`, `.md`, `.markdown`, `.doc`, `.docx`, `.xls`, `.xlsx`, and `.pdf`. An unsupported document rejects the complete batch before registration; supported images keep the existing image intake limits and previews.

Documents remain runtime-only composer chips. Successful registration puts ordered draft ids into input state; submit requests carry `documentIds` and `{ name, type, size }` `documentMetas`. Only the Project Brain launch-plan handler consumes those metas and stores them in its deterministic plan snapshot. Document bytes stay in the browser: no parser reads them, no provider request includes them, and neither the wire payload nor durable history persists them. Successful ordinary admission releases their registrations, while ordinary sessions continue using image-only intake.

The executive-briefing receipt renders four configured files as an accessible list with kind badges, names, presentation sizes, and download actions. Clicking download creates a local Blob: Markdown uses UTF-8 text, while Word, PowerPoint, and Excel use `fflate` store-mode ZIP packages containing minimal OOXML parts. The object URL is revoked immediately after the synthetic click, and the card labels the contents as presentation-only demo data.

## Verification

Focused Conversation, Attachment, and Project Brain tests cover mixed paste/drop routing, unsupported-batch rejection, document chips, submit-request ids and metadata, handler-to-plan propagation, material MIME types and OOXML contents, download interaction, and unchanged ordinary-session image routing. The combined run completed with 44 files and 559 tests passing; TypeScript compilation is checked separately.

## Alternatives considered

**Hand-write the Office ZIP encoder.** Rejected because `fflate` is maintained, already available to workspace JavaScript, and handles the store-mode packaging edge cases better than a second local writer.

**Generate materials on the server.** Rejected because the requirement is a frontend demonstration and server generation would imply durable artifacts, authorization, lifecycle ownership, and cleanup that this demo intentionally does not provide.

**Upload and parse documents like production attachments.** Rejected because the demo needs visible context only. Parsing arbitrary Word, Excel, and PDF bytes would add security and compatibility obligations without improving the scripted scenarios.

## Consequences

The demonstration can attach representative documents and hand leaders four downloadable artifacts without backend work. In exchange, documents influence only deterministic scenario snapshots, disappear across reload, cannot be reopened from history, and must not be presented as real uploads or authoritative report files.
