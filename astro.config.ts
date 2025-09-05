import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          hashCharacters: "hex",
          entryFileNames: "_chunk/[hash].mjs",
          chunkFileNames: "_chunk/[hash].mjs",
          assetFileNames: "_astro/[hash][extname]",
        },
      },
    },
    esbuild: {
      // TODO: add a opensource license page
      legalComments: "none",
    },
  },

  output: "server",

  adapter: node({
    mode: "standalone",
  }),

  server: {
    port: 3000,
  },

  experimental: {
    fonts: [
      {
        provider: fontProviders.fontsource(),
        name: "Noto Sans JP",
        cssVariable: "--font-noto-sans-jp",
        subsets: ["latin"],
        weights: ["300 700"],
        fallbacks: ["Noto Sans JP Variable", "sans-serif"],
        optimizedFallbacks: true,
      },
      {
        provider: fontProviders.fontsource(),
        name: "Inconsolata",
        cssVariable: "--font-inconsolata",
        subsets: ["latin"],
        weights: ["300 700"],
        fallbacks: ["Inconsolata Variable", "monospace"],
        optimizedFallbacks: true,
      },
    ],
  },
});
