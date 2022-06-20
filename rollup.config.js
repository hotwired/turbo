import resolve from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"

import { version } from "./package.json"
const year = new Date().getFullYear()
const banner = `/*\nTurbo ${version}\nCopyright © ${year} Basecamp, LLC\n */`

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
        format: "es",
        banner
      }
    ],
    plugins: [
      resolve(),
      typescript()
    ],
    watch: {
      include: "src/**"
    }
  },

  {
    input: "src/tests/unit/index.ts",
    output: [
      {
        name: "tests_unit",
        file: "dist/tests/unit.js",
        format: "iife",
        sourcemap: true,
        globals: {
          intern: "intern"
        }
      }
    ],
    plugins: [
      resolve(),
      typescript()
    ],
    external: [
      "intern"
    ],
    watch: {
      include: "src/tests/**"
    }
  },

  {
    input: "src/tests/server.ts",
    output: [
      {
        file: "dist/tests/server.js",
        format: "cjs",
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      typescript()
    ],
    external: [
      "express",
      "multer",
      "path",
      "url",
      "fs"
    ],
    watch: {
      include: "src/tests/**"
    }
  }
]
