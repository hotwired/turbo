import { createHash } from "node:crypto"
import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.cspViolations = []
    document.addEventListener("securitypolicyviolation", (event) => {
      window.cspViolations.push({
        effectiveDirective: event.effectiveDirective,
        blockedURI: event.blockedURI
      })
    })
  })
})

test("default-src none prevents Turbo from loading", async ({ page }) => {
  const response = await page.goto("/__turbo/content_security_policy/none")
  expect(response.headers()["content-security-policy"]).toEqual("default-src 'none'")

  const scriptURL = new URL("/dist/turbo.es2017-umd.js", page.url()).href
  await expect.poll(() => violationsForDirective(page, "script-src")).toEqual(
    expect.arrayContaining([expect.objectContaining({ blockedURI: scriptURL })])
  )
  expect(await page.evaluate(() => typeof window.Turbo)).toEqual("undefined")
  await expect(page.locator("head style")).toHaveCount(0)
})

test("allowing scripts leaves progress bar styles blocked by default-src none", async ({ page }) => {
  await expectProgressBarUnderPolicy(page, "scripts", { styled: false })
})

test("style-src self does not allow the inline progress bar stylesheet", async ({ page }) => {
  await expectProgressBarUnderPolicy(page, "self", { styled: false, styleSource: "'self'" })
})

test("style-src unsafe-inline allows the progress bar stylesheet", async ({ page }) => {
  await expectProgressBarUnderPolicy(page, "inline", { styled: true, styleSource: "'unsafe-inline'" })
})

test("a matching CSP nonce allows the progress bar stylesheet", async ({ page }) => {
  await expectProgressBarUnderPolicy(page, "nonce", { styled: true, styleSource: "'nonce-123'" })
})

test("a matching CSP hash allows the progress bar stylesheet", async ({ page }) => {
  await page.goto("/src/tests/fixtures/content_security_policy.html")
  expect(await page.evaluate(() => window.Turbo?.session.started)).toEqual(true)
  await expect(page.locator("head style")).toHaveCount(1)
  const stylesheet = await page.locator("head style").textContent()
  const hash = createHash("sha256").update(stylesheet).digest("base64")

  await expectProgressBarUnderPolicy(page, `hash?hash=${encodeURIComponent(hash)}`, {
    styled: true,
    styleSource: `'sha256-${hash}'`
  })
})

async function expectProgressBarUnderPolicy(page, policy, { styled, styleSource }) {
  const response = await page.goto(`/__turbo/content_security_policy/${policy}`)
  const expectedPolicy = "default-src 'none'; script-src 'self'; connect-src 'self'" +
    (styleSource ? `; style-src ${styleSource}` : "")
  expect(response.headers()["content-security-policy"]).toEqual(expectedPolicy)
  expect(await page.evaluate(() => window.Turbo?.session.started)).toEqual(true)
  const stylesheet = page.locator("head style")
  await expect(stylesheet).toHaveCount(1)
  expect(await stylesheet.textContent()).toContain(".turbo-progress-bar")
  if (policy === "nonce") await expect(stylesheet).toHaveJSProperty("nonce", "123")

  let releaseResponse
  const responseHeld = new Promise((resolve) => (releaseResponse = resolve))
  await page.route("**/src/tests/fixtures/frames/frame.html", async (route) => {
    await responseHeld
    await route.continue()
  })

  try {
    await page.evaluate(() => {
      window.Turbo.config.drive.progressBarDelay = 0
      window.cspDocument = document
    })
    await page.click("#next")

    const progressBar = page.locator(".turbo-progress-bar")
    await expect(progressBar).toBeAttached()
    await expect(progressBar).toHaveCSS("position", styled ? "fixed" : "static")
    await expect(progressBar).toHaveCSS("height", styled ? "3px" : "0px")
    if (styled) {
      expect(await violationsForDirective(page, "style-src")).toEqual([])
    } else {
      await expect.poll(() => violationsForDirective(page, "style-src")).toEqual(
        expect.arrayContaining([expect.objectContaining({ blockedURI: "inline" })])
      )
    }

    releaseResponse()
    await expect(page.locator("h1")).toHaveText("Frames: #frame")
    expect(await page.evaluate(() => window.cspDocument === document)).toEqual(true)
  } finally {
    releaseResponse()
    await page.unrouteAll({ behavior: "wait" })
  }
}

function violationsForDirective(page, directive) {
  return page.evaluate((directive) => {
    return window.cspViolations.filter((violation) => violation.effectiveDirective.startsWith(directive))
  }, directive)
}
