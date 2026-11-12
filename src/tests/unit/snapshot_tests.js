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

const encodedAnchorCases = [
  { name: "finds percent-encoded Unicode ids", anchor: "%E5%89%8D%E4%B8%96", targets: [["id","前世"]], expected: 0 },
  { name: "finds percent-encoded named anchors", anchor: "%E5%89%8D%E4%B8%96", targets: [["name","前世"]], expected: 0 },
  { name: "prefers a literal id to an earlier decoded id", anchor: "%E5%89%8D%E4%B8%96", targets: [["id","前世"],["id","%E5%89%8D%E4%B8%96"]], expected: 1 },
  { name: "prefers a literal name to an earlier decoded id", anchor: "%E5%89%8D%E4%B8%96", targets: [["id","前世"],["name","%E5%89%8D%E4%B8%96"]], expected: 1 },
  { name: "prefers an id to an earlier named anchor", anchor: "section", targets: [["name","section"],["id","section"]], expected: 1 },
  { name: "prefers a decoded id to an earlier decoded named anchor", anchor: "section%20one", targets: [["name","section one"],["id","section one"]], expected: 1 },
  { name: "decodes only once", anchor: "%2520", targets: [["id"," "],["id","%20"]], expected: 1 },
  { name: "preserves literal query characters while decoding", anchor: "a+b&c=d#e?f%20end", targets: [["id","a+b&c=d#e?f end"]], expected: 0 },
  { name: "decodes encoded query characters", anchor: "%2B%26%3D", targets: [["id","+&="]], expected: 0 },
  { name: "does not decode encoded percent signs twice", anchor: "%252B%2526%253D", targets: [["id","+&="],["id","%2B%26%3D"]], expected: 1 },
  { name: "preserves literal plus signs", anchor: "a+b%20c", targets: [["id","a b c"],["id","a+b c"]], expected: 1 },
  { name: "escapes a decoded quote", anchor: "%27", targets: [["id","'"]], expected: 0 },
  { name: "preserves literal malformed percent escapes", anchor: "broken%", targets: [["id","broken%"]], expected: 0 },
  { name: "ignores missing malformed percent escapes without throwing", anchor: "broken%", targets: [["id","other"]], expected: null },
  { name: "decodes valid escapes before an incomplete percent escape", anchor: "%41%", targets: [["id","A%"]], expected: 0 },
  { name: "decodes Unicode before a malformed percent escape", anchor: "%E5%89%8D%E4%B8%96%ZZ", targets: [["id","前世%ZZ"]], expected: 0 },
  { name: "replaces invalid UTF-8", anchor: "%FF", targets: [["id","�"]], expected: 0 },
  { name: "replaces truncated UTF-8", anchor: "%E0%A4", targets: [["id","�"]], expected: 0 },
  { name: "preserves a decoded byte order mark", anchor: "%EF%BB%BFsection", targets: [["id","\uFEFFsection"]], expected: 0 },
  { name: "does not confuse a decoded NUL with the replacement character", anchor: "%00", targets: [["id","�"]], expected: null },
  { name: "does not confuse a decoded NUL within an id with the replacement character", anchor: "a%00b", targets: [["id","a�b"]], expected: null },
  { name: "finds a literal percent-encoded NUL before decoding", anchor: "%00", targets: [["id","�"],["id","%00"]], expected: 1 }
]

for (const { name, anchor, targets, expected } of encodedAnchorCases) {
  test(`getElementForAnchor ${name}`, () => {
    const { snapshot, elements } = createSnapshotWithTargets(targets)
    const target = expected === null ? null : elements[expected]

    assert.strictEqual(snapshot.getElementForAnchor(anchor), target)
  })
}

function createSnapshotWithTargets(targets) {
  const root = document.createElement("div")
  const elements = targets.map(([attribute, value]) => {
    const element = document.createElement(attribute === "name" ? "a" : "div")
    element.setAttribute(attribute, value)
    root.append(element)
    return element
  })

  return { snapshot: new Snapshot(root), elements }
}
