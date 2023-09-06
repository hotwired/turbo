export class DOMTestCase {
  fixtureElement = document.createElement("main")

  async setup() {
    this.fixtureElement.hidden = true
    document.body.insertAdjacentElement("afterbegin", this.fixtureElement)
  }

  async teardown() {
    this.fixtureElement.innerHTML = ""
    this.fixtureElement.remove()
  }

  append(node) {
    this.fixtureElement.appendChild(node)
  }

  find(selector) {
    return this.fixtureElement.querySelector(selector)
  }

  get fixtureHTML() {
    return this.fixtureElement.innerHTML
  }

  set fixtureHTML(html) {
    this.fixtureElement.innerHTML = html
  }
}
