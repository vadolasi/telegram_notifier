import { defineConfig } from "vite"
import preact from "@preact/preset-vite"
import Unocss from "unocss/vite"
import Pages from "vite-plugin-pages"

export default defineConfig({
  plugins: [preact(), Unocss(), Pages({ resolver: "react", importMode: "sync" })]
})
