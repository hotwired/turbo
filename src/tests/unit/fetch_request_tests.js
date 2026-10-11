import { assert } from "@open-wc/testing"
import { FetchMethod, FetchRequest } from "../../http/fetch_request"

let container, target, originalFetch, adopted, consumer, started, delivered, finished, errors

setup(() => {
  container = document.createElement("div")
  target = document.createElement("a")
  container.append(target)
  document.body.append(container)
  originalFetch = window.fetch
  delivered = []
  finished = []
  errors = []
  const delegate = {
    prepareRequest() {},
    requestStarted(request) { started?.(request) },
    requestSucceededWithResponse(request, response) { delivered.push({ request, response }) },
    requestFailedWithResponse() {},
    requestPreventedHandlingResponse() {},
    requestErrored(request, error) { errors.push(error) },
    requestFinished(request) { finished.push(request) }
  }
  started = null
  adopted = new FetchRequest(delegate, FetchMethod.get, new URL("/adopted", document.baseURI), new URLSearchParams(), target)
  consumer = new FetchRequest(delegate, FetchMethod.get, adopted.url, new URLSearchParams(), target)
  container.addEventListener("turbo:before-fetch-request", event => {
    if (event.detail.url.pathname === "/adopted") event.detail.fetchRequest = adopted
  })
})

// eslint-disable-next-line no-undef
teardown(() => {
  window.fetch = originalFetch
  container.remove()
})

function pendingResponse() {
  let resolve, reject
  adopted.response = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { resolve, reject }
}

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
  consumer.cancel()
  await consumer.perform()

  assert.isTrue(adopted.abortSignal.aborted)
  assert.lengthOf(delivered, 0)
  assert.deepEqual(finished, [consumer])
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
  const body = new ReadableStream({
    start(controller) {
      adopted.abortSignal.addEventListener("abort", () => {
        controller.error(new DOMException("Aborted", "AbortError"))
      }, { once: true })
    }
  })
  adopted.response = Promise.resolve(new Response(body, { headers: { "Content-Type": "text/html" } }))
  await consumer.perform()
  assert.lengthOf(delivered, 1)
  const text = delivered[0].response.responseHTML.catch(error => error)
  consumer.cancel()

  assert.isTrue(adopted.abortSignal.aborted)
  assert.equal((await text).name, "AbortError")
})

test("canceling an unrelated request does not cancel an adopted request", async () => {
  adopted.response = Promise.resolve(new Response("Current"))
  await consumer.perform()
  const unrelated = new FetchRequest(consumer.delegate, FetchMethod.get, new URL("/other", document.baseURI))
  unrelated.cancel()

  assert.isFalse(adopted.abortSignal.aborted)
  assert.lengthOf(delivered, 1)
})

test("an adopted request error is still reported and rethrown", async () => {
  const error = new TypeError("Network failed")
  adopted.response = Promise.reject(error)
  const result = await consumer.perform().catch(caught => caught)

  assert.strictEqual(result, error)
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
