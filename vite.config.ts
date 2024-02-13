import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig( ( configEnv ) => {
  console.log( configEnv.mode );
  if ( configEnv.mode === 'production' ) {
    return {
      base: '/three-openll-labels/',
      build: {
        rollupOptions: {
          output: {
            dir: 'dist/demo'
          }
        }
      }
    };
  }

  if ( configEnv.mode === 'library' ) {
    return {
      plugins: [
        dts( {
          include: [ 'lib' ],
          rollupTypes: true,
          outDir: 'dist/lib'
        } )
      ],
      build: {
        copyPublicDir: false,
        lib: {
          entry: resolve( __dirname, 'lib/main.ts' ),
          formats: [ 'es' ],
          fileName: 'three-openll-labels'
        },
        rollupOptions: {
          external: [ 'three' ],
          output: {
            dir: 'dist/lib'
          }
        }
      }
    };
  }

  return {};
} );
