import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import collectIconsPlugin from 'collect-icons';

// https://vite.dev/config
export default defineConfig({
    base: '',
    plugins: [
    react(),
    tailwindcss(),
    // collect icons during build
    collectIconsPlugin({ exportFolderName: 'app', bareImportsMode: 'bare' }),
    ],
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    server: {
        port: 3000,
    },
});
