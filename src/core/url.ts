export type Locatable = URL | string

export function expandURL(pathOrUrl: string | URL): URL {
  const anchor = document.createElement("a")
  anchor.href = pathOrUrl.toString()

  return new URL(anchor.href)
}

export function getAnchor(url: URL): string {
  let anchorMatch
  if (url.hash) {
    return url.hash.slice(1)
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

export function isPrefixedBy(url: URL, prefix: URL): boolean {
  const prefixURL = getPrefixURL(prefix)
  return url.href === expandURL(prefixURL).href || url.href.startsWith(prefixURL)
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

function getPrefixURL(url: URL) {
  return addTrailingSlash(url.origin + url.pathname)
}

function addTrailingSlash(url: string) {
  return url.endsWith("/") ? url : url + "/"
}
