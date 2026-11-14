import { expect, test } from "@playwright/test"
import {
  nextBeat, nextEventOnTarget, noNextEventNamed, noNextEventOnTarget,
  sleep, listenForEventOnTarget, readEventLogs
} from "../helpers/page"
import fs from "fs"
import path from "path"

// eslint-disable-next-line no-undef
const fixturesDir = path.join(process.cwd(), "src", "tests", "fixtures")

test.afterEach(() => {
  fs.readdirSync(fixturesDir).forEach(file => {
    if (file.startsWith("volatile_posts_database")) {
      fs.unlinkSync(path.join(fixturesDir, file))
    }
  })
})

test("it prefetches the page", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  const link = page.locator("#anchor_for_prefetch")

  await link.hover()
  await nextEventOnTarget(page, "anchor_for_prefetch", "turbo:before-prefetch")
  const { url, fetchOptions } = await nextEventOnTarget(page, "anchor_for_prefetch", "turbo:before-fetch-request")

  await expect(link).toHaveJSProperty("href", url)
  expect(fetchOptions.headers["X-Sec-Purpose"]).toEqual("prefetch")
  expect(fetchOptions.priority).toEqual("low")

  await link.hover()
  await noNextEventOnTarget(page, "anchor_for_prefetch", "turbo:before-fetch-request")
  await link.click()
  await noNextEventOnTarget(page, "anchor_for_prefetch", "turbo:before-fetch-request")

  await expect(page.locator("body")).toHaveText("Prefetched Page Content")
})

test("it doesn't follow the link", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await hoverSelector({ page, selector: "#anchor_for_prefetch" })

  await expect(page).toHaveTitle("Hover to Prefetch")
})

test("prefetches the page when link has a whole valid url as a href", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_with_whole_url" })
})

test("it prefetches the page when link has the same location but with a query string", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_for_same_location_with_query" })
})

test("it doesn't prefetch the page when link is inside an element with data-turbo=false", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_false_parent" })
})

test("it doesn't prefetch the page when link is inside an element with data-turbo-prefetch=false", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_prefetch_false_parent" })
})

test("it does prefech the page when link is inside a container with data-turbo-prefetch=true, that is within an element with data-turbo-prefetch=false", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_with_turbo_prefetch_true_parent_within_turbo_prefetch_false_parent" })
})

test("it doesn't prefetch the page when link has data-turbo-prefetch=false", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_prefetch_false" })
})

test("it doesn't prefetch the page when link has data-turbo=false", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_false" })
})

test("allows to cancel prefetch requests with custom logic", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  const link = page.locator("#anchor_for_prefetch")
  await link.evaluate(a => a.addEventListener("turbo:before-prefetch", event => event.preventDefault()))

  await link.hover()
  await nextEventOnTarget(page, "anchor_for_prefetch", "turbo:before-prefetch")
  await noNextEventNamed(page, "turbo:before-fetch-request")
  await link.click()

  await expect(page.locator("body")).toHaveText("Prefetched Page Content")
})

test("it doesn't prefetch UJS links", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_remote_true" })
})

test("it doesn't prefetch data-turbo-stream links", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_stream" })
})

test("it doesn't prefetch data-turbo-confirm links", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_confirm" })
})

test("it doesn't prefetch the page when link has the same location", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_same_location" })
})

test("it doesn't prefetch the page when link has a different origin", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_different_origin" })
})

test("it doesn't prefetch the page when link has a hash as a href", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_hash" })
})

test("it doesn't prefetch the page when SVG link has a hash as a href", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_hash_inside_svg" })
})

test("it doesn't prefetch the page when link has a ftp protocol", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_ftp_protocol" })
})

test("it doesn't prefetch the page when links is valid but it's inside an iframe", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_iframe_target" })
})

test("it doesn't prefetch the page when link has a POST data-turbo-method", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_post_method" })
})

test("it doesn't prefetch the page when turbo-prefetch meta tag is set to false", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch_disabled.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
})

test("it doesn't prefetch the page when turbo-prefetch meta tag is set to true, but is later set to false", async ({
  page
}) => {
  await goTo({ page, path: "/hover_to_prefetch_custom_cache_time.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })

  await page.evaluate(() => {
    const meta = document.querySelector('meta[name="turbo-prefetch"]')
    meta.setAttribute("content", "false")
  })

  await sleep(10)
  await page.mouse.move(0, 0)

  await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
})

test("it prefetches when visiting a page without the meta tag, then visiting a page with it", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch_without_meta_tag_with_link_to_with_meta_tag.html" })

  await clickSelector({ page, selector: "#anchor_for_page_with_meta_tag" })

  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
})

test("it prefetches the page when turbo-prefetch-cache-time is set to 1", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch_custom_cache_time.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
})

test("it caches the request for 1 millisecond when turbo-prefetch-cache-time is set to 1", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch_custom_cache_time.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })

  await sleep(10)
  await page.mouse.move(0, 0)

  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
})

test("it prefetches links with inner elements", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_with_inner_elements" })
})

test("it prefetches links inside a turbo frame", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch_in_frame", callback: (request) => {
    const turboFrameHeader = request.headers()["turbo-frame"]
    expect(turboFrameHeader).toEqual("frame_for_prefetch")
  }})
})


test("doesn't include a turbo-frame header when the link is inside a turbo frame with a target=_top", async ({ page}) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch_in_frame_target_top", callback: (request) => {
    const turboFrameHeader = request.headers()["turbo-frame"]
    expect(turboFrameHeader).toEqual(undefined)
  }})
})

test("includes turbo-frame header when the link with a data-turbo-frame=_self is inside a turbo frame", async ({ page}) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch_in_frame_target_self", callback: (request) => {
    const turboFrameHeader = request.headers()["turbo-frame"]
    expect(turboFrameHeader).toEqual("frame_for_prefetch_self")
  }})
})

test("doesn't include turbo-frame header when the link with a data-turbo-frame=_self is outside of a turbo frame", async ({ page}) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch_out_of_frame_target_self", callback: (request) => {
    const turboFrameHeader = request.headers()["turbo-frame"]
    expect(turboFrameHeader).toEqual(undefined)
  }})
})

test("it prefetches links with a delay", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  await assertRequestNotMade(page, async () => {
    await page.hover("#anchor_for_prefetch")
    await sleep(75)
  })

  await assertRequestMade(page, async () => {
    await sleep(100)
  })
})

test("it cancels the prefetch request if the link is no longer hovered", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  await assertRequestNotMade(page, async () => {
    await page.hover("#anchor_for_prefetch")
    await sleep(75)
  })

  await assertRequestNotMade(page, async () => {
    await page.mouse.move(0, 0)
    await sleep(100)
  })
})

for (const prefetchNextPage of [false, true]) {
  test(`it cancels an adopted prefetch when another navigation starts${prefetchNextPage ? " using a prefetch" : ""}`, async ({ page }) => {
    const held = await holdPrefetchResponse(page)

    try {
      await page.hover("#anchor_for_prefetch_other_href")
      await held.started(1)
      await followPendingPrefetch(page)

      if (prefetchNextPage) {
        const response = page.waitForResponse("**/src/tests/fixtures/prefetched.html")
        await page.hover("#anchor_for_prefetch")
        await (await response).finished()
      }
      await page.locator("#anchor_for_prefetch").evaluate(link => link.click())

      await page.waitForFunction(() => window.adoptedPrefetch.abortSignal.aborted)
      await expect(page).toHaveTitle("Prefetched Page")
      await expect(page).toHaveURL("/src/tests/fixtures/prefetched.html")
      held.release()
      await held.finished()
      await expect(page).toHaveURL("/src/tests/fixtures/prefetched.html")
    } finally {
      held.release()
      await held.finished()
    }
  })
}

test("it cancels an unadopted prefetch when the same link is hovered again", async ({ page }) => {
  const held = await holdPrefetchResponse(page)

  try {
    await page.hover("#anchor_for_prefetch_other_href")
    await held.started(1)
    await page.mouse.move(0, 0)
    await page.hover("#anchor_for_prefetch_other_href")
    await held.started(2)

    expect(await page.evaluate(() => window.pendingPrefetches.map(signal => signal.aborted))).toEqual([true, false])
    expect(held.requests).toHaveLength(2)
  } finally {
    held.release()
    await held.finished()
  }
})

test("it adopts the running prefetch without issuing another request", async ({ page }) => {
  const held = await holdPrefetchResponse(page)

  try {
    await page.hover("#anchor_for_prefetch_other_href")
    await held.started(1)
    await followPendingPrefetch(page)

    expect(await page.evaluate(() => window.adoptedPrefetch.abortSignal === window.pendingPrefetches[0])).toBe(true)
    expect(await page.evaluate(() => window.adoptedPrefetch.abortSignal.aborted)).toBe(false)
    held.release()

    await expect(page).toHaveTitle("Prefetched Page")
    await expect(page).toHaveURL("/src/tests/fixtures/prefetched.html?slow=true")
    expect(held.requests).toHaveLength(1)
  } finally {
    held.release()
    await held.finished()
  }
})

test("rehovering does not abort the prefetch adopted by a navigation", async ({ page }) => {
  const held = await holdPrefetchResponse(page)

  try {
    await page.hover("#anchor_for_prefetch_other_href")
    await held.started(1)
    await followPendingPrefetch(page)
    await page.mouse.move(0, 0)
    await page.hover("#anchor_for_prefetch_other_href")
    await held.started(2)

    expect(await page.evaluate(() => window.adoptedPrefetch.abortSignal.aborted)).toBe(false)
    held.release()

    await expect(page).toHaveTitle("Prefetched Page")
    await expect(page).toHaveURL("/src/tests/fixtures/prefetched.html?slow=true")
    expect(held.requests).toHaveLength(2)
  } finally {
    held.release()
    await held.finished()
  }
})

test("it adopts a pending prefetch when the navigation changes only its fragment", async ({ page }) => {
  const held = await holdPrefetchResponse(page)

  try {
    await page.locator("#anchor_for_prefetch_other_href").evaluate(link => link.hash = "first")
    await page.hover("#anchor_for_prefetch_other_href")
    await held.started(1)
    await page.locator("#anchor_for_prefetch_other_href").evaluate(link => link.hash = "second")
    await followPendingPrefetch(page)

    expect(await page.evaluate(() => window.adoptedPrefetch.abortSignal.aborted)).toBe(false)
    held.release()

    await expect(page).toHaveTitle("Prefetched Page")
    await expect(page).toHaveURL("/src/tests/fixtures/prefetched.html?slow=true#second")
    expect(held.requests).toHaveLength(1)
  } finally {
    held.release()
    await held.finished()
  }
})

test("it resets the cache when a link is hovered", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  let requestCount = 0
  page.on("request", async () => (requestCount++))

  await page.hover("#anchor_for_prefetch")
  await sleep(200)

  expect(requestCount).toEqual(1)
  await page.mouse.move(0, 0)

  await page.hover("#anchor_for_prefetch")
  await sleep(200)

  expect(requestCount).toEqual(2)
})

test("it does not make a network request when clicking on a link that has been prefetched", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
  await assertRequestNotMadeOnClick({ page, selector: "#anchor_for_prefetch" })
})

test("it reuses the prefetched response when the link query is not URLSearchParams-serialized", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_with_non_normalized_query" })
  await assertRequestNotMadeOnClick({ page, selector: "#anchor_with_non_normalized_query" })

  await expect(page).toHaveTitle("Prefetched Page")
})

test("it reuses the prefetched response for a frame link whose query is not URLSearchParams-serialized", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertPrefetchedOnHover({
    page,
    selector: "#anchor_for_prefetch_in_frame_with_non_normalized_query",
    callback: (request) => {
      expect(request.headers()["turbo-frame"]).toEqual("frame_for_prefetch_query")
    }
  })
  await assertRequestNotMadeOnClick({ page, selector: "#anchor_for_prefetch_in_frame_with_non_normalized_query" })

  await expect(page.locator("#frame_for_prefetch_query")).toContainText("Prefetched frame content")
})

test("it follows the link using the cached response when clicking on a link that has been prefetched", async ({
  page
}) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await hoverSelector({ page, selector: "#anchor_for_prefetch" })

  await clickSelector({ page, selector: "#anchor_for_prefetch" })
  await expect(page).toHaveTitle("Prefetched Page")
})

test("it doesn't prefetch the page while a POST form submission is in progress", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await page.evaluate(() => {
    window.timings = {}
    const record = (name) => () => (window.timings[name] ??= performance.now())
    // Timers with the same delay run in the order they were scheduled, so this one runs after
    // the prefetch timer that LinkPrefetchObserver schedules once this event has been dispatched
    document.getElementById("anchor_under_form").addEventListener("turbo:before-prefetch", () => {
      queueMicrotask(() => setTimeout(record("prefetchDelayElapsed"), 100))
    })
    document.getElementById("form_over_anchor").addEventListener("turbo:before-fetch-response", record("responded"))
  })

  const prefetchRequests = []
  page.on("request", (request) => {
    if (request.headers()["x-sec-purpose"] === "prefetch") prefetchRequests.push(request.url())
  })

  await submitFormAndWait(page, () => page.click("#form_over_anchor button"))

  const { prefetchDelayElapsed, responded } = await page.evaluate(() => window.timings)
  expect(prefetchDelayElapsed).toBeLessThan(responded)
  expect(prefetchRequests).toEqual([])
})

test("it cancels a scheduled prefetch when a POST form submission starts", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  const prefetchRequests = []
  page.on("request", (request) => {
    if (request.headers()["x-sec-purpose"] === "prefetch") prefetchRequests.push(request.url())
  })

  await submitFormAndWait(page, () => page.evaluate(() => {
    window.timings = {}
    const record = (name) => () => (window.timings[name] ??= performance.now())
    document.getElementById("form_over_anchor").addEventListener("turbo:before-fetch-response", record("responded"))

    document.getElementById("anchor_for_prefetch").dispatchEvent(new MouseEvent("mouseenter"))
    // Runs after the prefetch timer that LinkPrefetchObserver has just scheduled
    setTimeout(record("prefetchDelayElapsed"), 100)
    document.getElementById("form_over_anchor").requestSubmit()
  }))

  const { prefetchDelayElapsed, responded } = await page.evaluate(() => window.timings)
  expect(prefetchDelayElapsed).toBeLessThan(responded)
  expect(prefetchRequests).toEqual([])
})

test("it prefetches the page again after a POST form submission finishes", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await submitFormAndWait(page, () => page.click("#form_over_anchor button"), ["turbo:submit-end", "turbo:load"])

  const link = page.locator("#anchor_for_prefetch")
  await link.hover()
  const { url, fetchOptions } = await nextEventOnTarget(page, "anchor_for_prefetch", "turbo:before-fetch-request")

  await expect(link).toHaveJSProperty("href", url)
  expect(fetchOptions.headers["X-Sec-Purpose"]).toEqual("prefetch")
})

for (const [target, selector] of [["_self", "#anchor_with_self_target"], ["empty", "#anchor_with_empty_target"]]) {
  test(`prefetches and reuses the GET for target=${target}`, async ({ page }) => {
    await goTo({ page, path: "/hover_to_prefetch.html" })
    await page.evaluate(() => window.prefetchVisitSentinel = true)

    const { requests } = await prefetchAndFollowLink(page, selector)

    await expect(page.locator("body")).toHaveText("Prefetched Page Content")
    expect(await page.evaluate(() => window.prefetchVisitSentinel)).toEqual(true)
    expect(requests).toHaveLength(1)
  })
}

test("prefetches and reuses the GET for target=_self in a turbo frame", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  const { requests, prefetchedRequest } = await prefetchAndFollowLink(page, "#anchor_with_self_target_in_frame")

  await expect(page.locator("#frame_for_prefetch_query")).toHaveText("Prefetched frame content")
  await expect(page).toHaveTitle("Hover to Prefetch")
  expect(prefetchedRequest.headers()["turbo-frame"]).toEqual("frame_for_prefetch_query")
  expect(requests).toHaveLength(1)
})

for (const [target, selector] of [
  ["_top", "#anchor_with_top_target"],
  ["_parent", "#anchor_with_parent_target"],
  ["_blank", "#anchor_with_blank_target"]
]) {
  test(`does not prefetch links targeting ${target}`, async ({ page }) => {
    await page.goto("/src/tests/fixtures/hover_to_prefetch.html")
    const targetId = selector.slice(1)
    const link = page.locator(selector)
    await expect(link).toHaveAttribute("target", target)
    await listenForEventOnTarget(page, targetId, "mouseenter")
    await readEventLogs(page)
    const requests = []
    page.on("request", (request) => {
      if (request.headers()["x-sec-purpose"] === "prefetch") requests.push(request)
    })

    await link.hover()
    await page.waitForFunction((targetId) => {
      return window.eventLogs.some(([name, , id]) => name === "mouseenter" && id === targetId)
    }, targetId)
    const events = await readEventLogs(page)
    const eventNames = events.filter(([, , id]) => id === targetId).map(([name]) => name)

    expect(eventNames).toContain("mouseenter")
    expect(requests).toHaveLength(0)
    expect(eventNames).not.toContain("turbo:before-prefetch")
  })
}

const assertPrefetchedOnHover = async ({ page, selector, callback }) => {
  await assertRequestMade(page, async () => {
    await hoverSelector({ page, selector })

    await sleep(100)
  }, callback)
}

const assertNotPrefetchedOnHover = async ({ page, selector, callback }) => {
  await assertRequestNotMade(page, async () => {
    await hoverSelector({ page, selector })

    await sleep(100)
  }, callback)
}

const assertRequestNotMadeOnClick = async ({ page, selector }) => {
  await assertRequestNotMade(page, async () => {
    await clickSelector({ page, selector })
  })
}

const assertRequestMade = async (page, action, callback) => {
  let requestMade = false
  page.on("request", async (request) => requestMade = request)

  await action()

  expect(!!requestMade, "Network request wasn't made when it should have been.").toEqual(true)

  if (callback) {
    await callback(requestMade)
  }
}

const assertRequestNotMade = async (page, action, callback) => {
  let requestMade = false
  page.on("request", async (request) => requestMade = request)

  await action()

  expect(!!requestMade, "Network request was made when it should not have been.").toEqual(false)

  if (callback) {
    await callback(requestMade)
  }
}

const goTo = async ({ page, path }) => {
  await page.goto(`/src/tests/fixtures${path}`)
  await nextBeat()
}

const hoverSelector = async ({ page, selector }) => {
  await page.hover(selector)
  await nextBeat()
}

const clickSelector = async ({ page, selector }) => {
  await page.click(selector)
  await nextBeat()
}

async function prefetchAndFollowLink(page, selector) {
  const link = page.locator(selector)
  const url = await link.evaluate((element) => element.href)
  const requests = []
  page.on("request", (request) => {
    if (request.url() === url) requests.push(request)
  })
  const responsePromise = page.waitForResponse((response) => {
    return response.url() === url && response.request().headers()["x-sec-purpose"] === "prefetch"
  }, { timeout: 5000 })

  await link.hover()
  const response = await responsePromise
  await response.finished()
  expect(response.status()).toEqual(200)
  await link.click()

  return { requests, prefetchedRequest: response.request() }
}

async function holdPrefetchResponse(page) {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await page.locator("#anchor_for_prefetch_other_href").evaluate(link => {
    link.href = "/src/tests/fixtures/prefetched.html?slow=true"
  })
  await page.evaluate(() => {
    window.pendingPrefetches = []
    document.addEventListener("turbo:before-fetch-request", event => {
      if (event.detail.fetchOptions.headers["X-Sec-Purpose"] === "prefetch") {
        window.pendingPrefetches.push(event.detail.fetchOptions.signal)
      }
      if (event.detail.fetchRequest && !window.adoptedPrefetch) window.adoptedPrefetch = event.detail.fetchRequest
    })
  })

  let release
  const released = new Promise(resolve => release = resolve)
  const requests = []
  const pendingResponses = []
  await page.route("**/src/tests/fixtures/prefetched.html?slow=true", route => {
    const request = route.request()
    requests.push(request)
    const response = (async () => {
      await released
      if (!request.failure()) await route.continue()
    })()
    pendingResponses.push(response)
    return response
  })

  return {
    release,
    requests,
    started: count => expect.poll(() => requests.length).toBe(count),
    finished: () => Promise.all(pendingResponses)
  }
}

async function followPendingPrefetch(page) {
  await page.locator("#anchor_for_prefetch_other_href").evaluate(link => link.click())
  await page.waitForFunction(() => !!window.adoptedPrefetch)
}

async function submitFormAndWait(page, submit, events = ["turbo:submit-end"]) {
  await page.evaluate(eventNames => {
    window.formSubmissionCompleted = Promise.all(eventNames.map(eventName => new Promise(resolve => {
      document.addEventListener(eventName, () => resolve(), { once: true })
    })))
  }, events)
  await submit()
  await page.evaluate(() => window.formSubmissionCompleted.then(() => {}))
}
