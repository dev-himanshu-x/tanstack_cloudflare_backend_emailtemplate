import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(() => {
  const isTest = process.env.VITEST === "true";

  return {
    server: {
      preset: "cloudflare-workers",
    },

    plugins: [
      ...(isTest ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
      tanstackStart({
        srcDirectory: "app",
        prerender: {
          enabled: true,
        },
      }),
      tailwindcss(),
      react(),
    ],
  };
});
