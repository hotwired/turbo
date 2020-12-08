import typescript from "rollup-plugin-typescript2"
import { version } from "./package.json"
const year = new Date().getFullYear()

const options = {
  plugins: [
    typescript({
      cacheRoot: "node_modules/.cache",
      tsconfigDefaults: {
        compilerOptions: {
          removeComments: true
        }
      }
    })
  ],
  watch: {
    include: "src/**"
  }
}

export default [
  {
    input: "src/umd.ts",
    output: {
      banner: `/*\nTurbo ${version}\nCopyright © ${year} Basecamp, LLC\n */`,
      file: "dist/turbo.js",
      format: "umd",
      name: "Turbo",
      sourcemap: true
    },
    ...options
  },

  {
    input: "src/tests/index.ts",
    output: {
      file: "dist/tests.js",
      format: "cjs",
      sourcemap: true
    },
    external: [
      "intern"
    ],
    ...options
  }
]
