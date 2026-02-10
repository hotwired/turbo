import { expect, test } from "@playwright/test"
import {
  clearLocalStorage,
  disposeAll,
  isScrolledToTop,
  nextBeat,
  nextBody,
  nextBodyMutation,
  nextEventNamed,
  noNextBodyMutation,
  readEventLogs,
  scrollToSelector,
  sleep,
  strictElementEquals,
  textContent,
  visitAction,
  withPathname
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/rendering.html")
  await clearLocalStorage(page)
  await readEventLogs(page)
})

test("triggers before-render and render events", async ({ page }) => {
  await page.click("#same-origin-link")
  const { newBody } = await nextEventNamed(page, "turbo:before-render", { renderMethod: "replace" })

  await expect(page.locator("h1")).toHaveText("One")

  await nextEventNamed(page, "turbo:render")
  expect(newBody).toEqual(await page.evaluate(() => document.body.outerHTML))
})

test("triggers before-render, render, and load events for error pages", async ({ page }) => {
  await page.click("#nonexistent-link")
  const { newBody } = await nextEventNamed(page, "turbo:before-render")

  expect(await textContent(page, newBody)).toEqual("\nCannot GET /nonexistent\n\n\n")

  await nextEventNamed(page, "turbo:render")
  expect(newBody).toEqual(await page.evaluate(() => document.body.outerHTML))

  await nextEventNamed(page, "turbo:load")
})

test("reloads when tracked elements change", async ({ page }) => {
  await page.evaluate(() =>
    window.addEventListener(
      "turbo:reload",
      (e) => {
        localStorage.setItem("reloadReason", e.detail.reason)
      },
      { once: true }
    )
  )

  await page.click("#tracked-asset-change-link")
  await page.waitForURL("**/tracked_asset_change.html")

  const reason = await page.evaluate(() => localStorage.getItem("reloadReason"))
  expect(await visitAction(page)).toEqual("load")
  expect(reason).toEqual("tracked_element_mismatch")
})

test("reloads when tracked elements change due to failed form submission", async ({ page }) => {
  await page.click("#tracked-asset-change-form button")
  await nextBeat()

  await page.evaluate(() => {
    window.addEventListener(
      "turbo:reload",
      (e) => {
        localStorage.setItem("reason", e.detail.reason)
      },
      { once: true }
    )

    window.addEventListener(
      "beforeunload",
      () => {
        localStorage.setItem("unloaded", "true")
      },
      { once: true }
    )
  })

  await page.click("#tracked-asset-change-form button")
  await nextBeat()

  const reason = await page.evaluate(() => localStorage.getItem("reason"))
  const unloaded = await page.evaluate(() => localStorage.getItem("unloaded"))

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/rendering.html"))
  expect(await visitAction(page)).toEqual("load")
  expect(reason).toEqual("tracked_element_mismatch")
  expect(unloaded).toEqual("true")
})

test("before-render event supports custom render function", async ({ page }) => {
  await page.evaluate(() =>
    addEventListener("turbo:before-render", (event) => {
      const { detail } = event
      const { render } = detail
      detail.render = (currentElement, newElement) => {
        newElement.insertAdjacentHTML("beforeend", `<span id="custom-rendered">Custom Rendered</span>`)
        render(currentElement, newElement)
      }
    })
  )
  await page.click("#same-origin-link")

  await expect(page.locator("#custom-rendered"), "renders with custom function").toHaveText("Custom Rendered")
})

test("before-render event supports async custom render function", async ({ page }) => {
  await page.evaluate(() => {
    const nextEventLoopTick = () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(), 0)
      })

    addEventListener("turbo:before-render", (event) => {
      const { detail } = event
      const { render } = detail
      detail.render = async (currentElement, newElement) => {
        await nextEventLoopTick()

        newElement.insertAdjacentHTML("beforeend", `<span id="custom-rendered">Custom Rendered</span>`)
        render(currentElement, newElement)
      }
    })

    addEventListener("turbo:load", () => {
      localStorage.setItem("renderedElement", document.getElementById("custom-rendered")?.textContent || "")
    })
  })
  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")

  const renderedElement = await page.evaluate(() => localStorage.getItem("renderedElement"))

  expect(renderedElement, "renders with custom function").toEqual("Custom Rendered")
})

test("wont reload when tracked elements has a nonce", async ({ page }) => {
  await page.click("#tracked-nonce-tag-link")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/tracked_nonce_tag.html"))
  expect(await visitAction(page)).toEqual("advance")
})

test("reloads when turbo-visit-control setting is reload", async ({ page }) => {
  await page.evaluate(() =>
    window.addEventListener(
      "turbo:reload",
      (e) => {
        localStorage.setItem("reloadReason", e.detail.reason)
      },
      { once: true }
    )
  )

  await page.click("#visit-control-reload-link")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/visit_control_reload.html"))
  const reason = await page.evaluate(() => localStorage.getItem("reloadReason"))
  expect(await visitAction(page)).toEqual("load")
  expect(reason).toEqual("turbo_visit_control_is_reload")
})

test("maintains scroll position before visit when turbo-visit-control setting is reload", async ({ page }) => {
  await scrollToSelector(page, "#below-the-fold-visit-control-reload-link")
  expect(await isScrolledToTop(page), "scrolled down").toEqual(false)

  await page.evaluate(() => localStorage.setItem("scrolls", "false"))

  page.evaluate(() =>
    addEventListener("click", () => {
      addEventListener("scroll", () => {
        localStorage.setItem("scrolls", "true")
      })
    })
  )

  page.click("#below-the-fold-visit-control-reload-link")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/visit_control_reload.html"))
  const scrolls = await page.evaluate(() => localStorage.getItem("scrolls"))
  expect(scrolls, "scroll position is preserved").toEqual("false")
  expect(await visitAction(page)).toEqual("load")
})

test("changes the html[lang] attribute", async ({ page }) => {
  await page.click("#es_locale_link")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("html")).toHaveAttribute("lang", "es")
})

test("changes the html[dir] attribute", async ({ page }) => {
  await page.click("#dir-rtl")

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
})

test("accumulates script elements in head", async ({ page }) => {
  const assetElements = () => page.$$('script')
  const originalElements = await assetElements()

  await page.click("#additional-script-link")
  await nextBody(page)
  const newElements = await assetElements()
  expect(await deepElementsEqual(page, newElements, originalElements)).toEqual(false)

  await page.goBack()
  await nextBody(page)
  const finalElements = await assetElements()
  expect(await deepElementsEqual(page, finalElements, newElements)).toEqual(true)

  await disposeAll(...originalElements, ...newElements, ...finalElements)
})

test("replaces provisional elements in head", async ({ page }) => {
  const provisionalElements = () => page.$$('head :not(script), head :not(style), head :not(link[rel="stylesheet"])')
  const originalElements = await provisionalElements()
  const meta = page.locator("meta[name=test]")
  await expect(meta).toHaveCount(0)

  await page.click("#same-origin-link")
  await expect(meta).toHaveCount(1)
  const newElements = await provisionalElements()
  expect(await deepElementsEqual(page, newElements, originalElements)).toEqual(false)

  await page.goBack()
  await expect(meta).toHaveCount(0)
  const finalElements = await provisionalElements()
  expect(await deepElementsEqual(page, finalElements, newElements)).toEqual(false)

  await disposeAll(...originalElements, ...newElements, ...finalElements)
})

test("evaluates head stylesheet elements", async ({ page }) => {
  expect(await isStylesheetEvaluated(page)).toEqual(false)

  await page.click("#additional-assets-link")
  await nextEventNamed(page, "turbo:render")
  expect(await isStylesheetEvaluated(page)).toEqual(true)
})

test("does not evaluate head stylesheet elements inside noscript elements", async ({ page }) => {
  expect(await isNoscriptStylesheetEvaluated(page)).toEqual(false)

  await page.click("#additional-assets-link")
  await nextEventNamed(page, "turbo:render")
  expect(await isNoscriptStylesheetEvaluated(page)).toEqual(false)
})

test("does not evaluate body stylesheet elements inside noscript elements", async ({ page }) => {
  expect(await isNoscriptStylesheetEvaluated(page)).toEqual(false)

  await page.click("#body-noscript-link")
  await nextEventNamed(page, "turbo:render")
  expect(await isNoscriptStylesheetEvaluated(page)).toEqual(false)
})

test("preserves noscript elements with non-style content after navigation", async ({ page }) => {
  await page.click("#body-noscript-content-link")
  await nextEventNamed(page, "turbo:render")

  const noscriptCount = await page.locator("#lazy-load-noscript").count()
  expect(noscriptCount).toEqual(1)
})

test("removes only stylesheet elements from noscript with mixed content", async ({ page }) => {
  await page.click("#body-noscript-content-link")
  await nextEventNamed(page, "turbo:render")

  const mixedNoscriptExists = await page.locator("#mixed-noscript").count()
  expect(mixedNoscriptExists).toEqual(1)

  expect(await isNoscriptStylesheetEvaluated(page)).toEqual(false)
})

test("waits for CSS to be loaded before rendering", async ({ page }) => {
  let finishLoadingCSS = (_value) => {}
  const promise = new Promise((resolve) => {
    finishLoadingCSS = resolve
  })
  page.route("**/*.css", async (route) => {
    await promise
    route.continue()
  })

  await page.click("#additional-assets-link")

  expect(await isStylesheetEvaluated(page)).toEqual(false)
  await expect(page.locator("h1")).not.toHaveText("Additional assets")

  finishLoadingCSS()

  await nextEventNamed(page, "turbo:render")

  await expect(page.locator("h1")).toHaveText("Additional assets")
  expect(await isStylesheetEvaluated(page)).toEqual(true)
})

test("waits for CSS to fail before rendering", async ({ page }) => {
  let finishLoadingCSS = (_value) => {}
  const promise = new Promise((resolve) => {
    finishLoadingCSS = resolve
  })
  page.route("**/*.css", async (route) => {
    await promise
    route.abort()
  })

  await page.click("#additional-assets-link")

  expect(await isStylesheetEvaluated(page)).toEqual(false)
  await expect(page.locator("h1")).not.toHaveText("Additional assets")

  finishLoadingCSS()

  await nextEventNamed(page, "turbo:render")

  await expect(page.locator("h1")).toHaveText("Additional assets")
  expect(await isStylesheetEvaluated(page)).toEqual(false)
})

test("waits for some time, but renders if CSS takes too much to load", async ({ page }) => {
  let finishLoadingCSS = (_value) => {}
  const promise = new Promise((resolve) => {
    finishLoadingCSS = resolve
  })
  page.route("**/*.css", async (route) => {
    await promise
    route.continue()
  })

  await page.click("#additional-assets-link")
  await sleep(3000)
  await nextEventNamed(page, "turbo:render")

  await expect(page.locator("h1")).toHaveText("Additional assets")
  expect(await isStylesheetEvaluated(page)).toEqual(false)

  finishLoadingCSS()
  await nextBeat()

  expect(await isStylesheetEvaluated(page)).toEqual(true)
})

test("skip evaluates head script elements once", async ({ page }) => {
  expect(await headScriptEvaluationCount(page)).toEqual(undefined)

  await page.click("#head-script-link")
  await nextEventNamed(page, "turbo:render")
  expect(await headScriptEvaluationCount(page)).toEqual(1)

  await page.goBack()
  await nextEventNamed(page, "turbo:render")
  expect(await headScriptEvaluationCount(page)).toEqual(1)

  await page.click("#head-script-link")
  await nextEventNamed(page, "turbo:render")
  expect(await headScriptEvaluationCount(page)).toEqual(1)
})

test("evaluates body script elements on each render", async ({ page }) => {
  expect(await bodyScriptEvaluationCount(page)).toEqual(undefined)

  await page.click("#body-script-link")
  await nextEventNamed(page, "turbo:render")
  expect(await bodyScriptEvaluationCount(page)).toEqual(1)

  await page.goBack()
  await nextEventNamed(page, "turbo:render")
  expect(await bodyScriptEvaluationCount(page)).toEqual(1)

  await page.click("#body-script-link")
  await nextEventNamed(page, "turbo:render")
  expect(await bodyScriptEvaluationCount(page)).toEqual(2)
})

test("does not evaluate data-turbo-eval=false scripts", async ({ page }) => {
  await page.click("#eval-false-script-link")
  await nextEventNamed(page, "turbo:render")
  expect(await bodyScriptEvaluationCount(page)).toEqual(undefined)
})

test("preserves permanent elements", async ({ page }) => {
  const permanentElement = await page.locator("#permanent")
  await expect(permanentElement).toHaveText("Rendering")

  await page.click("#permanent-element-link")
  await nextEventNamed(page, "turbo:render")
  expect(await strictElementEquals(permanentElement, await page.locator("#permanent"))).toEqual(true)
  await expect(permanentElement).toHaveText("Rendering")

  await page.goBack()
  await nextEventNamed(page, "turbo:render")
  expect(await strictElementEquals(permanentElement, await page.locator("#permanent"))).toEqual(true)
})

test("restores focus during page rendering when transposing the activeElement", async ({ page }) => {
  await page.press("#permanent-input", "Enter")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#permanent-input"), "restores focus after page loads").toBeFocused()
})

test("restores focus during page rendering when transposing an ancestor of the activeElement", async ({
  page
}) => {
  await page.press("#permanent-descendant-input", "Enter")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#permanent-descendant-input"), "restores focus after page loads").toBeFocused()
})

test("before-frame-render event supports custom render function within turbo-frames", async ({ page }) => {
  const frame = await page.locator("#frame")
  await frame.evaluate((frame) =>
    frame.addEventListener("turbo:before-frame-render", (event) => {
      const { detail } = event
      const { render } = detail
      detail.render = (currentElement, newElement) => {
        newElement.insertAdjacentHTML("beforeend", `<span id="custom-rendered">Custom Rendered Frame</span>`)
        render(currentElement, newElement)
      }
    })
  )

  await page.click("#permanent-in-frame-element-link")
  await nextBeat()

  await expect(page.locator("#frame #custom-rendered"), "renders with custom function").toHaveText("Custom Rendered Frame")
})

test("preserves permanent elements within turbo-frames", async ({ page }) => {
  await expect(page.locator("#permanent-in-frame")).toHaveText("Rendering")

  await page.click("#permanent-in-frame-element-link")
  await nextBeat()

  await expect(page.locator("#permanent-in-frame")).toHaveText("Rendering")
})

test("restores focus during turbo-frame rendering when transposing the activeElement", async ({ page }) => {
  await page.press("#permanent-input-in-frame", "Enter")
  await nextBeat()

  await expect(page.locator("#permanent-input-in-frame"), "restores focus after page loads").toBeFocused()
})

test("restores focus during turbo-frame rendering when transposing a descendant of the activeElement", async ({
  page
}) => {
  await page.press("#permanent-descendant-input-in-frame", "Enter")
  await nextBeat()

  await expect(page.locator("#permanent-descendant-input-in-frame"), "restores focus after page loads").toBeFocused()
})

test("preserves permanent element video playback", async ({ page }) => {
  const videoElement = await page.locator("#permanent-video")
  await page.click("#permanent-video-button")
  await sleep(500)

  const timeBeforeRender = await videoElement.evaluate((video) => video.currentTime)
  expect(timeBeforeRender, "playback has started").not.toEqual(0)

  await page.click("#permanent-element-link")
  await nextBody(page)

  const timeAfterRender = await videoElement.evaluate((video) => video.currentTime)
  expect(timeAfterRender, "element state is preserved").toEqual(timeBeforeRender)
})

test("preserves permanent element through Turbo Stream update", async ({ page }) => {
  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="update" target="frame">
        <template>
          <div id="permanent-in-frame" data-turbo-permanent>Ignored</div>
        </template>
      </turbo-stream>
    `)
  })
  await nextBeat()

  await expect(page.locator("#permanent-in-frame")).toHaveText("Rendering")
})

test("preserves permanent element through Turbo Stream append", async ({ page }) => {
  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="append" target="frame">
        <template>
          <div id="permanent-in-frame" data-turbo-permanent>Ignored</div>
        </template>
      </turbo-stream>
    `)
  })
  await nextBeat()

  await expect(page.locator("#permanent-in-frame")).toHaveText("Rendering")
})

test("preserves input values", async ({ page }) => {
  await page.fill("#text-input", "test")
  await page.click("#checkbox-input")
  await page.click("#radio-input")
  await page.fill("#textarea", "test")
  await page.selectOption("#select", "2")
  await page.selectOption("#select-multiple", "2")

  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#text-input")).toHaveValue("test")
  await expect(page.locator("#checkbox-input")).toBeChecked()
  await expect(page.locator("#radio-input")).toBeChecked()
  await expect(page.locator("#textarea")).toHaveValue("test")
  await expect(page.locator("#select")).toHaveValue("2")
  await expect(page.locator("#select-multiple")).toHaveValue("2")
})

test("does not preserve password values", async ({ page }) => {
  await page.fill("#password-input", "test")

  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#password-input")).toHaveValue("")
})

test("<input type='reset'> clears values when restored from cache", async ({ page }) => {
  await page.fill("#text-input", "test")
  await page.click("#checkbox-input")
  await page.click("#radio-input")
  await page.fill("#textarea", "test")
  await page.selectOption("#select", "2")
  await page.selectOption("#select-multiple", "2")

  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await page.click("#reset-input")

  await expect(page.locator("#text-input")).toHaveValue("")
  await expect(page.locator("#checkbox-input")).not.toBeChecked()
  await expect(page.locator("#radio-input")).not.toBeChecked()
  await expect(page.locator("#textarea")).toHaveValue("")
  await expect(page.locator("#select")).toHaveValue("1")
  await expect(page.locator("#select-multiple")).toHaveValue("")
})

test("before-cache event", async ({ page }) => {
  await page.evaluate(() => {
    addEventListener("turbo:before-cache", () => (document.body.innerHTML = "Modified"), { once: true })
  })
  await page.click("#same-origin-link")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("body")).toHaveText("Modified")
})

test("mutation record-cache notification", async ({ page }) => {
  await modifyBodyAfterRemoval(page)
  await page.click("#same-origin-link")
  await nextBody(page)
  await page.goBack()

  await expect(page.locator("body")).toHaveText("Modified")
})

test("error pages", async ({ page }) => {
  await page.click("#nonexistent-link")

  await expect(page.locator("body")).toHaveText("\nCannot GET /nonexistent\n\n\n")
})

test("rendering a redirect response replaces the body once and only once", async ({ page }) => {
  await page.click("#redirect-link")
  await nextBodyMutation(page)

  expect(await noNextBodyMutation(page), "replaces <body> element once").toEqual(true)
})

function deepElementsEqual(page, left, right) {
  return page.evaluate(
    ([left, right]) => left.length == right.length && left.every((element) => right.includes(element)),
    [left, right]
  )
}

function headScriptEvaluationCount(page) {
  return page.evaluate(() => window.headScriptEvaluationCount)
}

function bodyScriptEvaluationCount(page) {
  return page.evaluate(() => window.bodyScriptEvaluationCount)
}

function isStylesheetEvaluated(page) {
  return page.evaluate(
    () => getComputedStyle(document.body).getPropertyValue("--black-if-evaluated").trim() === "black"
  )
}

function isNoscriptStylesheetEvaluated(page) {
  return page.evaluate(
    () => getComputedStyle(document.body).getPropertyValue("--black-if-noscript-evaluated").trim() === "black"
  )
}

function modifyBodyAfterRemoval(page) {
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
