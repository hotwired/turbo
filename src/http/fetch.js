import { uuid } from "../util"

export function fetch(url, options = {}) {
  const modifiedHeaders = new Headers(options.headers || {})
  const requestUID = uuid()
  window.Turbo.session.recentRequests.add(requestUID)
  modifiedHeaders.append("X-Turbo-Request-Id", requestUID)

  return window.fetch(url, {
    ...options,
    headers: modifiedHeaders
  })
}
