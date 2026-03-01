import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AcmeDeskWidget',
      fileName: 'widget',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined
      }
    },
    minify: 'esbuild',
    cssCodeSplit: false,
    assetsInlineLimit: 10000
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});
