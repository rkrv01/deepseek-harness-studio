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

The build regenerates the FF–LLM Wiki frontend, workspace artifacts, and the closed production Host dependency tree. `apps/desktop/runtime-host/` and `apps/desktop/dist/` are generated directories. Release delivery files are grouped under `apps/desktop/dist/windows/` and `apps/desktop/dist/mac/`.

Runtime staging prunes declarations, source maps, package documentation, test/example directories, and native packages for other platforms or architectures. It keeps JavaScript and TypeScript runtime files because some Host packages use published ESM imports that resolve source files at startup. The target platform and architecture are selected by `DSH_DESKTOP_TARGET_PLATFORM` and `DSH_DESKTOP_TARGET_ARCH` during staging.

The demo uses normal NSIS compression to reduce installer CPU and extraction time on test machines. This can make the installer slightly larger than maximum compression, but it does not change the installed runtime or its file count.

For a quick unpacked application preview:

```sh
pnpm run package:desktop
```

To remove Starlight Harness before a first-install test, double-click `apps/desktop/uninstall-starlight-harness.bat`. It stops the app, runs its NSIS uninstaller, then removes remaining Starlight user data, web profile, shortcuts, and uninstall registry records, while leaving DeepSeek Harness paths untouched.

For a macOS demo DMG and ZIP:

```sh
pnpm run dist:mac:desktop
```

macOS delivery also includes `uninstall.command` and `Starlight-Harness-macOS-<architecture>-delivery.zip`. Double-click `uninstall.command`, enter `YES`, and it will quit and remove the Starlight Harness app, preferences, caches, logs, saved state, and the `web` profile. It does not remove DeepSeek Harness. The delivery ZIP contains the DMG and this cleanup script for first-install testing.

Windows and macOS taskbar/tray icons use `resources/trayTemplate.png`, matching the Starlight logo used by the installers.

For a Windows x64 NSIS installer and bundled uninstall script:

```sh
pnpm run dist:win:desktop
```

Each Windows release removes previous Windows delivery files, then creates `apps/desktop/dist/windows/` containing the simple-named installer `Starlight-Harness-Windows-<version>.exe`, the uninstaller helper `uninstall.bat`, and `Starlight-Harness-Windows-<version>.zip`. The ZIP contains the installer and uninstaller helper together. macOS releases similarly place the DMG, app ZIP, blockmaps, `uninstall.command`, and `Starlight-Harness-macOS-<architecture>-delivery.zip` under `apps/desktop/dist/mac/` with simple names. Calculate the Windows delivery checksum with:

```sh
shasum -a 256 apps/desktop/dist/windows/Starlight-Harness-Windows-*.zip
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

On Windows, the Host normally creates junctions under the Harness profile fallback. If a security product blocks junction creation for the unsigned process, the boot path copies the target package and records a marker so later starts can reuse it. Unmarked real directories still fail loudly.

On macOS, verify the title, icon, tray behavior, quit and reopen flow. On Windows, verify a custom installation directory, desktop and Start menu shortcuts, launch, uninstall while running, and reinstall. The demo uses a separate application identity, installation directory, shortcuts, and user-data root, so it can coexist with an installed `DeepSeek Harness`.

## Delivery limitations

State the platform, version, file size, and SHA-256 with each artifact. Explain that demo builds may be unsigned, macOS builds may be notarized only with credentials, Windows builds may trigger SmartScreen, and online updates are unavailable. If installation fails with `Cannot find module .../src/project-data.ts`, rebuild the published `lib/scenario.js` entry and regenerate both the Project Brain Demo and installer; do not copy workspace `src/` files into the package.
# Starlight Harness Desktop Demo Configuration

The demo build suppresses the internal-testing notice, uses the official original appearance, and enables the single fixed workspace by default. Plugin Center, Plugin Discovery, Preset Square, and Application Center are hidden by default and can be enabled independently from Developer Configuration after entering the password `Starlight2026@321` through the application menu.

Developer Mode is session-only and does not open DevTools. Reinstall the newly generated macOS or Windows artifact after packaging changes.
