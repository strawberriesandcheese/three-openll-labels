import { defineConfig } from 'vite';

export default defineConfig( {
  base: '/three-openll-labels/',
  build: {
    rollupOptions: {
      output: {
        dir: 'dist'
      }
    }
  },
  cacheDir: '../node_modules'
} );
