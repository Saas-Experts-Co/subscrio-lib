import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'config/index': resolve(__dirname, 'src/config/index.ts')
      },
      name: 'Subscrio',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['pg', 'drizzle-orm', 'stripe', 'zod', 'bcryptjs', 'uuidv7', 'crypto']
    }
  },
  plugins: [
    dts({
      include: ['src'],
      outDir: 'dist'
    })
  ]
});

