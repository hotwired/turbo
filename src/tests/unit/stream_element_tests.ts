import { StreamElement } from "../../elements"
import { nextAnimationFrame } from "../../util"
import { DOMTestCase } from "../helpers/dom_test_case"

export class StreamElementTests extends DOMTestCase {
  async beforeTest() {
    this.fixtureHTML = `<div><div id="hello">Hello Turbo</div></div>`
  }

  async "test action=append"() {
    const element = createStreamElement("append", "hello", createTemplateElement("<span> Streams</span>"))
    const element2 = createStreamElement("append", "hello", createTemplateElement("<span> and more</span>"))
    
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo Streams")
    this.assert.isNull(element.parentElement)

    this.append(element2)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo Streams and more")
    this.assert.isNull(element2.parentElement)
  }

  async "test action=append with children ID already present in target"() {
    const element = createStreamElement("append", "hello", createTemplateElement(' <div id="child_1">First</div> tail1 '))
    const element2 = createStreamElement("append", "hello", createTemplateElement('<div id="child_1">New First</div> <div id="child_2">Second</div> tail2 '))
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, 'Hello Turbo First tail1 ')
    this.assert.isNull(element.parentElement)

    this.append(element2)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, 'Hello Turbo  tail1 New First Second tail2 ')
  }

  async "test action=prepend"() {
    const element = createStreamElement("prepend", "hello", createTemplateElement("<span>Streams </span>"))
    const element2 = createStreamElement("prepend", "hello", createTemplateElement("<span>and more </span>"))
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, "Streams Hello Turbo")
    this.assert.isNull(element.parentElement)

    this.append(element2)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, "and more Streams Hello Turbo")
    this.assert.isNull(element.parentElement)
  }

  async "test action=prepend with children ID already present in target"() {
    const element = createStreamElement("prepend", "hello", createTemplateElement('<div id="child_1">First</div> tail1 '))
    const element2 = createStreamElement("prepend", "hello", createTemplateElement('<div id="child_1">New First</div> <div id="child_2">Second</div> tail2 '))
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, 'First tail1 Hello Turbo')
    this.assert.isNull(element.parentElement)

    this.append(element2)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.textContent, 'New First Second tail2  tail1 Hello Turbo')
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

  async "test action=after"() {
    const element = createStreamElement("after", "hello", createTemplateElement(`<h1 id="after">After Turbo</h1>`))
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.nextSibling?.textContent, "After Turbo")
    this.assert.ok(this.find("div#hello"))
    this.assert.ok(this.find("h1#after"))
    this.assert.isNull(element.parentElement)
  }

  async "test action=before"() {
    const element = createStreamElement("before", "hello", createTemplateElement(`<h1 id="before">Before Turbo</h1>`))
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.previousSibling?.textContent, "Before Turbo")
    this.assert.ok(this.find("div#hello"))
    this.assert.ok(this.find("h1#before"))
    this.assert.isNull(element.parentElement)
  }

  async "test action=update-attribute"() {
    const element = createStreamElement("update-attribute", "hello", createTemplateElement("true"), "data-updated-value")
    this.assert.equal(this.find("#hello")?.textContent, "Hello Turbo")

    this.append(element)
    await nextAnimationFrame()

    this.assert.equal(this.find("#hello")?.getAttribute("data-updated-value"), "true")
  }
}

function createStreamElement(action: string | null, target: string | null, templateElement?: HTMLTemplateElement, attribute?: string | null) {
  const element = new StreamElement()
  if (action) element.setAttribute("action", action)
  if (target) element.setAttribute("target", target)
  if (attribute) element.setAttribute("attribute", attribute)
  if (templateElement) element.appendChild(templateElement)
  return element
}

function createTemplateElement(html: string) {
  const element = document.createElement("template")
  element.innerHTML = html
  return element
}

StreamElementTests.registerSuite()
