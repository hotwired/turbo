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
  const requestFinished = observer.requestFinished.bind(observer)
  observer.requestFinished = (fetchRequest) => {
    requestFinished(fetchRequest)
    const request = requests.find(request => request.options.signal === fetchRequest.abortSignal)
    request?.finish()
  }
  originalFetch = window.fetch
  window.fetch = (url, options) => new Promise((resolve, reject) => {
    let finish
    const finished = new Promise(resolve => { finish = resolve })
    const request = { url, options, resolve, finished, finish }
    requests.push(request)
    const abort = () => reject(new DOMException("Aborted", "AbortError"))
    if (options.signal.aborted) {
      abort()
    } else {
      options.signal.addEventListener("abort", abort)
    }
    nextFetch(request)
  })
})

teardown(() => {
  observer.stop()
  prefetchCache.clear()
  for (const request of requests) request.resolve(new Response("Prefetched"))
  window.fetch = originalFetch
  container.remove()
})

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

test("a prevented visit does not cancel a pending prefetch", async () => {
  const pending = await hover()
  const event = new CustomEvent("turbo:before-visit", {
    cancelable: true,
    detail: { url: new URL("/other", document.baseURI).href }
  })
  container.addEventListener("turbo:before-visit", event => event.preventDefault(), { once: true })
  container.dispatchEvent(event)

  assert.isTrue(event.defaultPrevented)
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
  await requests[0].finished
  const navigation = new FetchRequest(observer, FetchMethod.get, new URL(link.href), new URLSearchParams(), link)
  const response = await navigation.perform()

  assert.equal(await response.responseText, "Prefetched")
  assert.lengthOf(requests, 1)
  assert.isFalse(completed.abortSignal.aborted)
})


test("visiting another fragment keeps a pending prefetch for the same resource", async () => {
  link.hash = "first"
  const pending = await hover()
  const destination = new URL(link.href)
  destination.hash = "second"
  visit(destination.href)

  assert.isFalse(pending.abortSignal.aborted)
  assert.strictEqual(usePrefetch(link, FetchMethod.get, destination).fetchRequest, pending)
})

test("rehovering another fragment cancels the older request for the same resource", async () => {
  link.hash = "first"
  const obsolete = await hover()
  leave()
  link.hash = "second"
  const replacement = await hover()

  assert.isTrue(obsolete.abortSignal.aborted)
  assert.isFalse(replacement.abortSignal.aborted)
})

test("replacing a request URL preserves the cache key used to adopt it", async () => {
  const destination = new URL("/rewritten", document.baseURI)
  container.addEventListener("turbo:before-fetch-request", event => {
    event.detail.url = destination
  }, { once: true })
  const pending = await hover()
  visit(link.href)

  assert.equal(requests[0].url, destination.href)
  assert.isFalse(pending.abortSignal.aborted)
  assert.strictEqual(usePrefetch().fetchRequest, pending)
})

test("mutating a request URL tracks the same cache key as the prefetch cache", async () => {
  const destination = new URL("/rewritten", document.baseURI)
  container.addEventListener("turbo:before-fetch-request", event => {
    event.detail.url.pathname = destination.pathname
  }, { once: true })
  await hover()
  const pending = prefetchCache.get(destination)
  visit(destination.href)

  assert.equal(requests[0].url, destination.href)
  assert.isFalse(pending.abortSignal.aborted)
  assert.strictEqual(usePrefetch(link, FetchMethod.get, destination).fetchRequest, pending)
})

test("leaving before the delay does not leave an unstarted request tracked", () => {
  const pending = schedulePrefetch()
  leave()
  visit(new URL("/other", document.baseURI).href)

  assert.isFalse(pending.abortSignal.aborted)
  assert.lengthOf(requests, 0)
})

test("a paused cache does not leave an unstarted request tracked", () => {
  const submission = {}
  prefetchCache.pause(submission)
  try {
    const pending = schedulePrefetch()
    visit(new URL("/other", document.baseURI).href)

    assert.isFalse(pending.abortSignal.aborted)
    assert.lengthOf(requests, 0)
  } finally {
    prefetchCache.resume(submission)
  }
})

test("stopping aborts unadopted requests and removes their cached responses", async () => {
  const pending = await hover()
  observer.stop()

  assert.isTrue(pending.abortSignal.aborted)
  assert.isUndefined(prefetchCache.get(new URL(link.href)))
})

test("stopping does not abort a prefetch owned by a navigation", async () => {
  const adopted = await hover()
  assert.strictEqual(usePrefetch().fetchRequest, adopted)
  observer.stop()

  assert.isFalse(adopted.abortSignal.aborted)
})

test("resuming an intercepted request after restart does not affect a new prefetch", async () => {
  let resume
  const intercepted = new Promise(resolve => {
    container.addEventListener("turbo:before-fetch-request", event => {
      event.preventDefault()
      resume = event.detail.resume
      resolve()
    }, { once: true })
  })
  const obsolete = schedulePrefetch()
  await intercepted
  const requestFinished = observer.requestFinished.bind(observer)
  const obsoleteFinished = new Promise(resolve => {
    observer.requestFinished = request => {
      requestFinished(request)
      if (request === obsolete) resolve()
    }
  })
  observer.stop()
  observer.start()
  const replacement = await hover()
  resume()
  await obsoleteFinished

  assert.isTrue(obsolete.abortSignal.aborted)
  assert.isFalse(replacement.abortSignal.aborted)
  visit(new URL("/other", document.baseURI).href)
  assert.isTrue(replacement.abortSignal.aborted)
})

test("stopping cancels a scheduled prefetch before it starts", () => {
  const originalSetTimeout = window.setTimeout
  const originalClearTimeout = window.clearTimeout
  const timer = {}
  let canceled = false
  window.setTimeout = () => timer
  window.clearTimeout = timeout => {
    if (timeout === timer) canceled = true
  }
  try {
    schedulePrefetch()
    observer.stop()

    assert.isTrue(canceled)
    assert.lengthOf(requests, 0)
  } finally {
    window.setTimeout = originalSetTimeout
    window.clearTimeout = originalClearTimeout
  }
})

test("a completed prefetch remains reusable while its response body is pending", async () => {
  const completed = await hover()
  let bodyController
  const body = new ReadableStream({
    start(controller) {
      bodyController = controller
    }
  })
  requests[0].resolve(new Response(body, { headers: { "Content-Type": "text/html" } }))
  await requests[0].finished
  const navigation = new FetchRequest(observer, FetchMethod.get, new URL(link.href), new URLSearchParams(), link)
  const response = await navigation.perform()
  const text = response.responseHTML
  observer.stop()
  bodyController.enqueue(new TextEncoder().encode("Prefetched"))
  bodyController.close()

  assert.equal(await text, "Prefetched")
  assert.lengthOf(requests, 1)
  assert.isFalse(completed.abortSignal.aborted)
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

function visit(url) {
  container.dispatchEvent(new CustomEvent("turbo:visit", { detail: { url } }))
}

function schedulePrefetch() {
  const originalPutLater = prefetchCache.putLater
  let pending
  prefetchCache.putLater = function (url, request, ttl) {
    pending = request
    originalPutLater.call(this, url, request, ttl)
  }
  try {
    link.dispatchEvent(new MouseEvent("mouseenter"))
    return pending
  } finally {
    prefetchCache.putLater = originalPutLater
  }
}
