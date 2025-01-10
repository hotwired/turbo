import { config } from "./config"

export function expandURL(locatable) {
  return new URL(locatable.toString(), document.baseURI)
}

export function getAnchor(url) {
  let anchorMatch
  if (url.hash) {
    return url.hash.slice(1)
    // eslint-disable-next-line no-cond-assign
  } else if ((anchorMatch = url.href.match(/#(.*)$/))) {
    return anchorMatch[1]
  }
}

export function getAction(form, submitter) {
  const action = submitter?.getAttribute("formaction") || form.getAttribute("action") || form.action

  return expandURL(action)
}

export function getExtension(url) {
  return (getLastPathComponent(url).match(/\.[^.]*$/) || [])[0] || ""
}

export function isPrefixedBy(baseURL, url) {
  const prefix = getPrefix(url) || "/"
  return baseURL.href === expandURL(prefix).href || baseURL.href.startsWith(prefix)
}

export function locationIsVisitable(location, rootLocation) {
  return isPrefixedBy(location, rootLocation) && !config.drive.unvisitableExtensions.has(getExtension(location))
}

export function getRequestURL(url) {
  const anchor = getAnchor(url)
  return anchor != null ? url.href.slice(0, -(anchor.length + 1)) : url.href
}

export function toCacheKey(url) {
  return getRequestURL(url)
}

export function urlsAreEqual(left, right) {
  return expandURL(left).href == expandURL(right).href
}

function getPathComponents(url) {
  return url.pathname.split("/").slice(1)
}

function getLastPathComponent(url) {
  return getPathComponents(url).slice(-1)[0]
}

function getPrefix(url) {
  url.origin + url.pathname
}
