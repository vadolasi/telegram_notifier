import { defineConfig } from "vite"
import preact from "@preact/preset-vite"
import Unocss from "unocss/vite"
import Pages from "vite-plugin-pages"
import vercel from "vite-plugin-vercel"
import ssr from "vite-plugin-ssr/plugin"

export default defineConfig({
  plugins: [ssr(), vercel(), preact(), Unocss(), Pages({ resolver: "react", importMode: "sync" })]
})
