import { assert } from "@open-wc/testing"
import { StreamObserver } from "../../observers/stream_observer"
import { nextMicrotask } from "../../util"

let observer, messages

setup(() => {
  messages = []
  observer = new StreamObserver({
    receivedMessageFromStream: (message) => messages.push(message)
  })
  observer.start()
})

teardown(() => {
  observer.stop()
})

test("waits for the request to finish before rendering a response", async () => {
  let finishRequest
  const requestFinished = new Promise((resolve) => (finishRequest = resolve))
  const receivingResponse = observer.receiveMessageResponse({
    responseHTML: Promise.resolve("<div></div>"),
    requestFinished
  })

  await nextMicrotask()
  assert.deepEqual(messages, [])

  finishRequest()
  await receivingResponse
  assert.lengthOf(messages, 1)
})

test("does not render a response whose body fails to load", async () => {
  await observer.receiveMessageResponse({
    responseHTML: Promise.reject(new Error("response body failed")),
    requestFinished: Promise.resolve()
  })

  assert.deepEqual(messages, [])
})

test("propagates stream rendering errors", async () => {
  const error = new Error("stream rendering failed")
  observer.delegate.receivedMessageFromStream = () => {
    throw error
  }
  let thrownError

  await observer.receiveMessageResponse({
    responseHTML: Promise.resolve("<div></div>")
  }).catch((error) => (thrownError = error))

  assert.strictEqual(thrownError, error)
})
