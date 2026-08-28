import { clientBundle } from '../tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-client-ui-project-brain',
  ['lib/types/index.js', 'lib/types/invariant.js'],
  {
    companions: [{
      entry: ['lib/types/scenario.js'],
      outDir: 'lib',
      format: ['esm'],
      platform: 'node',
      target: 'es2024',
      fixedExtension: false,
      dts: false,
      clean: false,
    }],
  },
)
