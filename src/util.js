/**
 * Activates a script element, potentially modifying it based on its "data-turbo-eval" attribute and other settings.
 *
 * If the "data-turbo-eval" attribute is set to "false", the function returns the element unmodified.
 * Otherwise, it creates a new script element, copies the original element's attributes and content to it, and sets
 * additional attributes such as "async" and potentially a "nonce" based on the content of a "csp-nonce" meta tag.
 *
 * @param {HTMLElement} element - The script element to activate.
 * @returns {HTMLElement} The activated script element, which may be a new element or the original element, depending on its attributes.
 */
export function activateScriptElement(element) {
  if (element.getAttribute("data-turbo-eval") == "false") {
    return element
  } else {
    const createdScriptElement = document.createElement("script")
    const cspNonce = getMetaContent("csp-nonce")
    if (cspNonce) {
      createdScriptElement.nonce = cspNonce
    }
    createdScriptElement.textContent = element.textContent
    createdScriptElement.async = false
    copyElementAttributes(createdScriptElement, element)
    return createdScriptElement
  }
}

/**
 * Copies all attributes from the source element to the destination element.
 *
 * @param {HTMLElement} destinationElement - The element to which attributes should be copied.
 * @param {HTMLElement} sourceElement - The element from which attributes should be copied.
 */
function copyElementAttributes(destinationElement, sourceElement) {
  for (const { name, value } of sourceElement.attributes) {
    destinationElement.setAttribute(name, value)
  }
}

/**
 * Creates a document fragment from a string of HTML.
 *
 * @param {string} html - The HTML string to convert into a document fragment.
 * @returns {DocumentFragment} A document fragment containing the nodes represented by the HTML string.
 */
export function createDocumentFragment(html) {
  const template = document.createElement("template")
  template.innerHTML = html
  return template.content
}

/**
 * Dispatches a custom event with the specified name and options.
 *
 * @param {string} eventName - The name of the custom event to dispatch.
 * @param {object} [options={}] - An object containing the options for the event.
 * @param {HTMLElement} [options.target] - The target for the event. If not specified or the target is not connected, the event will be dispatched on the document.documentElement.
 * @param {boolean} [options.cancelable] - Whether the event is cancelable.
 * @param {*} [options.detail] - Any details to pass along with the event.
 * @returns {CustomEvent} The custom event that was dispatched.
 */
export function dispatch(eventName, { target, cancelable, detail } = {}) {
  const event = new CustomEvent(eventName, {
    cancelable,
    bubbles: true,
    composed: true,
    detail,
  })

  if (target && target.isConnected) {
    target.dispatchEvent(event)
  } else {
    document.documentElement.dispatchEvent(event)
  }

  return event
}

/**
 * Returns a promise that resolves on the next animation frame.
 *
 * @returns {Promise<void>} A promise that resolves on the next animation frame.
 */
export function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

/**
 * Returns a promise that resolves on the next event loop tick.
 *
 * @returns {Promise<void>} A promise that resolves on the next event loop tick.
 */
export function nextEventLoopTick() {
  return new Promise((resolve) => setTimeout(() => resolve(), 0))
}

/**
 * Returns a promise that resolves on the next microtask.
 *
 * @returns {Promise<void>} A promise that resolves on the next microtask.
 */
export function nextMicrotask() {
  return Promise.resolve()
}

/**
 * Parses an HTML string into a DOM Document.
 *
 * @param {string} [html=""] - The HTML string to parse.
 * @returns {Document} A DOM Document representing the parsed HTML string.
 */
export function parseHTMLDocument(html = "") {
  return new DOMParser().parseFromString(html, "text/html")
}

/**
 * Removes the common leading whitespace from every line in a template literal string.
 *
 * @param {TemplateStringsArray} strings - An array of strings from the template literal.
 * @param {...*} values - The values to interpolate into the template literal.
 * @returns {string} The unindented template literal string.
 */
export function unindent(strings, ...values) {
  const lines = interpolate(strings, values).replace(/^\n/, "").split("\n")
  const match = lines[0].match(/^\s+/)
  const indent = match ? match[0].length : 0
  return lines.map((line) => line.slice(indent)).join("\n")
}

/**
 * Interpolates the values into the template literal strings.
 *
 * @param {TemplateStringsArray} strings - An array of strings from the template literal.
 * @param {Array} values - The values to interpolate into the template literal.
 * @returns {string} The interpolated template literal string.
 */
function interpolate(strings, values) {
  return strings.reduce((result, string, i) => {
    const value = values[i] == undefined ? "" : values[i]
    return result + string + value
  }, "")
}

/**
 * Generates a random UUID (Universally Unique Identifier) according to the UUID v4 specification.
 *
 * @returns {string} A random UUID.
 */
export function uuid() {
  return Array.from({ length: 36 })
    .map((_, i) => {
      if (i == 8 || i == 13 || i == 18 || i == 23) {
        return "-"
      } else if (i == 14) {
        return "4"
      } else if (i == 19) {
        return (Math.floor(Math.random() * 4) + 8).toString(16)
      } else {
        return Math.floor(Math.random() * 15).toString(16)
      }
    })
    .join("")
}

/**
 * Gets the value of the specified attribute from the first element in the list of elements that has the attribute set.
 *
 * @param {string} attributeName - The name of the attribute to get.
 * @param {...HTMLElement} elements - The elements to search for the attribute.
 * @returns {string|null} The value of the attribute from the first element that has it set, or null if none of the elements have the attribute set.
 */
export function getAttribute(attributeName, ...elements) {
  for (const value of elements.map((element) => element?.getAttribute(attributeName))) {
    if (typeof value == "string") return value
  }

  return null
}

/**
 * Checks if any of the specified elements has the specified attribute set.
 *
 * @param {string} attributeName - The name of the attribute to check for.
 * @param {...HTMLElement} elements - The elements to check for the attribute.
 * @returns {boolean} True if any of the elements has the attribute set, false otherwise.
 */
export function hasAttribute(attributeName, ...elements) {
  return elements.some((element) => element && element.hasAttribute(attributeName))
}

/**
 * Marks the specified elements as "busy" by setting the `busy` attribute (for elements with local name "turbo-frame")
 * and the `aria-busy` attribute (for all elements) to true.
 *
 * @param {...HTMLElement} elements - The elements to mark as "busy".
 */
export function markAsBusy(...elements) {
  for (const element of elements) {
    if (element.localName == "turbo-frame") {
      element.setAttribute("busy", "")
    }
    element.setAttribute("aria-busy", "true")
  }
}

/**
 * Clears the "busy" state of the specified elements by removing the `busy`
 * and `aria-busy` attributes.
 *
 * @param {...HTMLElement} elements - The elements to clear the "busy" state from.
 */
export function clearBusyState(...elements) {
  for (const element of elements) {
    if (element.localName == "turbo-frame") {
      element.removeAttribute("busy")
    }

    element.removeAttribute("aria-busy")
  }
}

/**
 * Waits for the specified element to load or an error to occur, up to the specified timeout.
 *
 * @param {HTMLElement} element - The element to wait for.
 * @param {number} timeoutInMilliseconds - The maximum time to wait, in milliseconds.
 * @returns {Promise<void>} A promise that resolves when the element has loaded, an error occurs, or the timeout is reached.
 */
export function waitForLoad(element, timeoutInMilliseconds = 2000) {
  return new Promise((resolve) => {
    const onComplete = () => {
      element.removeEventListener("error", onComplete)
      element.removeEventListener("load", onComplete)
      resolve()
    }

    element.addEventListener("load", onComplete, { once: true })
    element.addEventListener("error", onComplete, { once: true })
    setTimeout(resolve, timeoutInMilliseconds)
  })
}

/**
 * Gets the appropriate history method for the specified action.
 *
 * @param {"replace"|"advance"|"restore"} action - The action to get the history method for.
 * @returns {("replaceState"|"pushState")|undefined} The history method for the action, or undefined if the action is not recognized.
 */
export function getHistoryMethodForAction(action) {
  switch (action) {
    case "replace":
      return history.replaceState
    case "advance":
    case "restore":
      return history.pushState
  }
}

/**
 * Checks if the specified action is a valid action.
 *
 * @param {string} action - The action to check.
 * @returns {boolean} True if the action is a valid action, false otherwise.
 */
export function isAction(action) {
  return action == "advance" || action == "replace" || action == "restore"
}

/**
 * Gets the visit action from the `data-turbo-action` attribute of the first element in the list that has the attribute set.
 *
 * @param {...HTMLElement} elements - The elements to get the visit action from.
 * @returns {string|null} The visit action, or null if none of the elements has the `data-turbo-action` attribute set.
 */
export function getVisitAction(...elements) {
  const action = getAttribute("data-turbo-action", ...elements)

  return isAction(action) ? action : null
}

/**
 * Gets the meta element with the specified name.
 *
 * @param {string} name - The name of the meta element to get.
 * @returns {HTMLMetaElement|null} The meta element, or null if no meta element with the specified name is found.
 */
export function getMetaElement(name) {
  return document.querySelector(`meta[name="${name}"]`)
}

/**
 * Gets the content of the meta element with the specified name.
 *
 * @param {string} name - The name of the meta element to get the content from.
 * @returns {string|null} The content of the meta element, or null if no meta element with the specified name is found.
 */
export function getMetaContent(name) {
  const element = getMetaElement(name)
  return element && element.content
}

/**
 * Sets the content of the meta element with the specified name, creating the element if necessary.
 *
 * @param {string} name - The name of the meta element to set the content for.
 * @param {string} content - The content to set.
 * @returns {HTMLMetaElement} The meta element with the content set.
 */
export function setMetaContent(name, content) {
  let element = getMetaElement(name)

  if (!element) {
    element = document.createElement("meta")
    element.setAttribute("name", name)

    document.head.appendChild(element)
  }

  element.setAttribute("content", content)

  return element
}

/**
 * Finds the closest ancestor of the specified element that matches the specified selector, including ancestors in shadow DOM trees.
 *
 * @param {HTMLElement} element - The element to start searching from.
 * @param {string} selector - The selector to match against.
 * @returns {HTMLElement|null} The closest matching ancestor, or null if no matching ancestor is found.
 */
export function findClosestRecursively(element, selector) {
  if (element instanceof Element) {
    return (
      element.closest(selector) || findClosestRecursively(element.assignedSlot || element.getRootNode()?.host, selector)
    )
  }
}
