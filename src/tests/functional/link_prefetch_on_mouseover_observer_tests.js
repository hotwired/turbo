import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat } from "../helpers/page"

test.describe("when hovering over a link", () => {
  test.beforeEach(async ({ page }) => {
    await goTo({ page, path: "/hover_to_prefetch.html" })
  })

  test("it prefetches the page", async ({ page }) => {
    await assertPrefetchedOnMouseover({ page, selector: "#prefetch_anchor" })
  })

  test("it doesn't follow the link", async ({ page }) => {
    await hoverSelector({ page, selector: "#prefetch_anchor" })

    assert.equal(await page.title(), "Hover to Prefetch")
  })

  test.describe("when link has a whole valid url as a href", () => {
    test("it prefetches the page", async ({ page }) => {
      await assertPrefetchedOnMouseover({ page, selector: "#anchor_with_whole_url" })
    })
  })

  test.describe("when link has the same location but with a query string", () => {
    test("it prefetches the page", async ({ page }) => {
      await assertPrefetchedOnMouseover({ page, selector: "#same_location_anchor_with_query" })
    })
  })

  test.describe("when link is inside an element with data-turbo=false", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#turbo_false_parent_anchor" })
    })
  })

  test.describe("when link is inside an element with data-turbo-prefetch=false", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#turbo_prefetch_false_parent_anchor" })
    })
  })

  test.describe("when link has data-turbo-prefetch=false", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#turbo_prefetch_false_anchor" })
    })
  })

  test.describe("when link has data-turbo=false", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#turbo_false_anchor" })
    })
  })

  test.describe("when link has the same location as the current page", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#same_location_anchor" })
    })
  })

  test.describe("when link has a different origin", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#different_origin_anchor" })
    })
  })

  test.describe("when link has an hash as a href", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#anchor_with_hash" })
    })
  })

  test.describe("when link has a ftp protocol", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#anchor_with_ftp_protocol" })
    })
  })

  test.describe("when link is valid but it's inside an iframe", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#anchor_with_iframe_target" })
    })
  })

  test.describe("when link has a POST data-turbo-method", () => {
    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#anchor_with_post_method" })
    })
  })

  test.describe("when turbo-prefetch meta tag is set to false", () => {
    test.beforeEach(async ({ page }) => {
      await goTo({ page, path: "/hover_to_prefetch_disabled.html" })
    })

    test("it doesn't prefetch the page", async ({ page }) => {
      await assertNotPrefetchedOnMouseover({ page, selector: "#prefetch_anchor" })
    })
  })
})

test.describe("when clicking on a link that has been prefetched", () => {
  test.beforeEach(async ({ page }) => {
    await goTo({ page, path: "/hover_to_prefetch.html" })
    await hoverSelector({ page, selector: "#prefetch_anchor" })
  })

  test("it does not make a network request", async ({ page }) => {
    await assertNotPrefetchedOnMouseover({ page, selector: "#prefetch_anchor" })
  })

  test("it follows the link using the cached response", async ({ page }) => {
    await clickSelector({ page, selector: "#prefetch_anchor" })

    assert.equal(await page.title(), "Prefetched Page")
  })
})

const assertPrefetchedOnMouseover = async ({ page, selector }) => {
  let requestMade = false

  page.on("request", (request) => (requestMade = true))

  await hoverSelector({ page, selector })

  assert.equal(requestMade, true, "Network request wasn't made when it should have been.")
}

const assertNotPrefetchedOnMouseover = async ({ page, selector }) => {
  let requestMade = false

  page.on("request", (request) => (requestMade = true))

  await hoverSelector({ page, selector })

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
