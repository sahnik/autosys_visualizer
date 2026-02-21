import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  optimizeDeps: {
    // sql.js WASM binary is imported separately via ?url suffix.
    // The JS entry (CJS/UMD) must be pre-bundled so Vite converts it to ESM for the browser.
  },
  build: {
    target: 'esnext',
  },
})
