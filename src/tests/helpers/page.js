export function attributeForSelector(page, selector, attributeName) {
  return page.locator(selector).getAttribute(attributeName)
}

export function cancelNextEvent(page, eventName) {
  return page.evaluate(
    (eventName) => addEventListener(eventName, (event) => event.preventDefault(), { once: true }),
    eventName
  )
}

export function clickWithoutScrolling(page, selector, options = {}) {
  const element = page.locator(selector, options)

  return element.evaluate((element) => element instanceof HTMLElement && element.click())
}

export function clearLocalStorage(page) {
  return page.evaluate(() => localStorage.clear())
}

export function disposeAll(...handles) {
  return Promise.all(handles.map((handle) => handle.dispose()))
}

export function getFromLocalStorage(page, key) {
  return page.evaluate((storageKey) => localStorage.getItem(storageKey), key)
}

export function getSearchParam(url, key) {
  return searchParams(url).get(key)
}

export function hash(url) {
  const { hash } = new URL(url)

  return hash
}

export async function hasSelector(page, selector) {
  return !!(await page.locator(selector).count())
}

export function innerHTMLForSelector(page, selector) {
  return page.locator(selector).innerHTML()
}

export async function isScrolledToSelector(page, selector) {
  const boundingBox = await page
    .locator(selector)
    .evaluate((element) => (element instanceof HTMLElement ? { x: element.offsetLeft, y: element.offsetTop } : null))

  if (boundingBox) {
    const { y: pageY } = await scrollPosition(page)
    const { y: elementY } = boundingBox
    const offset = pageY - elementY
    return Math.abs(offset) <= 2
  } else {
    return false
  }
}

export function nextBeat() {
  return sleep(100)
}

export function nextBody(_page, timeout = 500) {
  return sleep(timeout)
}

export async function nextEventNamed(page, eventName) {
  let record
  while (!record) {
    const records = await readEventLogs(page, 1)
    record = records.find(([name]) => name == eventName)
  }
  return record[1]
}

export async function nextEventOnTarget(page, elementId, eventName) {
  let record
  while (!record) {
    const records = await readEventLogs(page, 1)
    record = records.find(([name, _, id]) => name == eventName && id == elementId)
  }
  return record[1]
}

export async function listenForEventOnTarget(page, elementId, eventName) {
  return page.locator("#" + elementId).evaluate((element, eventName) => {
    const eventLogs = window.eventLogs

    element.addEventListener(eventName, ({ target, type }) => {
      if (target instanceof Element) {
        eventLogs.push([type, {}, target.id])
      }
    })
  }, eventName)
}

export async function nextBodyMutation(page) {
  let record
  while (!record) {
    [record] = await readBodyMutationLogs(page, 1)
  }
  return record[0]
}

export async function noNextBodyMutation(page) {
  const records = await readBodyMutationLogs(page, 1)
  return !records.some((record) => !!record)
}

export async function nextAttributeMutationNamed(page, elementId, attributeName) {
  let record
  while (!record) {
    const records = await readMutationLogs(page, 1)
    record = records.find(([name, id]) => name == attributeName && id == elementId)
  }
  const attributeValue = record[2]
  return attributeValue
}

export async function noNextAttributeMutationNamed(page, elementId, attributeName) {
  const records = await readMutationLogs(page, 1)
  return !records.some(([name, _, target]) => name == attributeName && target == elementId)
}

export async function noNextEventNamed(page, eventName) {
  const records = await readEventLogs(page, 1)
  return !records.some(([name]) => name == eventName)
}

export async function noNextEventOnTarget(page, elementId, eventName) {
  const records = await readEventLogs(page, 1)
  return !records.some(([name, _, target]) => name == eventName && target == elementId)
}

export async function outerHTMLForSelector(page, selector) {
  const element = await page.locator(selector)
  return element.evaluate((element) => element.outerHTML)
}

export function pathname(url) {
  const { pathname } = new URL(url)

  return pathname
}

export async function pathnameForIFrame(page, name) {
  const locator = await page.locator(`[name="${name}"]`)
  const location = await locator.evaluate((iframe) => iframe.contentWindow?.location)

  if (location) {
    return pathname(location.href)
  } else {
    return ""
  }
}

export function propertyForSelector(page, selector, propertyName) {
  return page.locator(selector).evaluate((element, propertyName) => element[propertyName], propertyName)
}

async function readArray(page, identifier, length) {
  return page.evaluate(
    ({ identifier, length }) => {
      const records = window[identifier]
      if (records != null && typeof records.splice == "function") {
        return records.splice(0, typeof length === "undefined" ? records.length : length)
      } else {
        return []
      }
    },
    { identifier, length }
  )
}

export function readBodyMutationLogs(page, length) {
  return readArray(page, "bodyMutationLogs", length)
}

export function readEventLogs(page, length) {
  return readArray(page, "eventLogs", length)
}

export function readMutationLogs(page, length) {
  return readArray(page, "mutationLogs", length)
}

export function search(url) {
  const { search } = new URL(url)

  return search
}

export function searchParams(url) {
  const { searchParams } = new URL(url)

  return searchParams
}

export function selectorHasFocus(page, selector) {
  return page.locator(selector).evaluate((element) => element === document.activeElement)
}

export function setLocalStorageFromEvent(page, eventName, storageKey, storageValue) {
  return page.evaluate(
    ({ eventName, storageKey, storageValue }) => {
      addEventListener(eventName, () => localStorage.setItem(storageKey, storageValue))
    },
    { eventName, storageKey, storageValue }
  )
}

export function scrollPosition(page) {
  return page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
}

export async function isScrolledToTop(page) {
  const { y: pageY } = await scrollPosition(page)
  return pageY === 0
}

export function scrollToSelector(page, selector) {
  return page.locator(selector).scrollIntoViewIfNeeded()
}

export function sleep(timeout = 0) {
  return new Promise((resolve) => setTimeout(() => resolve(undefined), timeout))
}

export async function strictElementEquals(left, right) {
  return left.evaluate((left, right) => left === right, await right.elementHandle())
}

export function textContent(page, html) {
  return page.evaluate((html) => {
    const parser = new DOMParser()
    const { documentElement } = parser.parseFromString(html, "text/html")

    return documentElement.textContent
  }, html)
}

export function visitAction(page) {
  return page.evaluate(() => {
    try {
      return window.Turbo.navigator.currentVisit.action
    } catch (error) {
      return "load"
    }
  })
}

export function waitForPathname(page, pathname) {
  return page.waitForURL((url) => url.pathname == pathname)
}

export function waitUntilText(page, text, state = "visible") {
  return page.waitForSelector(`text='${text}'`, { state })
}

export function waitUntilSelector(page, selector, state = "visible") {
  return page.waitForSelector(selector, { state })
}

export function waitUntilNoSelector(page, selector, state = "hidden") {
  return page.waitForSelector(selector, { state })
}

export async function willChangeBody(page, callback) {
  const handles = []

  try {
    const originalBody = await page.evaluateHandle(() => document.body)
    handles.push(originalBody)

    await callback()

    const latestBody = await page.evaluateHandle(() => document.body)
    handles.push(latestBody)

    return page.evaluate(({ originalBody, latestBody }) => originalBody !== latestBody, { originalBody, latestBody })
  } finally {
    disposeAll(...handles)
  }
}
