import { defineConfig } from 'vite';
import angular from '@angular/build/plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [angular(), tailwindcss()],
});