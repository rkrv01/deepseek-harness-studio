# Starlight Harness Desktop Packaging

This guide covers packaging, acceptance, and delivery for the Starlight Harness demo. Development and desktop feature details are in [README.md](README.md).

## Scope

- macOS: arm64 DMG, unsigned and notarized only when credentials are configured.
- Windows: x64 NSIS installer; SmartScreen may warn without Authenticode.
- Linux: no distribution installer in this release.
- Application name: `Starlight Harness`.
- Electron identity: `ai.starlight.harness.desktop`.
- Online updates: disabled for the demo; no update feed or `app-update.yml` is required.

## Build

Run commands from the repository root with the declared Node and pnpm versions. Install dependencies first:

```sh
pnpm install
```

The build regenerates the FF–LLM Wiki frontend, workspace artifacts, and the closed production Host dependency tree. `apps/desktop/runtime-host/` and `apps/desktop/dist/` are generated directories.

For a quick unpacked application preview:

```sh
pnpm run package:desktop
```

For a macOS demo DMG and ZIP:

```sh
pnpm run dist:mac:desktop
```

For a Windows x64 NSIS installer:

```sh
pnpm run dist:win:desktop
```

The Windows artifact is named `Starlight-Harness-Desktop-Windows-x64-<version>-Setup.exe`. Calculate its delivery checksum with:

```sh
shasum -a 256 apps/desktop/dist/Starlight-Harness-Desktop-Windows-x64-*-Setup.exe
```

## Acceptance

Run the focused packaging tests and desktop typecheck before delivery:

```sh
pnpm exec vitest run \
  packages/experimental/project-brain-demo/tests/scenario.spec.ts \
  apps/desktop/tests/verify-packaged-runtime.spec.ts
pnpm --filter @deepseek-ai/dsh-desktop run typecheck
```

The packaging hook checks the Host, Web frontend, platform native modules, and pinned pnpm runtime. Project Brain Demo must import the UI package's published `./scenario` entry. Staging removes workspace `src/` files, and `afterPack` rejects an artifact containing `@deepseek-ai/dsh-client-ui-project-brain/src/`.

On macOS, verify the title, icon, tray behavior, quit and reopen flow. On Windows, verify a custom installation directory, desktop and Start menu shortcuts, launch, uninstall while running, and reinstall. The demo uses a separate application identity, installation directory, shortcuts, and user-data root, so it can coexist with an installed `DeepSeek Harness`.

## Delivery limitations

State the platform, version, file size, and SHA-256 with each artifact. Explain that demo builds may be unsigned, macOS builds may be notarized only with credentials, Windows builds may trigger SmartScreen, and online updates are unavailable. If installation fails with `Cannot find module .../src/project-data.ts`, rebuild the published `lib/scenario.js` entry and regenerate both the Project Brain Demo and installer; do not copy workspace `src/` files into the package.
