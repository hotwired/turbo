export type Locatable = URL | string

export function expandURL(locatable: Locatable) {
  const anchor = document.createElement("a")
  anchor.href = locatable.toString()
  return new URL(anchor.href)
}

export function getAnchor(url: URL) {
  let anchorMatch
  if (url.hash) {
    return url.hash.slice(1)
  } else if (anchorMatch = url.href.match(/#(.*)$/)) {
    return anchorMatch[1]
  }
}

export function getExtension(url: URL) {
  return (getLastPathComponent(url).match(/\.[^.]*$/) || [])[0] || ""
}

export function isHTML(url: URL) {
  return !!getExtension(url).match(/^(?:|\.(?:htm|html|xhtml))$/)
}

export function isPrefixedBy(baseURL: URL, url: URL) {
  const prefix = getPrefix(url)
  return baseURL.href === expandURL(prefix).href || baseURL.href.startsWith(prefix)
}

export function toCacheKey(url: URL) {
  const anchorLength = url.hash.length
  if (anchorLength < 2) {
    return url.href
  } else {
    return url.href.slice(0, -anchorLength)
  }
}

function getPathComponents(url: URL) {
  return url.pathname.split("/").slice(1)
}

function getLastPathComponent(url: URL) {
  return getPathComponents(url).slice(-1)[0]
}

function getPrefix(url: URL) {
  return addTrailingSlash(url.origin + url.pathname)
}

function addTrailingSlash(value: string) {
  return value.endsWith("/") ? value : value + "/"
}
