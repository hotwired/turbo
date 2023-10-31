import { assert } from "@open-wc/testing"
import * as Turbo from "../../"
import { StreamActions } from "../../"

test("Turbo interface", () => {
  assert.equal(typeof Turbo.StreamActions, "object")
  assert.equal(typeof Turbo.start, "function")
  assert.equal(typeof Turbo.registerAdapter, "function")
  assert.equal(typeof Turbo.visit, "function")
  assert.equal(typeof Turbo.connectStreamSource, "function")
  assert.equal(typeof Turbo.disconnectStreamSource, "function")
  assert.equal(typeof Turbo.renderStreamMessage, "function")
  assert.equal(typeof Turbo.clearCache, "function")
  assert.equal(typeof Turbo.setProgressBarDelay, "function")
  assert.equal(typeof Turbo.setConfirmMethod, "function")
  assert.equal(typeof Turbo.setFormMode, "function")
  assert.equal(typeof Turbo.cache, "object")
  assert.equal(typeof Turbo.navigator, "object")
  assert.equal(typeof Turbo.session, "object")
})

test("StreamActions interface", () => {
  assert.equal(typeof StreamActions, "object")
})
