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
  assert.equal(typeof Turbo.config, "object")
  assert.equal(typeof Turbo.cache.clear, "function")
  assert.equal(typeof Turbo.navigator, "object")
  assert.equal(typeof Turbo.session, "object")
  assert.equal(typeof Turbo.session.drive, "boolean")
  assert.equal(typeof Turbo.session.formMode, "string")
  assert.equal(typeof Turbo.fetch, "function")
})

test("Session interface", () => {
  const { session, config } = Turbo

  assert.equal(true, session.drive)
  assert.equal(true, config.drive.enabled)
  assert.equal("on", session.formMode)
  assert.equal("on", config.forms.mode)

  session.drive = false
  session.formMode = "off"

  assert.equal(false, session.drive)
  assert.equal(false, config.drive.enabled)
  assert.equal("off", session.formMode)
  assert.equal("off", config.forms.mode)
})

test("StreamActions interface", () => {
  assert.equal(typeof StreamActions, "object")
})
