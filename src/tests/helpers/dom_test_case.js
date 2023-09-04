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

  append(node: Node) {
    this.fixtureElement.appendChild(node)
  }

  find(selector: string) {
    return this.fixtureElement.querySelector(selector)
  }

  get fixtureHTML() {
    return this.fixtureElement.innerHTML
  }

  set fixtureHTML(html: string) {
    this.fixtureElement.innerHTML = html
  }
}
