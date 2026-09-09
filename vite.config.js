import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { sqliteApiPlugin } from './server/vite-sqlite-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sqliteApiPlugin()],
})
