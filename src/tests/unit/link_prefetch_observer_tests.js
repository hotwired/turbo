import { assert } from "@open-wc/testing"
import { LinkPrefetchObserver } from "../../observers/link_prefetch_observer"
import { FetchMethod, FetchRequest } from "../../http/fetch_request"
import { prefetchCache } from "../../core/drive/prefetch_cache"

let observer, container, link, originalFetch, nextFetch, requests

setup(() => {
  prefetchCache.clear()
  container = document.createElement("div")
  link = document.createElement("a")
  link.href = "/prefetch-ownership"
  container.append(link)
  document.body.append(container)
  observer = new LinkPrefetchObserver({ canPrefetchRequestToLocation: () => true }, container)
  observer.start()
  requests = []
  originalFetch = window.fetch
  window.fetch = (url, options) => new Promise((resolve, reject) => {
    const request = { url, options, resolve }
    requests.push(request)
    options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
    nextFetch(request)
  })
})

// eslint-disable-next-line no-undef
teardown(() => {
  observer.stop()
  prefetchCache.clear()
  for (const request of requests) request.resolve(new Response("Prefetched"))
  window.fetch = originalFetch
  container.remove()
})

async function hover(target = link) {
  const fetched = new Promise(resolve => { nextFetch = resolve })
  target.dispatchEvent(new MouseEvent("mouseenter"))
  await fetched
  return prefetchCache.get(new URL(target.href))
}

function leave(target = link) {
  target.dispatchEvent(new MouseEvent("mouseleave"))
}

function usePrefetch(target = link, method = FetchMethod.get, url = new URL(link.href)) {
  const request = new FetchRequest(observer, method, url, new URLSearchParams(), target)
  const detail = { url: request.url, fetchOptions: request.fetchOptions }
  target.dispatchEvent(new CustomEvent("turbo:before-fetch-request", { bubbles: true, detail }))
  return detail
}

function visit(url, fetchRequest) {
  container.dispatchEvent(new CustomEvent("turbo:before-visit", { detail: { url, fetchRequest } }))
}

test("rehovering does not cancel a prefetch adopted by a navigation", async () => {
  const adopted = await hover()
  visit(link.href)
  assert.strictEqual(usePrefetch().fetchRequest, adopted)
  leave()
  const replacement = await hover()

  assert.isFalse(adopted.abortSignal.aborted)
  assert.isFalse(replacement.abortSignal.aborted)
})

test("visiting another URL does not cancel an adopted prefetch", async () => {
  const adopted = await hover()
  assert.strictEqual(usePrefetch().fetchRequest, adopted)
  visit(new URL("/other", document.baseURI).href)

  assert.isFalse(adopted.abortSignal.aborted)
})

test("an aborted cached prefetch is not adopted", async () => {
  const aborted = await hover()
  aborted.cancel()

  assert.isUndefined(usePrefetch().fetchRequest)
  assert.isUndefined(prefetchCache.get(new URL(link.href)))
})

test("rehovering still cancels an unadopted request for the same URL", async () => {
  const obsolete = await hover()
  leave()
  const replacement = await hover()

  assert.isTrue(obsolete.abortSignal.aborted)
  assert.isFalse(replacement.abortSignal.aborted)
})

test("visiting another URL still cancels an unadopted prefetch", async () => {
  const obsolete = await hover()
  visit(new URL("/other", document.baseURI).href)

  assert.isTrue(obsolete.abortSignal.aborted)
})

test("visiting the same URL keeps its pending prefetch available for adoption", async () => {
  const pending = await hover()
  visit(link.href)

  assert.isFalse(pending.abortSignal.aborted)
  assert.strictEqual(usePrefetch().fetchRequest, pending)
})

test("a visit with a fetch request does not cancel other pending prefetches", async () => {
  const pending = await hover()
  visit(new URL("/other", document.baseURI).href, pending)

  assert.isFalse(pending.abortSignal.aborted)
})

test("finishing an older request does not untrack its replacement", async () => {
  const old = await hover()
  leave()
  const replacement = await hover()
  observer.requestFinished(old)
  visit(new URL("/other", document.baseURI).href)

  assert.isTrue(replacement.abortSignal.aborted)
})

test("finishing an adopted request does not untrack its replacement", async () => {
  const adopted = await hover()
  assert.strictEqual(usePrefetch().fetchRequest, adopted)
  leave()
  const replacement = await hover()
  observer.requestFinished(adopted)
  visit(new URL("/other", document.baseURI).href)

  assert.isFalse(adopted.abortSignal.aborted)
  assert.isTrue(replacement.abortSignal.aborted)
})

test("fragment aliases release the adopted request by identity", async () => {
  link.hash = "first"
  const adopted = await hover()
  const alias = new URL(link.href)
  alias.hash = "second"
  assert.strictEqual(usePrefetch(link, FetchMethod.get, alias).fetchRequest, adopted)
  leave()
  await hover()

  assert.isFalse(adopted.abortSignal.aborted)
})

test("a rewritten request URL does not leave the adopted request tracked", async () => {
  const adopted = await hover()
  adopted.url = new URL("/rewritten", document.baseURI)
  assert.strictEqual(usePrefetch().fetchRequest, adopted)
  leave()
  await hover()

  assert.isFalse(adopted.abortSignal.aborted)
})

test("finishing a request with a rewritten URL releases its original pending entry", async () => {
  const finished = await hover()
  finished.url = new URL("/rewritten", document.baseURI)
  observer.requestFinished(finished)
  visit(new URL("/other", document.baseURI).href)

  assert.isFalse(finished.abortSignal.aborted)
})

test("GET forms do not adopt or clear cached prefetches", async () => {
  const pending = await hover()
  const form = document.createElement("form")
  container.append(form)

  assert.isUndefined(usePrefetch(form).fetchRequest)
  assert.strictEqual(prefetchCache.get(new URL(link.href)), pending)
  assert.strictEqual(usePrefetch().fetchRequest, pending)
})

test("non-GET requests do not adopt or clear cached prefetches", async () => {
  const pending = await hover()

  assert.isUndefined(usePrefetch(link, FetchMethod.post).fetchRequest)
  assert.strictEqual(prefetchCache.get(new URL(link.href)), pending)
  assert.strictEqual(usePrefetch().fetchRequest, pending)
})

test("an expired cache entry falls back without releasing the pending request", async () => {
  const expired = await hover()
  prefetchCache.put(new URL(link.href), expired, -1)

  assert.isUndefined(usePrefetch().fetchRequest)
  visit(new URL("/other", document.baseURI).href)
  assert.isTrue(expired.abortSignal.aborted)
})

test("a cache miss falls back without releasing another pending request", async () => {
  const pending = await hover()

  assert.isUndefined(usePrefetch(link, FetchMethod.get, new URL("/missing", document.baseURI)).fetchRequest)
  visit(new URL("/other", document.baseURI).href)
  assert.isTrue(pending.abortSignal.aborted)
})

test("a completed non-aborted cached request can still supply a navigation response", async () => {
  const completed = await hover()
  requests[0].resolve(new Response("Prefetched"))
  await completed.response
  // Wait for the observer's completion callback without clearing the real cache.
  await new Promise(resolve => setTimeout(resolve, 0))
  const navigation = new FetchRequest(observer, FetchMethod.get, new URL(link.href), new URLSearchParams(), link)
  const response = await navigation.perform()

  assert.equal(await response.responseText, "Prefetched")
  assert.lengthOf(requests, 1)
  assert.isFalse(completed.abortSignal.aborted)
})
