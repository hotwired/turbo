import resolve from "@rollup/plugin-node-resolve"

import { version } from "./package.json"
const year = new Date().getFullYear()
const banner = `/*!\nTurbo ${version}\nCopyright © ${year} 37signals LLC\n */`

export default [
  {
    input: "src/index.js",
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
    plugins: [resolve()],
    watch: {
      include: "src/**"
    }
  },
  {
    input: "src/offline/index.js",
    output: [
      {
        file: "dist/turbo-offline.js",
        format: "es",
        banner
      },
      {
        name: "TurboOffline",
        file: "dist/turbo-offline-umd.js",
        format: "umd",
        banner
      }
    ],
    plugins: [resolve()],
    watch: {
      include: "src/offline/**"
    }
  }
]
