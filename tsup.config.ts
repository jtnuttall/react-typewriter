import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: {
    compilerOptions: {
      // tsup's dts plugin injects baseUrl, which is deprecated in TS 7+
      ignoreDeprecations: '6.0',
    },
  },
  entry: ['src/index.tsx'],
  external: ['react', 'react-dom'],
  format: ['esm', 'cjs'],
});
