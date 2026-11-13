import { expect, test } from "@playwright/test"

for (const invalidation of ["cache.clear", "successful Stream submission"]) {
  test(`a pending preload cannot refill snapshots after ${invalidation}`, async ({ page }) => {
    const held = await holdPreload(page)

    try {
      await page.goto("/src/tests/fixtures/preloading.html")
      await held.arrived
      await observePreloadCompletion(page)

      if (invalidation === "cache.clear") {
        await page.evaluate(() => window.Turbo.cache.clear())
      } else {
        await page.evaluate(() => {
          document.documentElement.setAttribute("data-skip-event-details", "turbo:submit-start turbo:submit-end")
          const messages = document.createElement("div")
          messages.id = "messages"
          const form = document.createElement("form")
          form.action = "/__turbo/messages"
          form.method = "post"
          form.innerHTML = '<input name="content" value="Saved during preload"><input name="type" value="stream">'
          form.addEventListener("turbo:submit-end", () => window.invalidationSubmitFinished = true, { once: true })
          document.body.append(messages, form)
          form.requestSubmit()
        })
        await page.waitForFunction(() => window.invalidationSubmitFinished)
        await expect(page.locator("#messages .message")).toHaveText("Saved during preload")
      }

      expect(await preloadIsCached(page)).toEqual(false)
      held.release()
      await page.waitForFunction(() => window.preloadHandled)
      expect(await preloadIsCached(page)).toEqual(false)
    } finally {
      held.release()
      await held.finished
    }
  })
}

async function observePreloadCompletion(page) {
  await page.evaluate(() => {
    const preloader = window.Turbo.session.preloader
    // No public event signals completion of the asynchronous preload cache write.
    const original = preloader.requestSucceededWithResponse
    preloader.requestSucceededWithResponse = function (...args) {
      const result = original.apply(this, args)
      result.then(() => window.preloadHandled = true)
      return result
    }
  })
}

function preloadIsCached(page) {
  return page.evaluate(() => {
    const location = new URL(document.getElementById("preload_anchor").href)
    return window.Turbo.session.view.snapshotCache.has(location)
  })
}

async function holdPreload(page) {
  let release
  const released = new Promise((resolve) => release = resolve)
  let arrive
  const arrived = new Promise((resolve) => arrive = resolve)
  let finished = Promise.resolve()
  await page.route("**/src/tests/fixtures/preloaded.html", (route) => {
    finished = (async () => {
      arrive()
      await released
      if (!route.request().failure()) await route.continue()
    })()
    return finished
  })

  return { arrived, release, get finished() { return finished } }
}
