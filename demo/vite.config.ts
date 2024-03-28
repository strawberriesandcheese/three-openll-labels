import { resolve } from 'path';
import { defineConfig } from 'vite';
import markdownit from 'markdown-it';
import mdVitePlugin from 'vite-plugin-markdown';
import { Mode } from 'vite-plugin-markdown';
import mdAnchorPlugin from 'markdown-it-anchor';
import hljs from 'highlight.js';

// Actual default values
const md = markdownit( {
  highlight: function ( str, lang ) {
    if ( lang && hljs.getLanguage( lang ) ) {
      try {
        return hljs.highlight( str, { language: lang } ).value;
      } catch ( __ ) { }
    }

    return ''; // use external default escaping
  },
  html: true
} );
md.use( mdAnchorPlugin );

export default defineConfig( {
  base: '/three-openll-labels/',
  plugins: [ mdVitePlugin( {
    mode: [ Mode.HTML ],
    markdownIt: md

  } ) ],
  build: {
    rollupOptions: {
      input: {
        main: resolve( __dirname, 'index.html' ),
        start: resolve( __dirname, './subpages/start.html' ),
        triceratops: resolve( __dirname, './subpages/triceratops.html' ),
        documentation: resolve( __dirname, './subpages/documentation.html' ),
      },
      output: {
        dir: 'dist'
      }
    }
  },
  cacheDir: '../node_modules'
} );
