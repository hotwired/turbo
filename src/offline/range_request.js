/**
 * Builds a 206 Partial Content response from a cached response
 * when the request includes a Range header. This enables audio/video
 * streaming from the cache.
 *
 * @param {Request} request - The original request with Range header
 * @param {Response} response - The full cached response
 * @returns {Promise<Response>} - A 206 Partial Content response, or 416 on error
 */
export async function buildPartialResponse(request, response) {
  // If already a partial response, return as-is
  if (response.status === 206) {
    return response
  }

  const rangeHeader = request.headers.get("range")
  if (!rangeHeader) {
    return response
  }

  // Can't handle Range requests for opaque responses (cross-origin)
  // since we can't read their body
  if (response.type === "opaque" || response.type === "opaqueredirect") {
    return response
  }

  try {
    const { start, end } = parseRangeHeader(rangeHeader)
    const blob = await response.blob()
    const { effectiveStart, effectiveEnd } = calculateEffectiveBoundaries(blob, start, end)

    const slicedBlob = blob.slice(effectiveStart, effectiveEnd)
    const slicedSize = slicedBlob.size
    const totalSize = blob.size

    const partialResponse = new Response(slicedBlob, {
      status: 206,
      statusText: "Partial Content",
      headers: response.headers
    })

    partialResponse.headers.set("Content-Length", slicedSize)
    partialResponse.headers.set("Content-Range", `bytes ${effectiveStart}-${effectiveEnd - 1}/${totalSize}`)

    return partialResponse
  } catch (error) {
    console.warn("Range request error:", error.message)
    return new Response("", { status: 416, statusText: "Range Not Satisfiable" })
  }
}

function parseRangeHeader(rangeHeader) {
  const normalized = rangeHeader.trim().toLowerCase()

  if (!normalized.startsWith("bytes=")) {
    throw new Error("Range unit must be 'bytes'")
  }

  // Only support single ranges, not multiple (e.g., bytes=0-99,200-299)
  if (normalized.includes(",")) {
    throw new Error("Multiple ranges are not supported")
  }

  const rangeValue = normalized.slice(6) // Remove "bytes="
  const match = rangeValue.match(/^(\d*)-(\d*)$/)

  if (!match) {
    throw new Error("Invalid range format")
  }

  const [, startStr, endStr] = match
  const start = startStr ? parseInt(startStr, 10) : undefined
  const end = endStr ? parseInt(endStr, 10) : undefined

  if (start === undefined && end === undefined) {
    throw new Error("Invalid range: both start and end are missing")
  }

  return { start, end }
}

function calculateEffectiveBoundaries(blob, start, end) {
  const size = blob.size

  let effectiveStart
  let effectiveEnd

  if (start !== undefined && end !== undefined) {
    // bytes=100-200 (both specified)
    effectiveStart = start
    effectiveEnd = end + 1 // Range end is inclusive, slice end is exclusive
  } else if (start !== undefined) {
    // bytes=100- (from start to end of file)
    effectiveStart = start
    effectiveEnd = size
  } else {
    // bytes=-100 (last N bytes)
    effectiveStart = size - end
    effectiveEnd = size
  }

  // Validate boundaries
  if (effectiveStart < 0 || effectiveStart >= size || effectiveEnd > size) {
    throw new Error("Range not satisfiable")
  }

  return { effectiveStart, effectiveEnd }
}
