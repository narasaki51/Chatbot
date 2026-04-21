import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscator from 'vite-plugin-javascript-obfuscator'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 배포 빌드 시에만 난독화 적용
    obfuscator({
      apply: 'build', // build 시에만 실행
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        numbersToExpressions: true,
        simplify: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        splitStrings: true,
        splitStringsChunkLength: 10,
        rotateStringArray: true,
        selfDefending: true,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: true,
        debugProtectionInterval: 2000,
      },
    }),
  ],
  build: {
    sourcemap: false, // 소스 맵 완전 제거
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion', 'lucide-react', 'socket.io-client'],
        },
      },
    },
  },
})
