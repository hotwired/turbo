import { assert } from "@open-wc/testing"
import { nextEventLoopTick } from "../../util"
import { FetchMethod, FetchRequest } from "../../http/fetch_request"

let container, target, originalFetch, adopted, consumer, started, delivered, finished, errors, responseReceived

setup(() => {
  container = document.createElement("div")
  target = document.createElement("a")
  container.append(target)
  document.body.append(container)
  responseReceived = new Promise(resolve => {
    target.addEventListener("turbo:before-fetch-response", event => resolve(event.detail.fetchResponse), { once: true })
  })
  originalFetch = window.fetch
  delivered = []
  finished = []
  errors = []
  const delegate = {
    prepareRequest() {},
    requestStarted(request) {
      started?.(request)
    },
    requestSucceededWithResponse(request, response) {
      delivered.push({ request, response })
    },
    requestFailedWithResponse() {},
    requestPreventedHandlingResponse() {},
    requestErrored(request, error) {
      errors.push(error)
    },
    requestFinished(request) {
      finished.push(request)
    }
  }
  started = null
  adopted = new FetchRequest(delegate, FetchMethod.get, new URL("/adopted", document.baseURI), new URLSearchParams(), target)
  consumer = new FetchRequest(delegate, FetchMethod.get, adopted.url, new URLSearchParams(), target)
  container.addEventListener("turbo:before-fetch-request", event => {
    if (event.detail.url.pathname === "/adopted") event.detail.fetchRequest = adopted
  })
})

teardown(() => {
  window.fetch = originalFetch
  container.remove()
})

test("canceling a consumer cancels its adopted in-flight request", async () => {
  const response = pendingResponse()
  started = () => consumer.cancel()
  const performed = consumer.perform()
  response.resolve(new Response("Stale"))
  await performed

  assert.isTrue(adopted.abortSignal.aborted)
  assert.lengthOf(delivered, 0)
  assert.deepEqual(finished, [consumer])
  assert.lengthOf(errors, 0)
})

test("an already canceled consumer cancels the request it adopts", async () => {
  adopted.response = Promise.resolve(new Response("Stale"))
  let requestStarted = false
  started = () => requestStarted = true
  consumer.cancel()
  await consumer.perform()

  assert.isFalse(requestStarted)
  assert.isTrue(adopted.abortSignal.aborted)
  assert.lengthOf(delivered, 0)
  assert.deepEqual(finished, [consumer])
})

test("resuming a canceled request finishes cleanup without starting it", async () => {
  const request = new FetchRequest(consumer.delegate, FetchMethod.get, new URL("/paused", document.baseURI), new URLSearchParams(), target)
  let resume, requestStarted = false
  started = () => requestStarted = true
  const intercepted = new Promise(resolve => {
    target.addEventListener("turbo:before-fetch-request", event => {
      event.preventDefault()
      resume = event.detail.resume
      resolve()
    }, { once: true })
  })
  window.fetch = () => Promise.reject(new DOMException("Aborted", "AbortError"))
  const performed = request.perform()
  await intercepted

  request.cancel()
  resume()
  await performed

  assert.isFalse(requestStarted)
  assert.deepEqual(finished, [request])
  assert.lengthOf(errors, 0)
})

test("an adopted response resolving after cancellation is not delivered even if fetch ignores abort", async () => {
  const response = pendingResponse()
  let requestStarted
  const ready = new Promise(resolve => { requestStarted = resolve })
  started = requestStarted
  const performed = consumer.perform()
  await ready
  consumer.cancel()
  response.resolve(new Response("Stale"))
  await performed

  assert.lengthOf(delivered, 0)
  assert.isTrue(adopted.abortSignal.aborted)
  assert.deepEqual(finished, [consumer])
})

test("canceling an adopted response after headers aborts pending body consumption", async () => {
  const response = new Response("", { headers: { "Content-Type": "text/html" } })
  response.clone = () => ({
    text: () => new Promise((_resolve, reject) => {
      adopted.abortSignal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"))
      }, { once: true })
    })
  })
  adopted.response = Promise.resolve(response)
  const performed = consumer.perform()
  await responseReceived
  consumer.cancel()
  await performed

  assert.isTrue(adopted.abortSignal.aborted)
  assert.lengthOf(delivered, 0)
  assert.lengthOf(errors, 0)
  assert.deepEqual(finished, [consumer])
})

test("canceling an unrelated request does not cancel an adopted request", async () => {
  adopted.response = Promise.resolve(new Response("Current"))
  await consumer.perform()
  const unrelated = new FetchRequest(consumer.delegate, FetchMethod.get, new URL("/other", document.baseURI))
  unrelated.cancel()

  assert.isFalse(adopted.abortSignal.aborted)
  assert.lengthOf(delivered, 1)
})

test("an adopted request error is reported to the delegate", async () => {
  const error = new TypeError("Network failed")
  adopted.response = Promise.reject(error)
  const result = await consumer.perform()

  assert.isUndefined(result)
  assert.deepEqual(errors, [error])
  assert.deepEqual(finished, [consumer])
})

test("ordinary requests retain their own cancellation and response lifecycle", async () => {
  const request = new FetchRequest(consumer.delegate, FetchMethod.get, new URL("/ordinary", document.baseURI), new URLSearchParams(), target)
  let networkSignal
  window.fetch = (url, options) => {
    networkSignal = options.signal
    return Promise.resolve(new Response("Ordinary"))
  }
  const response = await request.perform()
  request.cancel()

  assert.isTrue(networkSignal.aborted)
  assert.isFalse(adopted.abortSignal.aborted)
  assert.equal(await response.responseText, "Ordinary")
  assert.deepEqual(finished, [request])
})

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

test("finishes after the HTML body loads, before asynchronous response handling", async () => {
  let controller
  const body = new ReadableStream({ start(value) { controller = value } })
  adopted.response = Promise.resolve(new Response(body, { headers: { "Content-Type": "text/html" } }))
  consumer.delegate.requestSucceededWithResponse = async (request, response) => {
    const html = await response.responseHTML
    delivered.push({ html, finished: finished.includes(request) })
  }
  const performed = consumer.perform()
  await responseReceived
  controller.enqueue(new TextEncoder().encode("<h1>Hello"))
  await nextEventLoopTick()

  assert.lengthOf(delivered, 0)
  assert.lengthOf(finished, 0)

  controller.enqueue(new TextEncoder().encode(", world!</h1>"))
  controller.close()
  await performed

  assert.deepEqual(finished, [consumer])
  assert.deepEqual(delivered, [{ html: "<h1>Hello, world!</h1>", finished: true }])
})

test("keeps HTML available when an interceptor consumes the native response", async () => {
  const html = "<h1>Hello, world!</h1>"
  adopted.response = Promise.resolve(new Response(html, { headers: { "Content-Type": "text/html" } }))
  let nativeBody
  target.addEventListener("turbo:before-fetch-response", event => {
    event.preventDefault()
    nativeBody = event.detail.fetchResponse.response.text()
  }, { once: true })

  const response = await consumer.perform()

  assert.equal(await nativeBody, html)
  assert.equal(await response.responseHTML, html)
  assert.lengthOf(delivered, 0)
  assert.deepEqual(finished, [consumer])
})

for (const consumed of [false, true]) {
  test(`reports ${consumed ? "an already consumed" : "an interrupted"} response body before finishing`, async () => {
    const response = new Response("", { headers: { "Content-Type": "text/html" } })
    if (consumed) {
      await response.text()
    } else {
      response.clone = () => ({ text: () => Promise.reject(new TypeError("Body interrupted")) })
    }
    adopted.response = Promise.resolve(response)
    const performed = consumer.perform()

    await responseReceived
    assert.isUndefined(await performed)
    assert.lengthOf(delivered, 0)
    assert.lengthOf(errors, 1)
    assert.instanceOf(errors[0], TypeError)
    assert.deepEqual(finished, [consumer])
  })
}

function requestFor(method, body = new URLSearchParams()) {
  return new FetchRequest({}, method, new URL("http://example.test/submit?existing=1&filter=old"), body)
}

function pendingResponse() {
  let resolve, reject
  adopted.response = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { resolve, reject }
}
