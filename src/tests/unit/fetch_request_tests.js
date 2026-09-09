import { assert } from "@open-wc/testing"
import { fetch, MockFetchResponse } from "../helpers/mock_fetch"
import { FetchRequest } from "../../http/fetch_request"

// A mock for the FetchRequest delegate that records the order of method calls
class LoggingFetchRequestDelegate {
  constructor(log) {
    [
      "prepareRequest",
      "requestStarted",
      "requestSucceededWithResponse",
      "requestFailedWithResponse",
      "requestPreventedHandlingResponse",
      "requestErrored",
      "requestFinished"
    ].forEach(method => {
      this[method] = (request, ...args) => {
        log.push(method)
      }
    })
  }
}

let eventLog, delegate, request

setup(() => {
  eventLog = []
  delegate = new LoggingFetchRequestDelegate(eventLog)
  request = new FetchRequest(delegate, "GET", new URL("http://example.com"))
})

test("fetch response body is recieved before the FetchRequest declares it is finished", async () => {
  fetch.mockResponse(new MockFetchResponse({
    data: () => {
      eventLog.push("recieveData")
      return "Hello, world!"
    }
  }))

  await request.perform()

  assert.deepEqual(eventLog, [
    "prepareRequest",
    "requestStarted",
    "recieveData",
    "requestSucceededWithResponse",
    "requestFinished"
  ])
})

teardown(() => {
  fetch.mockResponse(null)
})
