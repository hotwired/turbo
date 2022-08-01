export type Locatable = URL | string

export function expandURL(locatable: Locatable) {
  return new URL(locatable.toString(), document.baseURI)
}

export function getAnchor(url: URL) {
  let anchorMatch
  if (url.hash) {
    return url.hash.slice(1)
    // eslint-disable-next-line no-cond-assign
  } else if ((anchorMatch = url.href.match(/#(.*)$/))) {
    return anchorMatch[1]
  }
}

export function getAction(form: HTMLFormElement, submitter?: HTMLElement) {
  const action = submitter?.getAttribute("formaction") || form.getAttribute("action") || form.action

  return expandURL(action)
}

export function getExtension(url: URL) {
  return (getLastPathComponent(url).match(/\.[^.]*$/) || [])[0] || ""
}

export function isHTML(url: URL) {
  return !!getExtension(url).match(/^(?:|\.(?:htm|html|xhtml|php))$/)
}

export function isPrefixedBy(baseURL: URL, url: URL) {
  const prefix = getPrefix(url)
  return baseURL.href === expandURL(prefix).href || baseURL.href.startsWith(prefix)
}

export function locationIsVisitable(location: URL, rootLocation: URL) {
  return isPrefixedBy(location, rootLocation) && isHTML(location)
}

export function getRequestURL(url: URL) {
  const anchor = getAnchor(url)
  return anchor != null ? url.href.slice(0, -(anchor.length + 1)) : url.href
}

export function toCacheKey(url: URL) {
  return getRequestURL(url)
}

export function urlsAreEqual(left: string, right: string) {
  return expandURL(left).href == expandURL(right).href
}

export function getUrlHash(location: Location | URL = window.location): URLSearchParams {
  const url = new URL(location.href)
  url.search = location.hash.substring(1)

  return url.searchParams
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
