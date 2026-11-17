import { expect, test } from "@playwright/test"

test("responses from separate source frames render into their shared destination in order", async ({ page }) => {
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.route("**/frames/form_submission_target.html?*", (route) => {
    const source = new URL(route.request().url()).searchParams.get("source")
    const marker = source === "external" ? "" : "<render-response></render-response>"
    return route.fulfill({
      contentType: "text/html",
      body: `<turbo-frame id="destination"><h2>${source}</h2>${marker}</turbo-frame>`
    })
  })
  await page.goto("/src/tests/fixtures/frames/form_submission_lifecycle.html")
  await page.evaluate(() => {
    for (const form of document.querySelectorAll("form[data-turbo-action]")) {
      form.removeAttribute("data-turbo-action")
    }

    window.extractedRenderResponses = 0
    window.renderResumes = {}
    window.beforeFrameRenders = []
    window.customFrameRenders = []
    window.renderedFrameResponses = []
    window.completedFrameLoads = 0

    // Importing each response upgrades this element before it waits for the current render.
    customElements.define("render-response", class extends HTMLElement {
      constructor() {
        super()
        window.extractedRenderResponses++
      }
    })

    const frame = document.getElementById("destination")
    frame.addEventListener("turbo:before-frame-render", (event) => {
      const source = event.detail.newFrame.querySelector("h2").textContent
      const render = event.detail.render
      window.beforeFrameRenders.push(source)
      event.detail.render = (currentElement, newElement) => {
        window.customFrameRenders.push(source)
        render(currentElement, newElement)
        currentElement.setAttribute("data-custom-render", source)
      }

      if (source !== "c") {
        event.preventDefault()
        window.renderResumes[source] = event.detail.resume
      }
    })
    frame.addEventListener("turbo:frame-render", ({ detail }) => {
      const source = new URL(detail.fetchResponse.response.url).searchParams.get("source")
      window.renderedFrameResponses.push(source)
    })
    frame.addEventListener("turbo:frame-load", () => window.completedFrameLoads++)
  })

  try {
    await submitForm(page, "external-form")
    await page.waitForFunction(() => window.renderResumes.external)
    await submitForm(page, "form-a")
    await page.waitForFunction(() => window.extractedRenderResponses === 1)
    await submitForm(page, "form-c")
    await page.waitForFunction(() => window.extractedRenderResponses === 2)
    expect(await page.evaluate(() => window.beforeFrameRenders)).toEqual(["external"])

    await page.evaluate(() => window.renderResumes.external())
    await page.waitForFunction(() => window.renderResumes.a)
    expect(await page.evaluate(() => window.beforeFrameRenders)).toEqual(["external", "a"])
    await expect(page.locator("#destination h2")).toHaveText("external")

    await page.evaluate(() => window.renderResumes.external())
    expect(await page.evaluate(() => window.beforeFrameRenders)).toEqual(["external", "a"])

    await page.evaluate(() => window.renderResumes.a())
    await page.waitForFunction(() => window.completedFrameLoads === 3)
    await expect(page.locator("#destination h2")).toHaveText("c")
    await expect(page.locator("#destination")).toHaveAttribute("data-custom-render", "c")
    expect(await page.evaluate(() => window.beforeFrameRenders)).toEqual(["external", "a", "c"])
    expect(await page.evaluate(() => window.customFrameRenders)).toEqual(["external", "a", "c"])
    expect(await page.evaluate(() => window.renderedFrameResponses)).toEqual(["external", "a", "c"])
    expect(errors).toEqual([])
  } finally {
    await page.evaluate(() => {
      for (const resume of Object.values(window.renderResumes)) resume()
    })
  }
})

function submitForm(page, id) {
  return page.locator(`#${id}`).evaluate((form) => form.requestSubmit(form.querySelector("button")))
}
