import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

const copyFilesPlugin = () => {
  return {
    name: 'copy-files',
    writeBundle() {
      const distPath = path.resolve(__dirname, 'dist');
      if (!existsSync(distPath)) {
        mkdirSync(distPath, { recursive: true });
      }
      copyFileSync(path.resolve(__dirname, 'manifest.json'), path.resolve(distPath, 'manifest.json'));
      copyFileSync(path.resolve(__dirname, 'app.html'), path.resolve(distPath, 'app.html'));
      copyFileSync(path.resolve(__dirname, 'index.html'), path.resolve(distPath, 'index.html'));
      copyFileSync(path.resolve(__dirname, 'loader.js'), path.resolve(distPath, 'loader.js'));
    },
  };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), copyFilesPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        dedupe: ['dexie']
      },
      build: {
        minify: false,
        rollupOptions: {
          input: {
            panel: path.resolve(__dirname, 'panel.html'),
            background: path.resolve(__dirname, 'background.ts'),
            content: path.resolve(__dirname, 'content.ts'),
          },
          output: {
            entryFileNames: `assets/[name].js`,
            chunkFileNames: `assets/[name].js`,
            assetFileNames: `assets/[name].[ext]`,
          },
        }
      }
    };
});
