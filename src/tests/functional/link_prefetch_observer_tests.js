import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat, sleep } from "../helpers/page"

test("it prefetches the page", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
})

test("it doesn't follow the link", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await hoverSelector({ page, selector: "#anchor_for_prefetch" })

  assert.equal(await page.title(), "Hover to Prefetch")
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

test("it doesn't prefetch the page when link has data-turbo-prefetch=false", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_prefetch_false" })
})

test("it doesn't prefetch the page when link has data-turbo=false", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_false" })
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

test("it prefetches the page on mousedown when turbo-prefetch-trigger-event is set to mousedown", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch_mousedown.html" })
  await assertPrefetchedOnMouseDown({ page, selector: "#anchor_for_prefetch" })
})

test("it doesn't prefetch the page on mouseover when turbo-prefetch-trigger-event is set to mousedown", async ({
  page
}) => {
  await goTo({ page, path: "/hover_to_prefetch_mousedown.html" })
  await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
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

test("it adds text/vnd.turbo-stream.html header to the Accept header when link has data-turbo-stream", async ({
  page
}) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_with_turbo_stream", callback: (request) => {
    const headers = request.headers()["accept"].split(",").map((header) => header.trim())

    assert.includeMembers(headers, ["text/vnd.turbo-stream.html", "text/html", "application/xhtml+xml"])
  }})
})

test("it prefetches links with inner elements", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await assertPrefetchedOnHover({ page, selector: "#anchor_with_inner_elements" })
})

test("it prefetches links with a delay if present on the element itself", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  let requestMade = false
  page.on("request", async (request) => (requestMade = true))

  await page.hover("#anchor_with_delay")
  await sleep(100)

  assertRequestNotMade(requestMade)

  await sleep(300)

  assertRequestMade(requestMade)
})

test("it cancels the prefetch request if the link with delay present on itself is no longer hovered", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  let requestMade = false
  page.on("request", async (request) => (requestMade = true))

  await page.hover("#anchor_with_delay")
  await sleep(100)

  assertRequestNotMade(requestMade)

  await page.mouse.move(0, 0)

  await sleep(300)

  assertRequestNotMade(requestMade)
})

test("it prefetches links with a delay if present on the meta tag", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch_with_delay_on_meta_tag.html" })

  let requestMade = false
  page.on("request", async (request) => (requestMade = true))

  await page.hover("#anchor_for_prefetch")
  await sleep(100)

  assertRequestNotMade(requestMade)

  await sleep(300)

  assertRequestMade(requestMade)
})

test("it cancels the prefetch request if the link with delay present on the meta tag is no longer hovered", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch_with_delay_on_meta_tag.html" })

  let requestMade = false
  page.on("request", async (request) => (requestMade = true))

  await page.hover("#anchor_for_prefetch")
  await sleep(100)

  assertRequestNotMade(requestMade)

  await page.mouse.move(0, 0)

  await sleep(300)

  assertRequestNotMade(requestMade)
})

test("it does not make a network request when clicking on a link that has been prefetched", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await hoverSelector({ page, selector: "#anchor_for_prefetch" })

  await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
})

test("it does not more than 2 network requests when hovering between 2 links", async ({ page }) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })

  let requestCount = 0

  page.on("request", async (request) => {
    requestCount++
  })

  await hoverSelector({ page, selector: "#anchor_for_prefetch" })
  await hoverSelector({ page, selector: "#anchor_for_prefetch_other_href" })
  await hoverSelector({ page, selector: "#anchor_for_prefetch" })
  await hoverSelector({ page, selector: "#anchor_for_prefetch_other_href" })

  assert.equal(requestCount, 2)
})

test("it follows the link using the cached response when clicking on a link that has been prefetched", async ({
  page
}) => {
  await goTo({ page, path: "/hover_to_prefetch.html" })
  await hoverSelector({ page, selector: "#anchor_for_prefetch" })

  await clickSelector({ page, selector: "#anchor_for_prefetch" })
  assert.equal(await page.title(), "Prefetched Page")
})

const assertPrefetchedOnHover = async ({ page, selector, callback }) => {
  let requestMade = false

  page.on("request", (request) => {
    callback && callback(request)
    requestMade = true
  })

  await hoverSelector({ page, selector })

  assertRequestMade(requestMade)
}

const assertNotPrefetchedOnHover = async ({ page, selector, callback }) => {
  let requestMade = false

  page.on("request", (request) => {
    callback && callback(request)
    requestMade = true
  })

  await hoverSelector({ page, selector })

  assert.equal(requestMade, false, "Network request was made when it should not have been.")
}

const assertPrefetchedOnMouseDown = async ({ page, selector, callback }) => {
  let requestMade = false

  page.on("request", (request) => {
    callback && callback(request)
    requestMade = true
  })

  await page.hover(selector)
  await page.mouse.down()
  await nextBeat()

  assertRequestMade(requestMade)
}

const assertRequestMade = (requestMade) => {
  assert.equal(requestMade, true, "Network request wasn't made when it should have been.")
}

const assertRequestNotMade = (requestMade) => {
  assert.equal(requestMade, false, "Network request was made when it should not have been.")
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
