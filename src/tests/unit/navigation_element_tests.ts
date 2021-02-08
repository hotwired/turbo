import { NavigationElement, HISTORY_DATA_ATTRIBUTE, HISTORY_URL_DATA_ATTRIBUTE } from "../../core/frames/navigation-element"
import { InternTestCase  } from "../helpers/intern_test_case"

export class NavigationElementTests extends InternTestCase {
  element!: Element;

  async beforeTest() {
    this.element = document.createElement('a')
  }

  async "test method() - returns the history data attribute value"() {
    this.element.setAttribute(HISTORY_DATA_ATTRIBUTE, "replace");
    const navigationElement = new NavigationElement(this.element)

    this.assert.equal(navigationElement.method, "replace")
  }

  async "test method() - history data attribute without value"() {
    this.element.setAttribute(HISTORY_DATA_ATTRIBUTE, "");
    const navigationElement = new NavigationElement(this.element)

    this.assert.equal(navigationElement.method, "push")
  }

  async "test method() - defaults to push"() {
    const navigationElement = new NavigationElement(this.element)

    this.assert.equal(navigationElement.method, "push")
  }

  async "test locationURL() - returns the history url data attribute value"() {
    this.element.setAttribute(HISTORY_URL_DATA_ATTRIBUTE, "/cool");
    const navigationElement = new NavigationElement(this.element)

    this.assert.instanceOf(navigationElement.locationURL, URL)
    this.assert.equal(navigationElement.locationURL.pathname, "/cool")
  }

  async "test locationURL() - falls back to the passed in url"() {
    const navigationElement = new NavigationElement(this.element, "http://www.rad.com/")

    this.assert.instanceOf(navigationElement.locationURL, URL)
    this.assert.equal(navigationElement.locationURL.href, "http://www.rad.com/")
  }

  async "test locationURL() - throws if no url"() {
    const navigationElement = new NavigationElement(this.element)

    try {
      navigationElement.locationURL
    } catch(e) {
      this.assert.instanceOf(e, Error)
      this.assert.equal(e.message, "url is missing")
    }
  }

  async "test shouldUpdateHistory() - true if there is a history data attribute"() {
    this.element.setAttribute(HISTORY_DATA_ATTRIBUTE, "");
    const navigationElement = new NavigationElement(this.element)

    this.assert.isTrue(navigationElement.shouldUpdateHistory)
  }

  async "test shouldUpdateHistory() - false if no history data attributes"() {
    const navigationElement = new NavigationElement(this.element)
    this.assert.isFalse(navigationElement.shouldUpdateHistory)
  }
}

NavigationElementTests.registerSuite()
