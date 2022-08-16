import { JSHandle, Locator, Page } from "@playwright/test"

type EventLog = [string, any, string | null]
type MutationLog = [string, string | null, string | null]

export function attributeForSelector(page: Page, selector: string, attributeName: string): Promise<string | null> {
  return page.locator(selector).getAttribute(attributeName)
}

export function clickWithoutScrolling(page: Page, selector: string, options = {}) {
  const element = page.locator(selector, options)

  return element.evaluate((element) => element instanceof HTMLElement && element.click())
}

export function clearLocalStorage(page: Page): Promise<void> {
  return page.evaluate(() => localStorage.clear())
}

export function disposeAll(...handles: JSHandle[]): Promise<void[]> {
  return Promise.all(handles.map((handle) => handle.dispose()))
}

export function getFromLocalStorage(page: Page, key: string) {
  return page.evaluate((storageKey: string) => localStorage.getItem(storageKey), key)
}

export function getSearchParam(url: string, key: string): string | null {
  return searchParams(url).get(key)
}

export function hash(url: string): string {
  const { hash } = new URL(url)

  return hash
}

export async function hasSelector(page: Page, selector: string): Promise<boolean> {
  return !!(await page.locator(selector).count())
}

export function innerHTMLForSelector(page: Page, selector: string): Promise<string> {
  return page.locator(selector).innerHTML()
}

export async function isScrolledToSelector(page: Page, selector: string): Promise<boolean> {
  const boundingBox = await page
    .locator(selector)
    .evaluate((element) => (element instanceof HTMLElement ? { x: element.offsetLeft, y: element.offsetTop } : null))

  if (boundingBox) {
    const { y: pageY } = await scrollPosition(page)
    const { y: elementY } = boundingBox
    const offset = pageY - elementY
    return Math.abs(offset) < 2
  } else {
    return false
  }
}

export function nextBeat() {
  return sleep(100)
}

export function nextBody(_page: Page, timeout = 500) {
  return sleep(timeout)
}

export async function nextEventNamed(page: Page, eventName: string): Promise<any> {
  let record: EventLog | undefined
  while (!record) {
    const records = await readEventLogs(page, 1)
    record = records.find(([name]) => name == eventName)
  }
  return record[1]
}

export async function nextEventOnTarget(page: Page, elementId: string, eventName: string): Promise<any> {
  let record: EventLog | undefined
  while (!record) {
    const records = await readEventLogs(page, 1)
    record = records.find(([name, _, id]) => name == eventName && id == elementId)
  }
  return record[1]
}

export async function nextAttributeMutationNamed(
  page: Page,
  elementId: string,
  attributeName: string
): Promise<string | null> {
  let record: MutationLog | undefined
  while (!record) {
    const records = await readMutationLogs(page, 1)
    record = records.find(([name, id]) => name == attributeName && id == elementId)
  }
  const attributeValue = record[2]
  return attributeValue
}

export async function noNextAttributeMutationNamed(
  page: Page,
  elementId: string,
  attributeName: string
): Promise<boolean> {
  const records = await readMutationLogs(page, 1)
  return !records.some(([name]) => name == attributeName)
}

export async function noNextEventNamed(page: Page, eventName: string): Promise<boolean> {
  const records = await readEventLogs(page, 1)
  return !records.some(([name]) => name == eventName)
}

export async function noNextEventOnTarget(page: Page, elementId: string, eventName: string): Promise<boolean> {
  const records = await readEventLogs(page, 1)
  return !records.some(([name, _, target]) => name == eventName && target == elementId)
}

export async function outerHTMLForSelector(page: Page, selector: string): Promise<string> {
  const element = await page.locator(selector)
  return element.evaluate((element) => element.outerHTML)
}

export function pathname(url: string): string {
  const { pathname } = new URL(url)

  return pathname
}

export function propertyForSelector(page: Page, selector: string, propertyName: string): Promise<any> {
  return page.locator(selector).evaluate((element, propertyName) => (element as any)[propertyName], propertyName)
}

async function readArray<T>(page: Page, identifier: string, length?: number): Promise<T[]> {
  return page.evaluate(
    ({ identifier, length }) => {
      const records = (window as any)[identifier]
      if (records != null && typeof records.splice == "function") {
        return records.splice(0, typeof length === "undefined" ? records.length : length)
      } else {
        return []
      }
    },
    { identifier, length }
  )
}

export function readEventLogs(page: Page, length?: number): Promise<EventLog[]> {
  return readArray<EventLog>(page, "eventLogs", length)
}

export function readMutationLogs(page: Page, length?: number): Promise<MutationLog[]> {
  return readArray<MutationLog>(page, "mutationLogs", length)
}

export function search(url: string): string {
  const { search } = new URL(url)

  return search
}

export function searchParams(url: string): URLSearchParams {
  const { searchParams } = new URL(url)

  return searchParams
}

export function selectorHasFocus(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((element) => element === document.activeElement)
}

export function setLocalStorageFromEvent(page: Page, eventName: string, storageKey: string, storageValue: string) {
  return page.evaluate(
    ({ eventName, storageKey, storageValue }) => {
      addEventListener(eventName, () => localStorage.setItem(storageKey, storageValue))
    },
    { eventName, storageKey, storageValue }
  )
}

export function scrollPosition(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
}

export async function isScrolledToTop(page: Page): Promise<boolean> {
  const { y: pageY } = await scrollPosition(page)
  return pageY === 0
}

export function scrollToSelector(page: Page, selector: string): Promise<void> {
  return page.locator(selector).scrollIntoViewIfNeeded()
}

export function sleep(timeout = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(undefined), timeout))
}

export async function strictElementEquals(left: Locator, right: Locator): Promise<boolean> {
  return left.evaluate((left, right) => left === right, await right.elementHandle())
}

export function textContent(page: Page, html: string): Promise<string | null> {
  return page.evaluate((html) => {
    const parser = new DOMParser()
    const { documentElement } = parser.parseFromString(html, "text/html")

    return documentElement.textContent
  }, html)
}

export function visitAction(page: Page): Promise<string> {
  return page.evaluate(() => {
    try {
      return window.Turbo.navigator.currentVisit!.action
    } catch (error) {
      return "load"
    }
  })
}

export function waitForPathname(page: Page, pathname: string): Promise<void> {
  return page.waitForURL((url) => url.pathname == pathname)
}

export function waitUntilSelector(page: Page, selector: string, state: "visible" | "attached" = "visible") {
  return page.waitForSelector(selector, { state })
}

export function waitUntilNoSelector(page: Page, selector: string, state: "hidden" | "detached" = "hidden") {
  return page.waitForSelector(selector, { state })
}

export async function willChangeBody(page: Page, callback: () => Promise<void>): Promise<boolean> {
  const handles: JSHandle[] = []

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
