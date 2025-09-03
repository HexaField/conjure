import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import { nodeModulesPolyfillPlugin } from 'esbuild-plugins-node-modules-polyfill'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import babel from 'vite-plugin-babel'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
      plugins: [
        nodeModulesPolyfillPlugin({
          globals: {
            Buffer: true,
            process: true
          }
        }) as any
      ]
    }
  },
  worker: {
    format: 'es'
  },
  plugins: [
    nodePolyfills(),
    cssInjectedByJsPlugin(),
    viteCommonjs({
      include: ['use-sync-external-store']
    }),
    babel({
      babelConfig: {
        babelrc: false,
        configFile: false,
        plugins: [
          ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true }],
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-transform-private-methods'
        ]
      }
    })
  ],
  build: {
    sourcemap: 'inline',
    target: 'modules',
    minify: 'terser',
    lib: {
      entry: resolve(__dirname, './src/main.ts'),
      name: 'Main',
      fileName: 'main'
    },
    rollupOptions: {
      output: {
        dir: 'dist',
        format: 'es'
      }
    }
  }
})
