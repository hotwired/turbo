import { assert } from "@open-wc/testing"
import { buildPartialResponse } from "../../offline/range_request"

// Helper to create a request with a Range header
function createRangeRequest(url, range) {
  return new Request(url, { headers: { "Range": range } })
}

// Helper to create a response with content
function createResponse(content, options = {}) {
  return new Response(content, { status: 200, ...options })
}

// Basic Range request tests

test("buildPartialResponse returns 206 with correct headers for bytes=0-4", async () => {
  const body = "Hello, World!"
  const response = createResponse(body, { headers: { "Content-Type": "text/plain" } })
  const request = createRangeRequest("https://example.com/file.txt", "bytes=0-4")

  const partialResponse = await buildPartialResponse(request, response)

  assert.equal(partialResponse.status, 206)
  assert.equal(partialResponse.statusText, "Partial Content")
  assert.equal(partialResponse.headers.get("Content-Length"), "5")
  assert.equal(partialResponse.headers.get("Content-Range"), "bytes 0-4/13")

  const text = await partialResponse.text()
  assert.equal(text, "Hello")
})

test("buildPartialResponse handles middle range bytes=7-11", async () => {
  const body = "Hello, World!"
  const response = createResponse(body)
  const request = createRangeRequest("https://example.com/file.txt", "bytes=7-11")

  const partialResponse = await buildPartialResponse(request, response)

  assert.equal(partialResponse.status, 206)
  assert.equal(partialResponse.headers.get("Content-Range"), "bytes 7-11/13")

  const text = await partialResponse.text()
  assert.equal(text, "World")
})

// Suffix range tests (bytes=-N)

test("buildPartialResponse handles suffix range bytes=-5", async () => {
  const body = "Hello, World!"
  const response = createResponse(body)
  const request = createRangeRequest("https://example.com/file.txt", "bytes=-5")

  const partialResponse = await buildPartialResponse(request, response)

  assert.equal(partialResponse.status, 206)
  assert.equal(partialResponse.headers.get("Content-Range"), "bytes 8-12/13")

  const text = await partialResponse.text()
  assert.equal(text, "orld!")
})

test("buildPartialResponse handles suffix range bytes=-1", async () => {
  const body = "Hello, World!"
  const response = createResponse(body)
  const request = createRangeRequest("https://example.com/file.txt", "bytes=-1")

  const partialResponse = await buildPartialResponse(request, response)

  assert.equal(partialResponse.status, 206)

  const text = await partialResponse.text()
  assert.equal(text, "!")
})

// Open-ended range tests (bytes=N-)

test("buildPartialResponse handles open-ended range bytes=7-", async () => {
  const body = "Hello, World!"
  const response = createResponse(body)
  const request = createRangeRequest("https://example.com/file.txt", "bytes=7-")

  const partialResponse = await buildPartialResponse(request, response)

  assert.equal(partialResponse.status, 206)
  assert.equal(partialResponse.headers.get("Content-Range"), "bytes 7-12/13")

  const text = await partialResponse.text()
  assert.equal(text, "World!")
})

test("buildPartialResponse handles open-ended range bytes=0-", async () => {
  const body = "Hello"
  const response = createResponse(body)
  const request = createRangeRequest("https://example.com/file.txt", "bytes=0-")

  const partialResponse = await buildPartialResponse(request, response)

  assert.equal(partialResponse.status, 206)
  assert.equal(partialResponse.headers.get("Content-Range"), "bytes 0-4/5")

  const text = await partialResponse.text()
  assert.equal(text, "Hello")
})

// Edge cases and pass-through behavior

test("buildPartialResponse returns original response if already 206", async () => {
  const originalResponse = new Response("partial", { status: 206 })
  const request = createRangeRequest("https://example.com/file.txt", "bytes=0-4")

  const result = await buildPartialResponse(request, originalResponse)

  assert.equal(result, originalResponse)
})

test("buildPartialResponse returns original response if no Range header", async () => {
  const originalResponse = createResponse("full content")
  const request = new Request("https://example.com/file.txt")

  const result = await buildPartialResponse(request, originalResponse)

  assert.equal(result, originalResponse)
})

// Error cases - 416 Range Not Satisfiable

test("buildPartialResponse returns 416 for range beyond content size", async () => {
  const response = createResponse("short")
  const request = createRangeRequest("https://example.com/file.txt", "bytes=100-200")

  const result = await buildPartialResponse(request, response)

  assert.equal(result.status, 416)
  assert.equal(result.statusText, "Range Not Satisfiable")
})

test("buildPartialResponse returns 416 for start position at content size", async () => {
  const response = createResponse("Hello")
  const request = createRangeRequest("https://example.com/file.txt", "bytes=5-10")

  const result = await buildPartialResponse(request, response)

  assert.equal(result.status, 416)
})

test("buildPartialResponse returns 416 for non-bytes range unit", async () => {
  const response = createResponse("Hello, World!")
  const request = createRangeRequest("https://example.com/file.txt", "items=0-4")

  const result = await buildPartialResponse(request, response)

  assert.equal(result.status, 416)
})

test("buildPartialResponse returns 416 for multiple ranges", async () => {
  const response = createResponse("Hello, World!")
  const request = createRangeRequest("https://example.com/file.txt", "bytes=0-4,6-10")

  const result = await buildPartialResponse(request, response)

  assert.equal(result.status, 416)
})

test("buildPartialResponse returns 416 for invalid range format", async () => {
  const response = createResponse("Hello, World!")
  const request = createRangeRequest("https://example.com/file.txt", "bytes=abc-def")

  const result = await buildPartialResponse(request, response)

  assert.equal(result.status, 416)
})

// Header normalization

test("buildPartialResponse handles uppercase Range header", async () => {
  const body = "Hello, World!"
  const response = createResponse(body)
  const request = new Request("https://example.com/file.txt", {
    headers: { "Range": "BYTES=0-4" }
  })

  const partialResponse = await buildPartialResponse(request, response)

  assert.equal(partialResponse.status, 206)

  const text = await partialResponse.text()
  assert.equal(text, "Hello")
})

test("buildPartialResponse handles Range header with whitespace", async () => {
  const body = "Hello, World!"
  const response = createResponse(body)
  const request = new Request("https://example.com/file.txt", {
    headers: { "Range": "  bytes=0-4  " }
  })

  const partialResponse = await buildPartialResponse(request, response)

  assert.equal(partialResponse.status, 206)

  const text = await partialResponse.text()
  assert.equal(text, "Hello")
})
