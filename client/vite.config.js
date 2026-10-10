import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Writes /precache.json, a list of every built file. After the first visit, the service
// worker uses it to save every page for offline use.
function precacheList() {
  return {
    name: 'precache-list',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).map((fileName) => '/' + fileName)
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), precacheList()],
  build: {
    // Pages load on demand, so the only chunk above Vite's 500 kB default is the landing
    // page's 3D scene (three.js, ~925 kB). It loads lazily after the hero text.
    chunkSizeWarningLimit: 1000,
  },
})
