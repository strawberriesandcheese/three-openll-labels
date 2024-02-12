import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig( ( configEnv ) => {
  if ( configEnv.mode === 'production' ) {
    return {
      base: '/three-openll-labels/'
    };
  }

  if ( configEnv.mode === 'library' ) {
    return {
      build: {
        lib: {
          entry: resolve( __dirname, 'lib/main.ts' ),
          formats: [ 'es' ]
        }
      }
    };
  }

  return {};
} );
