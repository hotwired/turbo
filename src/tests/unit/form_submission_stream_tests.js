import { assert } from "@open-wc/testing"
import { FormSubmission } from "../../core/drive/form_submission"
import { FetchResponse } from "../../http/fetch_response"

test("a successful unsafe Stream response notifies the delegate after setting the submission result", () => {
  const calls = []
  const submission = createSubmission("post", {
    formSubmissionSucceededWithStreamResponse(submission, response) {
      calls.push({ submission, response, result: submission.result })
    }
  })
  const response = createResponse(200, "text/vnd.turbo-stream.html; charset=utf-8")

  submission.requestPreventedHandlingResponse(submission.fetchRequest, response)

  assert.lengthOf(calls, 1)
  assert.strictEqual(calls[0].submission, submission)
  assert.strictEqual(calls[0].response, response)
  assert.strictEqual(calls[0].result, submission.result)
  assert.deepEqual(calls[0].result, { success: true, fetchResponse: response })
})

for (const { name, method, status, contentType } of [
  { name: "a successful GET Stream response", method: "get", status: 200, contentType: "text/vnd.turbo-stream.html" },
  { name: "a client-error Stream response", method: "post", status: 422, contentType: "text/vnd.turbo-stream.html" },
  { name: "a server-error Stream response", method: "post", status: 500, contentType: "text/vnd.turbo-stream.html" },
  { name: "an intercepted successful HTML response", method: "post", status: 200, contentType: "text/html; charset=utf-8" }
]) {
  test(`${name} preserves its result without notifying the Stream success delegate`, () => {
    const calls = []
    const submission = createSubmission(method, {
      formSubmissionSucceededWithStreamResponse(...args) {
        calls.push(args)
      }
    })
    const response = createResponse(status, contentType)

    submission.requestPreventedHandlingResponse(submission.fetchRequest, response)

    assert.lengthOf(calls, 0)
    assert.deepEqual(submission.result, { success: response.succeeded, fetchResponse: response })
  })
}

test("a successful unsafe Stream response supports delegates without the optional callback", () => {
  const submission = createSubmission("post", {})
  const response = createResponse(200, "text/vnd.turbo-stream.html; charset=utf-8")

  assert.doesNotThrow(() => submission.requestPreventedHandlingResponse(submission.fetchRequest, response))
  assert.deepEqual(submission.result, { success: true, fetchResponse: response })
})

function createSubmission(method, delegate) {
  const form = document.createElement("form")
  form.setAttribute("method", method)
  form.setAttribute("action", "/submit")
  return new FormSubmission(delegate, form)
}

function createResponse(status, contentType) {
  return new FetchResponse(new Response("", { status, headers: { "Content-Type": contentType } }))
}
