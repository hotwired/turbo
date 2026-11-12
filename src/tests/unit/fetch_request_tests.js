import { assert } from "@open-wc/testing"
import { FetchRequest, FetchMethod } from "../../http/fetch_request"

test("mutating an empty POST body and its URL keeps them independent", () => {
  const request = requestFor(FetchMethod.post)
  const originalURL = request.url.href

  request.body.append("message", "event-only")
  assert.equal(request.url.href, originalURL)
  const body = request.body.toString()
  request.url.searchParams.append("url-only", "value")
  assert.equal(request.body.toString(), body)
  assert.equal(request.body.get("message"), "event-only")
})

test("POST form data remains in the body without replacing the URL query", () => {
  const request = requestFor(FetchMethod.post, new URLSearchParams({ message: "form-value" }))

  assert.equal(request.url.search, "?existing=1&filter=old")
  assert.equal(request.body.toString(), "message=form-value")
  request.body.append("another", "value")
  assert.equal(request.url.search, "?existing=1&filter=old")
})

test("a GET request without form data preserves its URL query", () => {
  const request = requestFor(FetchMethod.get)

  assert.equal(request.url.search, "?existing=1&filter=old")
  assert.isNull(request.fetchOptions.body)
})

test("GET form data replaces the URL query and preserves repeated fields", () => {
  const request = requestFor(FetchMethod.get, new URLSearchParams([
    ["filter", "new"], ["tag", "one"], ["tag", "two"]
  ]))

  assert.equal(request.url.search, "?filter=new&tag=one&tag=two")
  assert.isNull(request.fetchOptions.body)
})

function requestFor(method, body = new URLSearchParams()) {
  return new FetchRequest({}, method, new URL("http://example.test/submit?existing=1&filter=old"), body)
}
