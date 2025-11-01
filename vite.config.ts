import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Ensure manifest and icons are served correctly
      publicDir: 'public',
      build: {
        rollupOptions: {
          output: {
            // Ensure manifest is copied correctly
            assetFileNames: (assetInfo) => {
              if (assetInfo.name === 'manifest.json') {
                return 'manifest.json';
              }
              return 'assets/[name]-[hash][extname]';
            }
          }
        }
      }
    };
});
