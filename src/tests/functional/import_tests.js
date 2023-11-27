import { test } from "@playwright/test"
import { assert } from "chai"

test("window variable with ESM", async ({ page }) => {
  await page.goto("/src/tests/fixtures/esm.html")
  await assertTurboInterface(page)
})

test("window variable with UMD", async ({ page }) => {
  await page.goto("/src/tests/fixtures/umd.html")
  await assertTurboInterface(page)
})

async function assertTurboInterface(page) {
  await assertTypeOf(page, "Turbo", "object")
  await assertTypeOf(page, "Turbo.StreamActions", "object")
  await assertTypeOf(page, "Turbo.start", "function")
  await assertTypeOf(page, "Turbo.registerAdapter", "function")
  await assertTypeOf(page, "Turbo.visit", "function")
  await assertTypeOf(page, "Turbo.connectStreamSource", "function")
  await assertTypeOf(page, "Turbo.disconnectStreamSource", "function")
  await assertTypeOf(page, "Turbo.renderStreamMessage", "function")
  await assertTypeOf(page, "Turbo.clearCache", "function")
  await assertTypeOf(page, "Turbo.setProgressBarDelay", "function")
  await assertTypeOf(page, "Turbo.setConfirmMethod", "function")
  await assertTypeOf(page, "Turbo.setFormMode", "function")
  await assertTypeOf(page, "Turbo.cache", "object")
  await assertTypeOf(page, "Turbo.cache.clear", "function")
  await assertTypeOf(page, "Turbo.navigator", "object")
  await assertTypeOf(page, "Turbo.session", "object")
}

async function assertTypeOf(page, propertyName, propertyType) {
  const type = await page.evaluate((propertyName) => {
    const parts = propertyName.split(".")
    let object = window
    parts.forEach((_part, i) => {
      object = object[parts[i]]
    })
    return typeof object
  }, propertyName)

  assert.equal(type, propertyType, `Expected ${propertyName} to be ${propertyType}`)
}
