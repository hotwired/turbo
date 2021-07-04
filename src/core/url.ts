export type Locatable = URL | string

export function expandURL(locatable: Locatable) {
  return new URL(locatable.toString(), document.baseURI)
}

export function getAnchor(url: URL) {
  let anchorMatch
  if (url.hash) {
    return url.hash.slice(1)
  // eslint-disable-next-line no-cond-assign
  } else if (anchorMatch = url.href.match(/#(.*)$/)) {
    return anchorMatch[1]
  } else {
    return ""
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

export function urlsAreEqual(left: string, right: string) {
  return expandURL(left).href == expandURL(right).href
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
