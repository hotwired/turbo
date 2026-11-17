import { expect, test } from "@playwright/test"
import { nextEventNamed, nextEventOnTarget, readEventLogs } from "../helpers/page"

const sourcePath = "/src/tests/fixtures/frame_navigation_fragments.html"
const targetPath = "/src/tests/fixtures/frames/frame.html"

test.beforeEach(async ({ page }) => {
  await page.goto(sourcePath)
  await nextEventOnTarget(page, "frame", "turbo:frame-load")
  await expect(page.locator("#frame h2")).toHaveText("Frames: #frame")
  await readEventLogs(page)
})

for (const { selector, destination } of [
  { selector: "#link-with-fragment", destination: `${targetPath}#link-fragment` },
  { selector: "#link-without-fragment", destination: targetPath }
]) {
  test(`a promoted frame link to ${destination} uses its own fragment`, async ({ page }) => {
    await page.click(selector)
    await nextEventNamed(page, "turbo:load")

    await expectFrameDestination(page, destination)
    await expect(page).toHaveURL(destination)
  })
}

for (const fragment of ["#src-fragment", ""]) {
  test(`a frame src change to ${targetPath}${fragment} uses its own fragment`, async ({ page }) => {
    const destination = `${targetPath}${fragment}`
    await page.locator("#frame").evaluate((frame, destination) => frame.src = destination, destination)
    await nextEventOnTarget(page, "frame", "turbo:frame-load")

    await expectFrameDestination(page, destination)
    await expect(page).toHaveURL(sourcePath)
  })
}

for (const { selector, fragment } of [
  { selector: "#form-with-fragment", fragment: "#form-fragment" },
  { selector: "#form-without-fragment", fragment: "" }
]) {
  test(`a GET form with fragment ${JSON.stringify(fragment)} does not inherit the frame's previous fragment`, async ({ page }) => {
    await page.click(`${selector} button`)
    await nextEventNamed(page, "turbo:load")

    const destination = `${targetPath}?query=form${fragment}`
    await expectFrameDestination(page, destination)
    await expect(page).toHaveURL(destination)
  })
}

test("a redirected form keeps the response URL without inheriting the request or previous frame fragment", async ({ page }) => {
  await page.click("#redirecting-form button")
  await nextEventNamed(page, "turbo:load")

  await expectFrameDestination(page, targetPath)
  await expect(page).toHaveURL(targetPath)
})

test("a self-referencing frame remains blocked when its request has a fragment", async ({ page }) => {
  await page.goto("/src/tests/fixtures/frames.html")
  await readEventLogs(page)
  await page.evaluate(() => {
    window.selfReferenceRequests = 0
    addEventListener("turbo:before-fetch-request", ({ detail }) => {
      if (detail.url.pathname === "/src/tests/fixtures/frames/self.html") window.selfReferenceRequests++
    })
    document.getElementById("frame-self").hash = "#self-fragment"
  })

  await page.click("#frame-self")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  expect(await page.evaluate(() => window.selfReferenceRequests)).toEqual(1)
  await expect(page).toHaveURL("/src/tests/fixtures/frames.html")
})

async function expectFrameDestination(page, destination) {
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  await expect(page.locator("h1")).toHaveText("Frame fragment navigation")
  await expect(page.locator("#frame")).toHaveAttribute("src", new URL(destination, page.url()).href)
}
