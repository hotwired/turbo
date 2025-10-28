import { assert } from "@open-wc/testing"
import { LimitedMap } from "../../util"

test("add a limited number of elements", () => {
  const map = new LimitedMap(3)
  map.set("a", 1)
  map.set("b", 2)
  map.set("c", 3)
  map.set("d", 4)

  assert.equal(map.size, 3)

  assert.notOk(map.has("a"))

  assert.equal(map.get("b"), 2)
  assert.equal(map.get("c"), 3)
  assert.equal(map.get("d"), 4)
})

test("updating existing key does not increase size", () => {
  const map = new LimitedMap(2)
  map.set("a", 1)
  map.set("b", 2)
  map.set("a", 10)

  assert.equal(map.size, 2)
  assert.equal(map.get("a"), 10)
  assert.equal(map.get("b"), 2)
})

test("maintains insertion order", () => {
  const map = new LimitedMap(3)
  map.set("a", 1)
  map.set("b", 2)
  map.set("c", 3)

  const keys = Array.from(map.keys())
  assert.deepEqual(keys, ["a", "b", "c"])
})
