import resolve from "@rollup/plugin-node-resolve"
import esbuild from "rollup-plugin-esbuild"

import { version } from "./package.json"
const year = new Date().getFullYear()
const banner = `/*!\nTurbo ${version}\nCopyright © ${year} 37signals LLC\n */`

export default [
  {
    input: "src/index.ts",
    output: [
      {
        name: "Turbo",
        file: "dist/turbo.es2017-umd.js",
        format: "umd",
        banner
      },
      {
        file: "dist/turbo.es2017-esm.js",
        format: "esm",
        banner
      }
    ],
    plugins: [
      resolve({ extensions: [".ts", ".js"] }),
      // Strips types only. "esnext" keeps today's shipped syntax (private
      // fields, static class fields) instead of down-levelling it.
      esbuild({ target: "esnext", tsconfig: "tsconfig.json" })
    ],
    watch: {
      include: "src/**"
    }
  }
]
