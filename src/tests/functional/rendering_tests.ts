import { JSHandle, Page, test } from "@playwright/test"
import { assert } from "chai"
import {
  clearLocalStorage,
  disposeAll,
  isScrolledToTop,
  nextBeat,
  nextBody,
  nextEventNamed,
  pathname,
  scrollToSelector,
  selectorHasFocus,
  sleep,
  strictElementEquals,
  textContent,
  visitAction,
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/rendering.html")
  await clearLocalStorage(page)
})

test("test triggers before-render and render events", async ({ page }) => {
  await page.click("#same-origin-link")
  const { newBody } = await nextEventNamed(page, "turbo:before-render")

  assert.equal(await page.textContent("h1"), "One")

  await nextEventNamed(page, "turbo:render")
  assert.equal(await newBody, await page.evaluate(() => document.body.outerHTML))
})

test("test triggers before-render and render events for error pages", async ({ page }) => {
  await page.click("#nonexistent-link")
  const { newBody } = await nextEventNamed(page, "turbo:before-render")

  assert.equal(await textContent(page, newBody), "404 Not Found: /nonexistent\n")

  await nextEventNamed(page, "turbo:render")
  assert.equal(await newBody, await page.evaluate(() => document.body.outerHTML))
})

test("test reloads when tracked elements change", async ({ page }) => {
  await page.evaluate(() =>
    window.addEventListener(
      "turbo:reload",
      (e: any) => {
        localStorage.setItem("reloadReason", e.detail.reason)
      },
      { once: true }
    )
  )

  await page.click("#tracked-asset-change-link")
  await nextBody(page)

  const reason = await page.evaluate(() => localStorage.getItem("reloadReason"))

  assert.equal(pathname(page.url()), "/src/tests/fixtures/tracked_asset_change.html")
  assert.equal(await visitAction(page), "load")
  assert.equal(reason, "tracked_element_mismatch")
})

test("test wont reload when tracked elements has a nonce", async ({ page }) => {
  await page.click("#tracked-nonce-tag-link")
  await nextBody(page)

  assert.equal(pathname(page.url()), "/src/tests/fixtures/tracked_nonce_tag.html")
  assert.equal(await visitAction(page), "advance")
})

test("test reloads when turbo-visit-control setting is reload", async ({ page }) => {
  await page.evaluate(() =>
    window.addEventListener(
      "turbo:reload",
      (e: any) => {
        localStorage.setItem("reloadReason", e.detail.reason)
      },
      { once: true }
    )
  )

  await page.click("#visit-control-reload-link")
  await nextBody(page)

  const reason = await page.evaluate(() => localStorage.getItem("reloadReason"))

  assert.equal(pathname(page.url()), "/src/tests/fixtures/visit_control_reload.html")
  assert.equal(await visitAction(page), "load")
  assert.equal(reason, "turbo_visit_control_is_reload")
})

test("test maintains scroll position before visit when turbo-visit-control setting is reload", async ({ page }) => {
  await scrollToSelector(page, "#below-the-fold-visit-control-reload-link")
  assert.notOk(await isScrolledToTop(page), "scrolled down")

  await page.evaluate(() => localStorage.setItem("scrolls", "false"))

  page.evaluate(() =>
    addEventListener("click", () => {
      addEventListener("scroll", () => {
        localStorage.setItem("scrolls", "true")
      })
    })
  )

  page.click("#below-the-fold-visit-control-reload-link")

  await nextBody(page)

  const scrolls = await page.evaluate(() => localStorage.getItem("scrolls"))
  assert.equal(scrolls, "false", "scroll position is preserved")

  assert.equal(pathname(page.url()), "/src/tests/fixtures/visit_control_reload.html")
  assert.equal(await visitAction(page), "load")
})

test("test accumulates asset elements in head", async ({ page }) => {
  const assetElements = () => page.$$('script, style, link[rel="stylesheet"]')
  const originalElements = await assetElements()

  await page.click("#additional-assets-link")
  await nextBody(page)
  const newElements = await assetElements()
  assert.notOk(await deepElementsEqual(page, newElements, originalElements))

  await page.goBack()
  await nextBody(page)
  const finalElements = await assetElements()
  assert.ok(await deepElementsEqual(page, finalElements, newElements))

  await disposeAll(...originalElements, ...newElements, ...finalElements)
})

test("test replaces provisional elements in head", async ({ page }) => {
  const provisionalElements = () => page.$$('head :not(script), head :not(style), head :not(link[rel="stylesheet"])')
  const originalElements = await provisionalElements()
  assert.equal(await page.locator("meta[name=test]").count(), 0)

  await page.click("#same-origin-link")
  await nextBody(page)
  const newElements = await provisionalElements()
  assert.notOk(await deepElementsEqual(page, newElements, originalElements))
  assert.equal(await page.locator("meta[name=test]").count(), 1)

  await page.goBack()
  await nextBody(page)
  const finalElements = await provisionalElements()
  assert.notOk(await deepElementsEqual(page, finalElements, newElements))
  assert.equal(await page.locator("meta[name=test]").count(), 0)

  await disposeAll(...originalElements, ...newElements, ...finalElements)
})

test("test evaluates head stylesheet elements", async ({ page }) => {
  assert.equal(await isStylesheetEvaluated(page), false)

  await page.click("#additional-assets-link")
  await nextEventNamed(page, "turbo:render")
  assert.equal(await isStylesheetEvaluated(page), true)
})

test("test does not evaluate head stylesheet elements inside noscript elements", async ({ page }) => {
  assert.equal(await isNoscriptStylesheetEvaluated(page), false)

  await page.click("#additional-assets-link")
  await nextEventNamed(page, "turbo:render")
  assert.equal(await isNoscriptStylesheetEvaluated(page), false)
})

test("skip evaluates head script elements once", async ({ page }) => {
  assert.equal(await headScriptEvaluationCount(page), undefined)

  await page.click("#head-script-link")
  await nextEventNamed(page, "turbo:render")
  assert.equal(await headScriptEvaluationCount(page), 1)

  await page.goBack()
  await nextEventNamed(page, "turbo:render")
  assert.equal(await headScriptEvaluationCount(page), 1)

  await page.click("#head-script-link")
  await nextEventNamed(page, "turbo:render")
  assert.equal(await headScriptEvaluationCount(page), 1)
})

test("test evaluates body script elements on each render", async ({ page }) => {
  assert.equal(await bodyScriptEvaluationCount(page), undefined)

  await page.click("#body-script-link")
  await nextEventNamed(page, "turbo:render")
  assert.equal(await bodyScriptEvaluationCount(page), 1)

  await page.goBack()
  await nextEventNamed(page, "turbo:render")
  assert.equal(await bodyScriptEvaluationCount(page), 1)

  await page.click("#body-script-link")
  await nextEventNamed(page, "turbo:render")
  assert.equal(await bodyScriptEvaluationCount(page), 2)
})

test("test does not evaluate data-turbo-eval=false scripts", async ({ page }) => {
  await page.click("#eval-false-script-link")
  await nextEventNamed(page, "turbo:render")
  assert.equal(await bodyScriptEvaluationCount(page), undefined)
})

test("test preserves permanent elements", async ({ page }) => {
  const permanentElement = await page.locator("#permanent")
  assert.equal(await permanentElement.textContent(), "Rendering")

  await page.click("#permanent-element-link")
  await nextEventNamed(page, "turbo:render")
  assert.ok(await strictElementEquals(permanentElement, await page.locator("#permanent")))
  assert.equal(await permanentElement!.textContent(), "Rendering")

  await page.goBack()
  await nextEventNamed(page, "turbo:render")
  assert.ok(await strictElementEquals(permanentElement, await page.locator("#permanent")))
})

test("test restores focus during page rendering when transposing the activeElement", async ({ page }) => {
  await page.press("#permanent-input", "Enter")
  await nextBody(page)

  assert.ok(await selectorHasFocus(page, "#permanent-input"), "restores focus after page loads")
})

test("test restores focus during page rendering when transposing an ancestor of the activeElement", async ({
  page,
}) => {
  await page.press("#permanent-descendant-input", "Enter")
  await nextBody(page)

  assert.ok(await selectorHasFocus(page, "#permanent-descendant-input"), "restores focus after page loads")
})

test("test preserves permanent elements within turbo-frames", async ({ page }) => {
  assert.equal(await page.textContent("#permanent-in-frame"), "Rendering")

  await page.click("#permanent-in-frame-element-link")
  await nextBeat()

  assert.equal(await page.textContent("#permanent-in-frame"), "Rendering")
})

test("test preserves permanent elements within turbo-frames rendered without layouts", async ({ page }) => {
  assert.equal(await page.textContent("#permanent-in-frame"), "Rendering")

  await page.click("#permanent-in-frame-without-layout-element-link")
  await nextBeat()

  assert.equal(await page.textContent("#permanent-in-frame"), "Rendering")
})

test("test restores focus during turbo-frame rendering when transposing the activeElement", async ({ page }) => {
  await page.press("#permanent-input-in-frame", "Enter")
  await nextBeat()

  assert.ok(await selectorHasFocus(page, "#permanent-input-in-frame"), "restores focus after page loads")
})

test("test restores focus during turbo-frame rendering when transposing a descendant of the activeElement", async ({
  page,
}) => {
  await page.press("#permanent-descendant-input-in-frame", "Enter")
  await nextBeat()

  assert.ok(await selectorHasFocus(page, "#permanent-descendant-input-in-frame"), "restores focus after page loads")
})

test("test preserves permanent element video playback", async ({ page }) => {
  const videoElement = await page.locator("#permanent-video")
  await page.click("#permanent-video-button")
  await sleep(500)

  const timeBeforeRender = await videoElement.evaluate((video: HTMLVideoElement) => video.currentTime)
  assert.notEqual(timeBeforeRender, 0, "playback has started")

  await page.click("#permanent-element-link")
  await nextBody(page)

  const timeAfterRender = await videoElement.evaluate((video: HTMLVideoElement) => video.currentTime)
  assert.equal(timeAfterRender, timeBeforeRender, "element state is preserved")
})

test("test before-cache event", async ({ page }) => {
  await page.evaluate(() => {
    addEventListener("turbo:before-cache", () => (document.body.innerHTML = "Modified"), { once: true })
  })
  await page.click("#same-origin-link")
  await nextBody(page)
  await page.goBack()

  assert.equal(await page.textContent("body"), "Modified")
})

test("test mutation record as before-cache notification", async ({ page }) => {
  await modifyBodyAfterRemoval(page)
  await page.click("#same-origin-link")
  await nextBody(page)
  await page.goBack()

  assert.equal(await page.textContent("body"), "Modified")
})

test("test error pages", async ({ page }) => {
  await page.click("#nonexistent-link")
  await nextBody(page)

  assert.equal(await page.textContent("body"), "404 Not Found: /nonexistent\n")
})

function deepElementsEqual(
  page: Page,
  left: JSHandle<SVGElement | HTMLElement>[],
  right: JSHandle<SVGElement | HTMLElement>[]
): Promise<boolean> {
  return page.evaluate(
    ([left, right]) => left.length == right.length && left.every((element) => right.includes(element)),
    [left, right]
  )
}

function headScriptEvaluationCount(page: Page): Promise<number | undefined> {
  return page.evaluate(() => window.headScriptEvaluationCount)
}

function bodyScriptEvaluationCount(page: Page): Promise<number | undefined> {
  return page.evaluate(() => window.bodyScriptEvaluationCount)
}

function isStylesheetEvaluated(page: Page): Promise<boolean> {
  return page.evaluate(
    () => getComputedStyle(document.body).getPropertyValue("--black-if-evaluated").trim() === "black"
  )
}

function isNoscriptStylesheetEvaluated(page: Page): Promise<boolean> {
  return page.evaluate(
    () => getComputedStyle(document.body).getPropertyValue("--black-if-noscript-evaluated").trim() === "black"
  )
}

function modifyBodyAfterRemoval(page: Page) {
  return page.evaluate(() => {
    const { documentElement, body } = document
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (Array.from(record.removedNodes).indexOf(body) > -1) {
          body.innerHTML = "Modified"
          observer.disconnect()
          break
        }
      }
    })
    observer.observe(documentElement, { childList: true })
  })
}

declare global {
  interface Window {
    headScriptEvaluationCount?: number
    bodyScriptEvaluationCount?: number
  }
}
