import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: "src/chrome-extension/manifest.json", dest: "." },
        { src: "src/chrome-extension/public/linkedin_styling.css", dest: "." },
        { src: "src/chrome-extension/public/16.png", dest: "." },
        { src: "src/chrome-extension/public/32.png", dest: "." },
        { src: "src/chrome-extension/public/48.png", dest: "." },
        { src: "src/chrome-extension/public/128.png", dest: "." },
      ],
    }),
  ],
  server: {
    open: "/popup-local.html",
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        options: resolve(__dirname, "options.html"),
        service_worker: resolve(
          __dirname,
          "src/chrome-extension/scripts/service_worker.ts"
        ),
        linkedin_script: resolve(
          __dirname,
          "src/chrome-extension/scripts/linkedin_script.ts"
        ),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
