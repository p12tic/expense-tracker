import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// django manage.py starts server on port 8000 by default
const proxy = new URL('http://localhost:8000');

const proxyTargetHttp = proxy.href.replace(/\/*$/, ''); // trim trailing slashes

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: proxyTargetHttp,
        headers: {
          'Host': proxy.host,
          'Origin': proxyTargetHttp,
        },
        // note that changeOrigin does not work for POST requests
      },
    },
  },
})
