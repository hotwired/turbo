export const HISTORY_DATA_ATTRIBUTE = 'data-turbo-history'
export const HISTORY_URL_DATA_ATTRIBUTE = 'data-turbo-history-url'

export class NavigationElement {
  readonly element: Element
  url?: string

  constructor(element: Element, url?: string) {
    this.element = element
    this.url = url
  }

  get shouldUpdateHistory() {
    return this.hasHistoryDataAttribute || this.hasHistoryURLDataAttribute
  }

  get locationURL() {
    const url = this.hasHistoryURLDataAttribute ? this.historyURLDataAttribute : this.url
    if (!url) throw new Error('url is missing')
    return new URL(url, window.location.origin)
  }

  get method() {
    if (this.historyDataAttribute) {
      return this.historyDataAttribute
    } else {
      return "push"
    }
  }

  private get hasHistoryURLDataAttribute() {
    return this.element.hasAttribute(HISTORY_URL_DATA_ATTRIBUTE)
  }

  private get hasHistoryDataAttribute() {
    return this.element.hasAttribute(HISTORY_DATA_ATTRIBUTE)
  }

  private get historyURLDataAttribute() {
    return this.element.getAttribute(HISTORY_URL_DATA_ATTRIBUTE) || ""
  }

  private get historyDataAttribute() {
    return this.element.getAttribute(HISTORY_DATA_ATTRIBUTE)
  }
}
