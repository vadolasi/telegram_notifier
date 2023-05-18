import { defineConfig } from "vite"
import preact from "@preact/preset-vite"
import Unocss from "unocss/vite"
import Pages from "vite-plugin-pages"
import vercel from "vite-plugin-vercel"

export default defineConfig({
  plugins: [vercel(), preact(), Unocss(), Pages({ resolver: "react", importMode: "sync" })]
})
