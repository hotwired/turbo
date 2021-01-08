export type Locatable = URL | string

export function expandPath(pathOrUrl: string | URL): URL {
  const anchor = document.createElement("a") as HTMLAnchorElement
  anchor.href = pathOrUrl.toString()

  return new URL(anchor.href)
}

export function anchor(url: URL): string {
  const anchorLength = url.hash.length
  if (anchorLength < 2) {
    return ""
  } else {
    return url.hash.slice(1)
  }
}

export function getExtension(location: URL) {
  return (getLastPathComponent(location).match(/\.[^.]*$/) || [])[0] || ""
}

export function isHTML(location: URL) {
  return !!getExtension(location).match(/^(?:|\.(?:htm|html|xhtml))$/)
}

export function isPrefixedBy(location: URL, prefix: URL): boolean {
  const prefixURL = getPrefixURL(prefix)
  return location === expandPath(prefixURL) || stringStartsWith(location.href, prefixURL)
}

export function toCacheKey(url: URL) {
  return requestURL(url)
}

function getPathComponents(location: URL) {
  return location.pathname.split("/").slice(1)
}

function getLastPathComponent(location: URL) {
  return getPathComponents(location).slice(-1)[0]
}

function requestURL(url: URL): string {
  const anchorLength = url.hash.length
  if (anchorLength < 2) {
    return url.href
  } else {
    return url.href.slice(0, -anchorLength)
  }
}

function getPrefixURL(location: URL) {
  return addTrailingSlash(location.origin + location.pathname)
}

function addTrailingSlash(url: string) {
  return stringEndsWith(url, "/") ? url : url + "/"
}

function stringStartsWith(string: string, prefix: string) {
  return string.slice(0, prefix.length) === prefix
}

function stringEndsWith(string: string, suffix: string) {
  return string.slice(-suffix.length) === suffix
}
