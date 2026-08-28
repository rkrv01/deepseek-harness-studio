# Agent Note: Prune non-runtime desktop payload

Status: implemented

English | [中文](2026-08-28-prune-desktop-runtime-payload.zh.md)

## Problem

The Desktop Host staging tree included declarations, source maps, package documentation, tests, examples, and native binaries for platforms and architectures that the release could not execute. The resulting Windows demo contained roughly 30,000 files and expanded to about 548 MB before packaging, increasing installer time and security-scanner work.

## Decision

The staging step removes compile-time metadata, package documentation, test/example directories, and explicitly identified non-target native packages. It retains runtime JavaScript, TypeScript, package manifests, frontend assets, and the native packages for the requested platform and architecture. Windows x64 keeps its Sharp, Canvas, Koffi, ripgrep, SQLite, and node-pty assets; macOS uses the corresponding target assets. The target is passed through `DSH_DESKTOP_TARGET_PLATFORM` and `DSH_DESKTOP_TARGET_ARCH`.

The pruner does not delete all `.ts` or `.tsx` files. Published Host modules can contain ESM imports that resolve a source file at startup, so source removal remains protected by the packaged runtime checks and startup tests.

## Alternatives considered

**Delete every TypeScript file from the staging tree.** This gives a larger apparent reduction but can make a packaged Host fail during module resolution when a published entry imports a source file.

**Keep every optional native package.** This avoids platform-selection logic but duplicates large binaries for platforms and architectures that cannot run in the current artifact.

**Move dependencies into a first-launch download or extraction step.** This could reduce the installer payload, but it adds network, permissions, offline, and first-run failure modes that are not appropriate for the demo delivery flow.

## Consequences

Windows x64 staging measured about 356 MB and 25,761 files after the first conservative pass, compared with about 548 MB and 30,000 files before it. The reduction lowers installer I/O and scanning work while preserving the existing closed runtime dependency tree. Native platform filtering must be updated when a new optional native dependency is introduced, and every packaging change still requires the focused staging and packaged-runtime checks.
