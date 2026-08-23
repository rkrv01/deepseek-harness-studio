/** @deepseek-ai/dsh-host-plugin-center — package-owned invariant companion. @module @deepseek-ai/dsh-host-plugin-center/invariant */

import { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-host-plugin-center'

export const name = 'host-plugin-center-invariant'
export const inject = ['invariants']

const install: InvariantInstaller = () => {}

export function apply(ctx: Context): void {
  ctx.invariants.register(PACKAGE_NAME, install)
}
