import { assert } from "@open-wc/testing"
import { Snapshot } from "../../core/snapshot"

for (const attribute of ["id", "name"]) {
  for (const anchor of ["section'one", "section\\one", "space anchor", '1:section["one"]#part']) {
    test(`getElementForAnchor finds ${attribute} ${JSON.stringify(anchor)}`, () => {
      const root = document.createElement("div")
      const target = document.createElement(attribute === "name" ? "a" : "div")
      target.setAttribute(attribute, anchor)

      const decoy = document.createElement(attribute === "name" ? "a" : "div")
      const decoyAnchor = anchor.replace(/["'\\]/g, "")
      decoy.setAttribute(attribute, decoyAnchor === anchor ? `${anchor}-other` : decoyAnchor)
      root.append(decoy, target)

      assert.strictEqual(new Snapshot(root).getElementForAnchor(anchor), target)
    })
  }
}

test("getElementForAnchor ignores name attributes on non-anchor elements", () => {
  const root = document.createElement("div")
  const input = document.createElement("input")
  input.name = "section one"
  root.append(input)

  assert.isNull(new Snapshot(root).getElementForAnchor(input.name))
})

test("getElementForAnchor returns null for empty and absent anchors", () => {
  const snapshot = new Snapshot(document.createElement("div"))

  assert.isNull(snapshot.getElementForAnchor(""))
  assert.isNull(snapshot.getElementForAnchor())
  assert.isNull(snapshot.getElementForAnchor("missing"))
})
