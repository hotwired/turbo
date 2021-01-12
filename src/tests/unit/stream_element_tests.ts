import { StreamElement } from "../../elements"
import { nextAnimationFrame } from "../../util"
import { DOMTestCase } from "../helpers/dom_test_case"

export class StreamElementTests extends DOMTestCase {
  async beforeTest() {
    this.fixtureHTML = `<div id="hello">Hello Turbo</div>`
  }

  async "test action=append"() {
    const element = createStreamElement("append", "hello", createTemplateElement(" Streams"))
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo Streams")
    this.assert.isNull(element.parentElement)
  }

  async "test action=prepend"() {
    const element = createStreamElement("prepend", "hello", createTemplateElement("Streams "))
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, "Streams Hello Turbo")
    this.assert.isNull(element.parentElement)
  }

  async "test action=remove"() {
    const element = createStreamElement("remove", "hello")
    this.assert.ok(this.find("#hello"))

    this.append(element)
    await nextAnimationFrame()

    this.assert.notOk(this.find("#hello"))
    this.assert.isNull(element.parentElement)
  }

  async "test action=replace"() {
    const element = createStreamElement("replace", "hello", createTemplateElement(`<h1 id="hello">Hello Turbo</h1>`))
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")
    this.assert.ok(this.find("div#hello"))

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")
    this.assert.notOk(this.find("div#hello"))
    this.assert.ok(this.find("h1#hello"))
    this.assert.isNull(element.parentElement)
  }

  async "test action=update"() {
    const element = createStreamElement("update", "hello", createTemplateElement("Goodbye Turbo"))
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, "Goodbye Turbo")
    this.assert.isNull(element.parentElement)
  }
}

function createStreamElement(action: string | null, target: string | null, templateElement?: HTMLTemplateElement) {
  const element = new StreamElement()
  if (action) element.setAttribute("action", action)
  if (target) element.setAttribute("target", target)
  if (templateElement) element.appendChild(templateElement)
  return element
}

function createTemplateElement(html: string) {
  const element = document.createElement("template")
  element.innerHTML = html
  return element
}

StreamElementTests.registerSuite()
