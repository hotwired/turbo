import { assert } from "@open-wc/testing"
import { LimitedSet } from "../../util"

test("add a limited number of elements", () => {
  const set = new LimitedSet(3)
  set.add(1)
  set.add(2)
  set.add(3)
  set.add(4)

  assert.equal(set.size, 3)

  assert.notInclude(set, 1)
  assert.include(set, 2)
  assert.include(set, 3)
  assert.include(set, 4)
})
