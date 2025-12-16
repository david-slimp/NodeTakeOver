import {defineConfig} from 'vite';

export default defineConfig({
    publicDir: 'assets',
    server: {
        host: '127.0.0.1',
        port: 8000,
        strictPort: true,
    },
    preview: {
        host: '127.0.0.1',
        port: 8000,
        strictPort: true,
    },
});
