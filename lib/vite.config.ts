import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig( {
  plugins: [
    dts( {
      rollupTypes: true,
      outDir: 'dist'
    } )
  ],
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve( __dirname, 'source/main.ts' ),
      formats: [ 'es' ],
      fileName: 'three-openll-labels'
    },
    rollupOptions: {
      external: [ 'three' ],
      output: {
        dir: 'dist'
      }
    }
  }
} );
