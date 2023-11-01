import { StreamElement } from "../../elements"
import { nextRepaint } from "../../util"
import { DOMTestCase } from "../helpers/dom_test_case"
import { assert } from "@open-wc/testing"

function createStreamElement(action, target, templateElement) {
  const element = new StreamElement()
  if (action) element.setAttribute("action", action)
  if (target) element.setAttribute("target", target)
  if (templateElement) element.appendChild(templateElement)
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

test("test action=append", async () => {
  const element = createStreamElement("append", "hello", createTemplateElement("<span> Streams</span>"))
  const element2 = createStreamElement("append", "hello", createTemplateElement("<span> and more</span>"))

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo Streams")
  assert.isNull(element.parentElement)

  subject.append(element2)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo Streams and more")
  assert.isNull(element2.parentElement)
})

test("test action=append with children ID already present in target", async () => {
  const element = createStreamElement("append", "hello", createTemplateElement(' <div id="child_1">First</div> tail1 '))
  const element2 = createStreamElement(
    "append",
    "hello",
    createTemplateElement('<div id="child_1">New First</div> <div id="child_2">Second</div> tail2 ')
  )
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo First tail1 ")
  assert.isNull(element.parentElement)

  subject.append(element2)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo  tail1 New First Second tail2 ")
})

test("test action=prepend", async () => {
  const element = createStreamElement("prepend", "hello", createTemplateElement("<span>Streams </span>"))
  const element2 = createStreamElement("prepend", "hello", createTemplateElement("<span>and more </span>"))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.textContent, "Streams Hello Turbo")
  assert.isNull(element.parentElement)

  subject.append(element2)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.textContent, "and more Streams Hello Turbo")
  assert.isNull(element.parentElement)
})

test("test action=prepend with children ID already present in target", async () => {
  const element = createStreamElement("prepend", "hello", createTemplateElement('<div id="child_1">First</div> tail1 '))
  const element2 = createStreamElement(
    "prepend",
    "hello",
    createTemplateElement('<div id="child_1">New First</div> <div id="child_2">Second</div> tail2 ')
  )
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.textContent, "First tail1 Hello Turbo")
  assert.isNull(element.parentElement)

  subject.append(element2)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.textContent, "New First Second tail2  tail1 Hello Turbo")
})

test("test action=remove", async () => {
  const element = createStreamElement("remove", "hello")
  assert.ok(subject.find("#hello"))

  subject.append(element)
  await nextRepaint()

  assert.notOk(subject.find("#hello"))
  assert.isNull(element.parentElement)
})

test("test action=replace", async () => {
  const element = createStreamElement("replace", "hello", createTemplateElement(`<h1 id="hello">Hello Turbo</h1>`))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.ok(subject.find("div#hello"))

  subject.append(element)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")
  assert.notOk(subject.find("div#hello"))
  assert.ok(subject.find("h1#hello"))
  assert.isNull(element.parentElement)
})

test("test action=update", async () => {
  const element = createStreamElement("update", "hello", createTemplateElement("Goodbye Turbo"))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.textContent, "Goodbye Turbo")
  assert.isNull(element.parentElement)
})

test("test action=after", async () => {
  const element = createStreamElement("after", "hello", createTemplateElement(`<h1 id="after">After Turbo</h1>`))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.nextSibling?.textContent, "After Turbo")
  assert.ok(subject.find("div#hello"))
  assert.ok(subject.find("h1#after"))
  assert.isNull(element.parentElement)
})

test("test action=before", async () => {
  const element = createStreamElement("before", "hello", createTemplateElement(`<h1 id="before">Before Turbo</h1>`))
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextRepaint()

  assert.equal(subject.find("#hello")?.previousSibling?.textContent, "Before Turbo")
  assert.ok(subject.find("div#hello"))
  assert.ok(subject.find("h1#before"))
  assert.isNull(element.parentElement)
})
