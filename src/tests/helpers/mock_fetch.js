const nativeFetch = window.fetch

async function mockFetch(url, options) {
  return await mockFetch._mockResponse || nativeFetch(url, options)
}
mockFetch.mockResponse = function(response) {
  this._mockResponse = response
}

class MockFetchResponse {
  constructor({ url, ok, headers, status, redirected, data }) {
    this.url = url
    this.ok = ok || true
    this.headers = headers || new Headers({
      "Content-Type": "text/html"
    })
    this.status = status || 200
    this.redirected = redirected || false
    this.data = data || (() => "Hello, world!")
  }

  async text() {
    await Promise.resolve()
    return this.data()
  }

  clone() {
    return new MockFetchResponse(this)
  }
}

window.fetch = mockFetch

export { mockFetch as fetch, MockFetchResponse }
