/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The PHP API runs under `php -S localhost:3001 -t public`, which ignores
  // public/api/.htaccess, so map /api/suggest -> /api/suggest.php here too.
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        rewrite: (path) => path.replace(/^\/api\/(suggest|complete)(?=$|\?)/, "/api/$1.php"),
      },
    },
  },
  test: { environment: "jsdom", setupFiles: "./src/test/setup.ts" },
})
