import { InternTestCase } from "./intern_test_case"
import { Element } from "@theintern/leadfoot"

export class FunctionalTestCase extends InternTestCase {
  get remote() {
    return this.internTest.remote
  }

  async goToLocation(location: string): Promise<void> {
    const processedLocation = location.match(/^\//) ? location.slice(1) : location
    return this.remote.get(processedLocation)
  }

  async goBack(): Promise<void> {
    return this.remote.goBack()
  }

  async goForward(): Promise<void> {
    return this.remote.goForward()
  }

  async reload(): Promise<void> {
    await this.evaluate(() => location.reload())
    return this.nextBeat
  }

  async hasSelector(selector: string) {
    return (await this.remote.findAllByCssSelector(selector)).length > 0
  }

  async querySelector(selector: string) {
    return this.remote.findByCssSelector(selector)
  }

  async querySelectorAll(selector: string) {
    return this.remote.findAllByCssSelector(selector)
  }

  async clickSelector(selector: string): Promise<void> {
    return this.remote.findByCssSelector(selector).click()
  }

  async scrollToSelector(selector: string): Promise<void> {
    const element = await this.remote.findByCssSelector(selector)
    return this.evaluate(element => element.scrollIntoView(), element)
  }

  async outerHTMLForSelector(selector: string): Promise<string> {
    const element = await this.remote.findByCssSelector(selector)
    return this.evaluate(element => element.outerHTML, element)
  }

  async innerHTMLForSelector(selector: string): Promise<string> {
    const element = await this.remote.findAllByCssSelector(selector)
    return this.evaluate(element => element.innerHTML, element)
  }

  async attributeForSelector(selector: string, attributeName: string) {
    const element = await this.querySelector(selector)

    return await element.getAttribute(attributeName)
  }

  async propertyForSelector(selector: string, attributeName: string) {
    const element = await this.querySelector(selector)

    return await element.getProperty(attributeName)
  }

  get scrollPosition(): Promise<{ x: number, y: number }> {
    return this.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
  }

  async isScrolledToSelector(selector: string): Promise<boolean> {
    const { y: pageY } = await this.scrollPosition
    const { y: elementY } = await this.remote.findByCssSelector(selector).getPosition()
    const offset = pageY - elementY
    return Math.abs(offset) < 2
  }

  get nextBeat(): Promise<void> {
    return this.sleep(100)
  }

  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async evaluate<T>(callback: (...args: any[]) => T, ...args: any[]): Promise<T> {
    return await this.remote.execute(callback, args)
  }

  get head(): Promise<Element> {
    return this.evaluate(() => document.head as any)
  }

  get body(): Promise<Element> {
    return this.evaluate(() => document.body as any)
  }

  get location(): Promise<string> {
    return this.evaluate(() => location.toString())
  }

  get origin(): Promise<string> {
    return this.evaluate(() => location.origin.toString())
  }

  get pathname(): Promise<string> {
    return this.evaluate(() => location.pathname)
  }

  get search(): Promise<string> {
    return this.evaluate(() => location.search)
  }

  get searchParams(): Promise<URLSearchParams> {
    return this.evaluate(() => location.search).then(search => new URLSearchParams(search))
  }

  async getSearchParam(key: string): Promise<string> {
    return (await this.searchParams).get(key) || ""
  }

  async getAllSearchParams(key: string): Promise<string[]> {
    return (await this.searchParams).getAll(key) || []
  }

  get hash(): Promise<string> {
    return this.evaluate(() => location.hash)
  }

  async acceptAlert(): Promise<void> {
    return this.remote.acceptAlert()
  }

  async dismissAlert(): Promise<void> {
    return this.remote.dismissAlert()
  }

  async getAlertText(): Promise<string> {
    return this.remote.getAlertText()
  }
}
