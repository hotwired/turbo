import { assert } from "@open-wc/testing"
import { RecentRequestsTracker } from "../../core/drive/recent_requests_tracker"

test("markUrlAsRefreshed() marks URL as refreshed", () => {
  const tracker = new RecentRequestsTracker(10)

  tracker.markUrlAsRefreshed("request-1", "https://example.com/page1")

  assert.isTrue(tracker.hasRefreshedUrl("request-1", "https://example.com/page1"))
})

test("markUrlAsRefreshed() can track multiple URLs per request ID", () => {
  const tracker = new RecentRequestsTracker(10)

  tracker.markUrlAsRefreshed("request-1", "https://example.com/page1")
  tracker.markUrlAsRefreshed("request-1", "https://example.com/page2")

  assert.isTrue(tracker.hasRefreshedUrl("request-1", "https://example.com/page1"))
  assert.isTrue(tracker.hasRefreshedUrl("request-1", "https://example.com/page2"))
})

test("markUrlAsRefreshed() can track multiple request IDs for the same URL", () => {
  const tracker = new RecentRequestsTracker(10)

  tracker.markUrlAsRefreshed("request-1", "https://example.com/page1")
  tracker.markUrlAsRefreshed("request-2", "https://example.com/page1")

  assert.isTrue(tracker.hasRefreshedUrl("request-1", "https://example.com/page1"))
  assert.isTrue(tracker.hasRefreshedUrl("request-2", "https://example.com/page1"))
})

test("cleanup removes old entries for different request IDs", () => {
  const tracker = new RecentRequestsTracker(2)

  tracker.markUrlAsRefreshed("request-1", "https://example.com/page1")
  tracker.markUrlAsRefreshed("request-2", "https://example.com/page2")

  assert.isTrue(tracker.hasRefreshedUrl("request-1", "https://example.com/page1"))
  assert.isTrue(tracker.hasRefreshedUrl("request-2", "https://example.com/page2"))

  tracker.markUrlAsRefreshed("request-3", "https://example.com/page3")

  assert.isFalse(tracker.hasRefreshedUrl("request-1", "https://example.com/page1"))
  assert.isTrue(tracker.hasRefreshedUrl("request-2", "https://example.com/page2"))
  assert.isTrue(tracker.hasRefreshedUrl("request-3", "https://example.com/page3"))
})

test("cleanup removes old entries for the same request ID", () => {
  const tracker = new RecentRequestsTracker(2)

  tracker.markUrlAsRefreshed("request-1", "https://example.com/page1")
  tracker.markUrlAsRefreshed("request-1", "https://example.com/page2")

  assert.isTrue(tracker.hasRefreshedUrl("request-1", "https://example.com/page1"))
  assert.isTrue(tracker.hasRefreshedUrl("request-1", "https://example.com/page2"))

  tracker.markUrlAsRefreshed("request-1", "https://example.com/page3")

  assert.isFalse(tracker.hasRefreshedUrl("request-1", "https://example.com/page1"))
  assert.isTrue(tracker.hasRefreshedUrl("request-1", "https://example.com/page2"))
  assert.isTrue(tracker.hasRefreshedUrl("request-1", "https://example.com/page3"))
})

test("hasRefreshedUrl() returns false for non-existent request ID", () => {
  const tracker = new RecentRequestsTracker(10)

  assert.isFalse(tracker.hasRefreshedUrl("non-existent", "https://example.com/page1"))
})

test("hasRefreshedUrl() returns false for non-existent URL", () => {
  const tracker = new RecentRequestsTracker(10)

  tracker.markUrlAsRefreshed("request-1", "https://example.com/page1")

  assert.isFalse(tracker.hasRefreshedUrl("request-1", "https://example.com/different-page"))
})

test("addRequestId() adds the request ID without any URL", () => {
  const tracker = new RecentRequestsTracker(10)

  tracker.addRequestId("request-1")

  assert.isTrue(tracker.requestIds.has("request-1"))
})