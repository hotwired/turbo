// Fails if the build changed the shipped syntax: transpiler helpers mean
// private fields, class fields or other modern syntax were down-levelled.
import { readFileSync } from "node:fs"

const files = ["dist/turbo.es2017-esm.js", "dist/turbo.es2017-umd.js"]
const helpers = ["__privateGet", "__privateSet", "__privateAdd", "__privateMethod", "__publicField", "__defNormalProp"]

let failed = false
for (const file of files) {
  const source = readFileSync(file, "utf8")
  for (const helper of helpers) {
    if (source.includes(helper)) {
      console.error(`${file}: contains transpiler helper ${helper}`)
      failed = true
    }
  }
}

if (failed) process.exit(1)
console.log("dist syntax OK")
