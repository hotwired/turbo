/**
 * Expands a locatable object to a full URL, resolving it relative to the document's base URI.
 *
 * @param {string | URL} locatable - The locatable object (a string or URL instance) to expand.
 * @returns {URL} - The expanded URL.
 */
export function expandURL(locatable) {
  return new URL(locatable.toString(), document.baseURI)
}

/**
 * Retrieves the anchor part from a URL.
 *
 * @param {URL} url - The URL from which to get the anchor part.
 * @returns {string} - The anchor part of the URL, or undefined if no anchor is found.
 */
export function getAnchor(url) {
  let anchorMatch
  if (url.hash) {
    return url.hash.slice(1)
    // eslint-disable-next-line no-cond-assign
  } else if ((anchorMatch = url.href.match(/#(.*)$/))) {
    return anchorMatch[1]
  }
}

/**
 * Retrieves the action URL from a form and an optional submitter element.
 *
 * @param {HTMLFormElement} form - The form element to get the action URL from.
 * @param {HTMLElement} [submitter] - The submitter element which initiated the form submission.
 * @returns {URL} - The action URL.
 */
export function getAction(form, submitter) {
  const action = submitter?.getAttribute("formaction") || form.getAttribute("action") || form.action

  return expandURL(action)
}

/**
 * Retrieves the extension part from a URL.
 *
 * @param {URL} url - The URL from which to get the extension part.
 * @returns {string} - The extension part of the URL, including the leading dot, or an empty string if no extension is found.
 */
export function getExtension(url) {
  return (getLastPathComponent(url).match(/\.[^.]*$/) || [])[0] || ""
}

/**
 * Determines if the URL points to an HTML document based on its extension.
 *
 * @param {URL} url - The URL to check.
 * @returns {boolean} - True if the URL points to an HTML document, false otherwise.
 */
export function isHTML(url) {
  return !!getExtension(url).match(/^(?:|\.(?:htm|html|xhtml|php))$/)
}

/**
 * Checks if a URL is prefixed by a base URL.
 *
 * @param {URL} baseURL - The base URL to check against.
 * @param {URL} url - The URL to check.
 * @returns {boolean} - True if the URL is prefixed by the base URL, false otherwise.
 */
export function isPrefixedBy(baseURL, url) {
  const prefix = getPrefix(url)
  return baseURL.href === expandURL(prefix).href || baseURL.href.startsWith(prefix)
}

/**
 * Determines if a location is visitable based on its prefix and whether it points to an HTML document.
 *
 * @param {URL} location - The location URL to check.
 * @param {URL} rootLocation - The root location URL to check against.
 * @returns {boolean} - True if the location is visitable, false otherwise.
 */
export function locationIsVisitable(location, rootLocation) {
  return isPrefixedBy(location, rootLocation) && isHTML(location)
}

/**
 * Retrieves the request URL from a URL by removing the anchor part.
 *
 * @param {URL} url - The URL to get the request URL from.
 * @returns {string} - The request URL.
 */
export function getRequestURL(url) {
  const anchor = getAnchor(url)
  return anchor != null ? url.href.slice(0, -(anchor.length + 1)) : url.href
}

/**
 * Converts a URL to a cache key by using the request URL part of the URL.
 *
 * @param {URL} url - The URL to convert to a cache key.
 * @returns {string} - The cache key.
 */
export function toCacheKey(url) {
  return getRequestURL(url)
}

/**
 * Checks if two URLs are equal by comparing their expanded href attributes.
 *
 * @param {URL|string} left - The first URL to compare.
 * @param {URL|string} right - The second URL to compare.
 * @returns {boolean} - True if the URLs are equal, false otherwise.
 */
export function urlsAreEqual(left, right) {
  return expandURL(left).href == expandURL(right).href
}

/**
 * Retrieves the path components of a URL.
 *
 * @param {URL} url - The URL to get the path components from.
 * @returns {string[]} - The path components of the URL.
 */
function getPathComponents(url) {
  return url.pathname.split("/").slice(1)
}

/**
 * Retrieves the last path component of a URL.
 *
 * @param {URL} url - The URL to get the last path component from.
 * @returns {string} - The last path component of the URL.
 */
function getLastPathComponent(url) {
  return getPathComponents(url).slice(-1)[0]
}

/**
 * Retrieves the prefix of a URL, which consists of the origin and the pathname.
 *
 * @param {URL} url - The URL to get the prefix from.
 * @returns {string} - The prefix of the URL.
 */
function getPrefix(url) {
  return addTrailingSlash(url.origin + url.pathname)
}

/**
 * Adds a trailing slash to a string if it doesn't already have one.
 *
 * @param {string} value - The string to add a trailing slash to.
 * @returns {string} - The string with a trailing slash.
 */
function addTrailingSlash(value) {
  return value.endsWith("/") ? value : value + "/"
}
