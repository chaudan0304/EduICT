import './server/ai/bootstrapEnv.js'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { sqliteApiPlugin } from './server/vite-sqlite-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sqliteApiPlugin()],
  // Packaging output must not reload a teacher's open, possibly unsaved lesson.
  server: { watch: { ignored: ['**/desktop/.stage/**', '**/release/**', '**/dist/**', '**/scratch/**'] } },
})
