import { expect, test } from "@playwright/test"
import { nextBeat, nextEventOnTarget, noNextEventNamed, noNextEventOnTarget, sleep } from "../helpers/page"
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

test("it cancels pending prefetch requests if a new request is made", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  // Prefetch a request, that takes a long time to load
  await hoverSelector({ page, selector: "#anchor_for_slow_prefetch" })
  await page.click("#anchor_for_slow_prefetch", {noWaitAfter: true})

  // Issue a new request to a secondary resource, that loads fast
  await page.click("#anchor_for_prefetch")

  // Allow for the slow request to be processed if it wasn't canceled
  await sleep(1100)

  // The page should show the secondary resource
  await expect(page).toHaveTitle("Prefetched Page")
  await expect(page).toHaveURL("src/tests/fixtures/prefetched.html")
})

test("it cancels pending prefetch requests if a new prefetch request is made", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  // Prefetch a request, that takes a long time to load
  await hoverSelector({ page, selector: "#anchor_for_slow_prefetch" })
  await page.click("#anchor_for_slow_prefetch", {noWaitAfter: true})

  // Issue a new request including prefetch to a secondary resource, that loads fast
  await hoverSelector({ page, selector: "#anchor_for_prefetch" })
  await page.click("#anchor_for_prefetch")

  await sleep(1100)

  // The page should show the secondary resource
  await expect(page).toHaveTitle("Prefetched Page")
  await expect(page).toHaveURL("src/tests/fixtures/prefetched.html")
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

test("it follows the link using the cached response when clicking on a link that has been prefetched", async ({
  page
}) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await hoverSelector({ page, selector: "#anchor_for_prefetch" })

  await clickSelector({ page, selector: "#anchor_for_prefetch" })
  await expect(page).toHaveTitle("Prefetched Page")
})

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
