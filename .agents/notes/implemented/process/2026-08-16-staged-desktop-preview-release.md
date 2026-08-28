# Agent Note: Stage cross-platform desktop preview releases

Status: implemented

English | [中文](2026-08-16-staged-desktop-preview-release.zh.md)

## Problem

Development previews need a macOS package that can be reviewed immediately and a Windows package built on a native Windows runner. The signed desktop release workflow requires both platform-signing environments and publishes only after both jobs finish, so it cannot represent a deliberately unsigned preview that starts from an already accepted macOS application payload.

## Decision

A preview uses an immutable `desktop-preview-v<version>` tag and a new prerelease. The macOS arm64 ZIP is built locally from that tag and uploaded first. The dispatch-only Windows preview workflow checks out the same tag, validates the release name, asset name, and accepted `app.asar` SHA-256, then downloads that exact macOS ZIP.

The Starlight Harness demo preview uses its own Electron identity, visible application name, installer names, shortcuts, and user-data root. It does not configure an online-update feed, so packaged preview builds pass runtime verification without `app-update.yml`, and the settings UI reports updates as unavailable. macOS preview builds without release credentials disable certificate auto-discovery and produce unsigned demo artifacts; a signed build still uses the existing Developer ID and notarization preflight when credentials are supplied.

The Windows runner extracts the accepted platform-neutral application payload, stages its Host and desktop resources, builds an unsigned Windows x64 Electron shell and NSIS installer, and restores the byte-exact accepted `app.asar`. It silently installs the result, observes the packaged Host, and silently uninstalls it. Only after those checks pass does the workflow retain the installer, optional blockmap, checksum, and verification receipt in an Actions artifact while attaching only the installer to the existing prerelease. Existing release assets are never overwritten. The signed `desktop-v<version>` workflow remains the formal release path.

The staged Host retains published JavaScript and package metadata, but omits workspace `src/` trees. Host code that reuses Project Brain UI scenario data therefore imports the UI package's published `./scenario` entry. The Electron Builder `afterPack` check rejects an application whose Project Brain Host entry still imports that unshipped UI source path.

## Alternatives considered

**Use the signed release workflow for every preview.** This blocks ordinary preview delivery on Apple notarization and Windows Authenticode secrets and delays macOS review until both platform jobs finish.

**Build Windows independently from the current default branch.** The resulting platforms could contain different application code when the branch moves after the macOS package was accepted.

**Attach the Windows installer without a native smoke test.** A successful package command does not prove that the installer, packaged Host startup, and uninstaller work on Windows.

**Only replace the visible label and icon.** This would leave preview packages sharing the upstream application's bundle identity, installation directory, shortcuts, update identity, or user-data root, making coexistence with an installed upstream build ambiguous.

## Consequences

Reviewers can receive the macOS preview before the Windows runner finishes while both platforms retain the same application payload. Windows preview publication is conditional on native install, Host-start, and uninstall evidence, but the public download list contains only the two files users can run. Technical evidence remains available to maintainers through the retained Actions artifact. These preview packages remain unsigned development artifacts; signed public releases still require the formal release workflow and its signing environments.

The demo can coexist with machines that already have the upstream desktop application installed. Demo users still receive operating-system warnings for unsigned macOS and Windows artifacts, and online updates require a later Starlight-specific feed before they can be enabled.
