import { uuid } from "../util"

const originalFetch = window.fetch

window.fetch = async function(url, options = {}) {
  const modifiedHeaders = new Headers(options.headers || {})
  const requestUID = uuid()
  window.Turbo.session.recentRequests.add(requestUID)
  modifiedHeaders.append("X-Turbo-Request-Id", requestUID)

  return originalFetch(url, {
    ...options,
    headers: modifiedHeaders
  })
}
