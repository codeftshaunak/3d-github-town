import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      'process.env': JSON.stringify(env)
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      hmr: false,
      allowedHosts: ['.modal.host', '.modal.run', '.modal.sh', 'localhost', '127.0.0.1']
    }
  }
})
