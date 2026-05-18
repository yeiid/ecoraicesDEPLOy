// @ts-check
import { defineConfig } from "astro/config";

// import svelte from "@astrojs/svelte";
import react from "@astrojs/react";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: "server",

  adapter: node({
    mode: "standalone",
  }),
});