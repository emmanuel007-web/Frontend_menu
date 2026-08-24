import { defineConfig } from 'vite';
import angular from '@angular/build/plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [angular(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});