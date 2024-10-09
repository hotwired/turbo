import { StreamElement } from "../../elements"
import { nextAnimationFrame } from "../../util"
import { DOMTestCase } from "../helpers/dom_test_case"
import { assert } from "@open-wc/testing"
import { sleep } from "../helpers/page"
import * as Turbo from "../../index"

function createStreamElement(action, target, templateElement, attributes = {}) {
  const element = new StreamElement()
  if (action) element.setAttribute("action", action)
  if (target) element.setAttribute("target", target)
  if (templateElement) element.appendChild(templateElement)
  Object.entries(attributes).forEach((attribute) => element.setAttribute(...attribute))
  return element
}

function createTemplateElement(html) {
  const element = document.createElement("template")
  element.innerHTML = html
  return element
}

export class StreamElementTests extends DOMTestCase {}

let subject

setup(() => {
  subject = new StreamElementTests()
  subject.setup()
  subject.fixtureHTML = `<div><div id="hello">Hello Turbo</div></div>`
})

test("action=append", async () => {
  const element = createStreamElement("append", "hello", createTemplateElement("<span> Streams</span>"))
  const element2 = createStreamElement("append", "hello", createTemplateElement("<span> and more</span>"))

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo Streams")
  assert.isNull(element.parentElement)

  subject.append(element2)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo Streams and more")
  assert.isNull(element2.parentElement)
})

test("action=append with children ID already present in target", async () => {
  const element = createStreamElement("append", "hello", createTemplateElement(' <div id="child_1">First</div> tail1 '))
  const element2 = createStreamElement(
    "append",
    "hello",
    createTemplateElement('<div id="child_1">New First</div> <div id="child_2">Second</div> tail2 ')
  )
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo First tail1 ")
  assert.isNull(element.parentElement)

  subject.append(element2)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo  tail1 New First Second tail2 ")
})

test("action=prepend", async () => {
  const element = createStreamElement("prepend", "hello", createTemplateElement("<span>Streams </span>"))
  const element2 = createStreamElement("prepend", "hello", createTemplateElement("<span>and more </span>"))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Streams Hello Turbo")
  assert.isNull(element.parentElement)

  subject.append(element2)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "and more Streams Hello Turbo")
  assert.isNull(element.parentElement)
})

test("action=prepend with children ID already present in target", async () => {
  const element = createStreamElement("prepend", "hello", createTemplateElement('<div id="child_1">First</div> tail1 '))
  const element2 = createStreamElement(
    "prepend",
    "hello",
    createTemplateElement('<div id="child_1">New First</div> <div id="child_2">Second</div> tail2 ')
  )
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "First tail1 Hello Turbo")
  assert.isNull(element.parentElement)

  subject.append(element2)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "New First Second tail2  tail1 Hello Turbo")
})

test("action=remove", async () => {
  const element = createStreamElement("remove", "hello")
  assert.ok(subject.find("#hello"))

  subject.append(element)
  await nextAnimationFrame()

  assert.notOk(subject.find("#hello"))
  assert.isNull(element.parentElement)
})

test("action=replace", async () => {
  const element = createStreamElement("replace", "hello", createTemplateElement(`<h1 id="hello">Hello Turbo</h1>`))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.ok(subject.find("div#hello"))

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.notOk(subject.find("div#hello"))
  assert.ok(subject.find("h1#hello"))
  assert.isNull(element.parentElement)
})

test("action=replace with greater version", async () => {
  subject.fixtureHTML = `<div><div id="hello" data-turbo-version="1">Hello Turbo</div></div>`
  
  const element = createStreamElement("replace", "hello", createTemplateElement(`<h1 id="hello" data-turbo-version="2">Goodbye Turbo</h1>`), { version: "2" })
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.ok(subject.find("div#hello"))

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Goodbye Turbo")
  assert.notOk(subject.find("div#hello"))
  assert.ok(subject.find("h1#hello"))
  assert.isNull(element.parentElement)
})

test("action=replace with older version", async () => {
  subject.fixtureHTML = `<div><div id="hello" data-turbo-version="2">Hello Turbo</div></div>`

  const element = createStreamElement("replace", "hello", createTemplateElement(`<h1 id="hello" data-turbo-version="1">Goodbye Turbo</h1>`), { version: "1" })
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.ok(subject.find("div#hello"))

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.ok(subject.find("div#hello"))
})

test("action=replace with no version", async () => {
  subject.fixtureHTML = `<div><div id="hello" data-turbo-version="1">Hello Turbo</div></div>`

  const element = createStreamElement("replace", "hello", createTemplateElement(`<h1 id="hello">Goodbye Turbo</h1>`))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.ok(subject.find("div#hello"))

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.notOk(subject.find("h1#hello"))
  assert.isNull(element.parentElement)
})

test("action=replace with a version", async () => {
  const element = createStreamElement("replace", "hello", createTemplateElement(`<h1 id="hello" data-turbo-version="1">Goodbye Turbo</h1>`), { version: "1" })
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.ok(subject.find("div#hello"))

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Goodbye Turbo")
  assert.notOk(subject.find("div#hello"))
  assert.ok(subject.find("h1#hello"))
  assert.isNull(element.parentElement)
})

test("action=update", async () => {
  const element = createStreamElement("update", "hello", createTemplateElement("Goodbye Turbo"))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Goodbye Turbo")
  assert.isNull(element.parentElement)
})

test("action=update with greater version", async () => {
  subject.fixtureHTML = `<div><div id="hello" data-turbo-version="1">Hello Turbo</div></div>`

  const element = createStreamElement("update", "hello", createTemplateElement(`<h1 id="hello" data-turbo-version="2">Goodbye Turbo</h1>`), { version: "2" })
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Goodbye Turbo")
  assert.isNull(element.parentElement)
})

test("action=update with older version", async () => {
  subject.fixtureHTML = `<div><div id="hello" data-turbo-version="2">Hello Turbo</div></div>`

  const element = createStreamElement("update", "hello", createTemplateElement(`<h1 id="hello" data-turbo-version="1">Goodbye Turbo</h1>`), { version: "1" })
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.isNull(element.parentElement)
})

test("action=update with no version", async () => {
  subject.fixtureHTML = `<div><div id="hello" data-turbo-version="1">Hello Turbo</div></div>`

  const element = createStreamElement("update", "hello", createTemplateElement(`<h1 id="hello">Goodbye Turbo</h1>`))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.isNull(element.parentElement)
})

test("action=update with a version", async () => {
  const element = createStreamElement("update", "hello", createTemplateElement(`<h1 id="hello" data-turbo-version="1">Goodbye Turbo</h1>`), { version: "1" })
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.textContent, "Goodbye Turbo")
  assert.isNull(element.parentElement)
})

test("action=after", async () => {
  const element = createStreamElement("after", "hello", createTemplateElement(`<h1 id="after">After Turbo</h1>`))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.nextSibling?.textContent, "After Turbo")
  assert.ok(subject.find("div#hello"))
  assert.ok(subject.find("h1#after"))
  assert.isNull(element.parentElement)
})

test("action=before", async () => {
  const element = createStreamElement("before", "hello", createTemplateElement(`<h1 id="before">Before Turbo</h1>`))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.previousSibling?.textContent, "Before Turbo")
  assert.ok(subject.find("div#hello"))
  assert.ok(subject.find("h1#before"))
  assert.isNull(element.parentElement)
})

test("test action=refresh", async () => {
  document.body.setAttribute("data-modified", "")
  assert.ok(document.body.hasAttribute("data-modified"))

  const element = createStreamElement("refresh")
  subject.append(element)

  await sleep(250)

  assert.notOk(document.body.hasAttribute("data-modified"))
})

test("test action=refresh discarded when matching request id", async () => {
  Turbo.session.recentRequests.add("123")

  document.body.setAttribute("data-modified", "")
  assert.ok(document.body.hasAttribute("data-modified"))

  const element = createStreamElement("refresh")
  element.setAttribute("request-id", "123")
  subject.append(element)

  await sleep(250)

  assert.ok(document.body.hasAttribute("data-modified"))
})

test("action=replace method=morph", async () => {
  const templateElement = createTemplateElement(`<h1 id="hello">Hello Turbo Morphed</h1>`)
  const element = createStreamElement("replace", "hello", templateElement, { method: "morph" })

  assert.equal(subject.find("div#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.notOk(subject.find("div#hello"))
  assert.equal(subject.find("h1#hello")?.textContent, "Hello Turbo Morphed")
})

test("action=replace method=morph with text content change", async () => {
  const templateElement = createTemplateElement(`<div id="hello">Hello Turbo Morphed</div>`)
  const element = createStreamElement("replace", "hello", templateElement, { method: "morph" })

  assert.equal(subject.find("div#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.ok(subject.find("div#hello"))
  assert.equal(subject.find("div#hello")?.textContent, "Hello Turbo Morphed")
})

test("action=update method=morph", async () => {
  const templateElement = createTemplateElement(`<h1 id="hello-child-element">Hello Turbo Morphed</h1>`)
  const element = createStreamElement("update", "hello", templateElement, { method: "morph" })
  const target = subject.find("div#hello")
  assert.equal(target?.textContent, "Hello Turbo")
  element.setAttribute("children-only", true)

  subject.append(element)

  await nextAnimationFrame()

  assert.ok(subject.find("div#hello"))
  assert.ok(subject.find("div#hello > h1#hello-child-element"))
  assert.equal(subject.find("div#hello > h1#hello-child-element").textContent, "Hello Turbo Morphed")
})
