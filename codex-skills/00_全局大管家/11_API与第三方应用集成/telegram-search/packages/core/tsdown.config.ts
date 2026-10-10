import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types/index.ts',
  ],
  dts: true,
  sourcemap: true,
  unused: true,
  fixedExtension: true,
})
