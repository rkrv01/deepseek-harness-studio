/** Fixed-workspace switch for the 项目智脑 demo: one workspace at `~/starlight_xmzn`. */

import { homedir } from 'node:os'
import { join } from 'node:path'

/** Display title of the fixed workspace. */
export const FIXED_WORKSPACE_TITLE = '项目智脑'

/** The one workspace directory across platforms: `~/starlight_xmzn` (mac), `%USERPROFILE%\starlight_xmzn` (windows). */
export function starlightFixedWorkspaceDir(): string {
  return join(homedir(), 'starlight_xmzn')
}

/**
 * Process-wide fixed-workspace switch, exposed as a cordis service so the
 * demo bootstrap bundle and the source-run gateway share one instance.
 * Defaults off: every existing multi-workspace behavior stays intact until
 * the developer settings toggle arms it.
 */
export interface FixedWorkspaceControl {
  /** Whether workspace.create/rename/delete/list are locked to the fixed directory. */
  isEnabled(): boolean
  /** Turn the fixed-workspace enforcement on or off. */
  setEnabled(enabled: boolean): void
}

/** Reference implementation the gateway installs when no provider composes one. */
export function createFixedWorkspaceControl(): FixedWorkspaceControl {
  let enabled = false
  return {
    isEnabled: () => enabled,
    setEnabled: (next: boolean) => { enabled = next },
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Fixed-workspace enforcement switch (project-brain demo); reach via ctx.get — optional. */
    fixedWorkspaceControl: FixedWorkspaceControl
  }
}
