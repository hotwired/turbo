import { assert } from "@open-wc/testing"
import { PageView } from "../../core/drive/page_view"
import { PageSnapshot } from "../../core/drive/page_snapshot"

for (const refreshMethod of ["replace", "morph"]) {
  test(`a ${refreshMethod} renderer passes its reload destination to the adapter without retaining it`, async () => {
    const { view, invalidations } = createView(refreshMethod)
    const snapshot = PageSnapshot.fromHTMLString(`
      <html>
        <head><meta name="assets" content="new" data-turbo-track="reload"></head>
        <body>Failed form response</body>
      </html>
    `)
    const location = new URL("/search?query=invalid", window.location.href)

    await view.renderPage(snapshot, false, true, undefined, location)
    await view.renderPage(snapshot)

    assert.lengthOf(invalidations, 2)
    assert.equal(invalidations[0].reason, "tracked_element_mismatch")
    assert.strictEqual(invalidations[0].context.location, location)
    assert.deepEqual(invalidations[1], { reason: "tracked_element_mismatch" })
  })
}

test("visit-control invalidation preserves its reason and passes the response destination to the adapter", async () => {
  const { view, invalidations } = createView()
  const snapshot = PageSnapshot.fromHTMLString(`
    <html>
      <head>
        <meta name="assets" content="old" data-turbo-track="reload">
        <meta name="turbo-visit-control" content="reload">
      </head>
      <body>Response requiring a native reload</body>
    </html>
  `)
  const location = new URL("/search?query=invalid#errors", window.location.href)

  await view.renderPage(snapshot, false, true, undefined, location)

  assert.lengthOf(invalidations, 1)
  assert.equal(invalidations[0].reason, "turbo_visit_control_is_reload")
  assert.strictEqual(invalidations[0].context.location, location)
})

function createView(refreshMethod = "replace") {
  const invalidations = []
  const adapter = { pageInvalidated: (reason) => invalidations.push(reason) }
  const pageDocument = new DOMParser().parseFromString(`
    <html>
      <head>
        <meta name="assets" content="old" data-turbo-track="reload">
        <meta name="turbo-refresh-method" content="${refreshMethod}">
      </head>
      <body>Original page</body>
    </html>
  `, "text/html")
  const view = new PageView({
    viewInvalidated: (reason) => adapter.pageInvalidated(reason)
  }, pageDocument.documentElement)

  return { view, invalidations }
}
