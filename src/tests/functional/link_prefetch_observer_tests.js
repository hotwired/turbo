import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat, sleep } from "../helpers/page"

test.describe("when hovering over a link", () => {
  test.beforeEach(async ({ page }) => {
    await goTo({ page, path: "/hover_to_prefetch.html" })
  })

  test("it prefetches the page", async ({ page }) => {
    await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
  })

  test("it doesn't follow the link", async ({ page }) => {
    await hoverSelector({ page, selector: "#anchor_for_prefetch" })

    assert.equal(await page.title(), "Hover to Prefetch")
  })

  test.describe("when link has a whole valid url as a href", () => {
    test("it prefetches the page", async ({ page }) => {
      await assertPrefetchedOnHover({ page, selector: "#anchor_with_whole_url" })
    })
  })

  test.describe("when link has the same location but with a query string", () => {
    test("it prefetches the page", async ({ page }) => {
      await assertPrefetchedOnHover({ page, selector: "#anchor_for_same_location_with_query" })
    })
  })

  test.describe("when link is inside an element with data-turbo=false", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_false_parent" })
    })
  })

  test.describe("when link is inside an element with data-turbo-prefetch=false", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_prefetch_false_parent" })
    })
  })

  test.describe("when link has data-turbo-prefetch=false", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_prefetch_false" })
    })
  })

  test.describe("when link has data-turbo=false", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_turbo_false" })
    })
  })

  test.describe("when link has the same location as the current page", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_same_location" })
    })
  })

  test.describe("when link has a different origin", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_different_origin" })
    })
  })

  test.describe("when link has an hash as a href", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_hash" })
    })
  })

  test.describe("when link has a ftp protocol", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_ftp_protocol" })
    })
  })

  test.describe("when link is valid but it's inside an iframe", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_iframe_target" })
    })
  })

  test.describe("when link has a POST data-turbo-method", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_with_post_method" })
    })
  })

  test.describe("when turbo-prefetch meta tag is set to false", () => {
    test.beforeEach(async ({ page }) => {
      await goTo({ page, path: "/hover_to_prefetch_disabled.html" })
    })

    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
    })
  })

  test.describe("when turbo-prefetch-trigger-event is set to mousedown", () => {
    test.beforeEach(async ({ page }) => {
      await goTo({ page, path: "/hover_to_prefetch_mousedown.html" })
    })

    test("it prefetches the page on mousedown", async ({ page }) => {
      await assertPrefetchedOnMouseDown({ page, selector: "#anchor_for_prefetch" })
    })

    test("it doesn't prefetch the page on mouseover", async ({ page }) => {
      await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
    })
  })

  test.describe("when turbo-prefetch-cache-time is set to 1", () => {
    test.beforeEach(async ({ page }) => {
      await goTo({ page, path: "/hover_to_prefetch_custom_cache_time.html" })
    })

    test("it prefetches the page", async ({ page }) => {
      await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
    })

    test("it caches the request for 1 second", async ({ page }) => {
      await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })

      await sleep(10)
      await page.mouse.move(0, 0)

      await assertPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
    })
  })
})

test.describe("when clicking on a link that has been prefetched", () => {
  test.beforeEach(async ({ page }) => {
    await goTo({ page, path: "/hover_to_prefetch.html" })
    await hoverSelector({ page, selector: "#anchor_for_prefetch" })
  })

  test("it does not make a network request", async ({ page }) => {
    await assertNotPrefetchedOnHover({ page, selector: "#anchor_for_prefetch" })
  })

  test("it follows the link using the cached response", async ({ page }) => {
    await clickSelector({ page, selector: "#anchor_for_prefetch" })

    assert.equal(await page.title(), "Prefetched Page")
  })
})

const assertPrefetchedOnHover = async ({ page, selector }) => {
  let requestMade = false

  page.on("request", (request) => (requestMade = true))

  await hoverSelector({ page, selector })

  assert.equal(requestMade, true, "Network request wasn't made when it should have been.")
}

const assertNotPrefetchedOnHover = async ({ page, selector }) => {
  let requestMade = false

  page.on("request", (request) => (requestMade = true))

  await hoverSelector({ page, selector })

  assert.equal(requestMade, false, "Network request was made when it should not have been.")
}

const assertPrefetchedOnMouseDown = async ({ page, selector }) => {
  let requestMade = false

  page.on("request", (request) => (requestMade = true))

  await page.hover(selector)
  await page.mouse.down()
  await nextBeat()

  assert.equal(requestMade, true, "Network request wasn't made when it should have been.")
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