import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    server: {
        host: true
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                pullThePin: resolve(__dirname, 'pull-the-pin.html'),
                endlessRunner: resolve(__dirname, 'endless-runner.html')
            }
        }
    }
});
