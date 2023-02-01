import { StreamElement } from "../../elements"
import { nextBeat } from "../../util"
import { beforeEach, expect, test } from "@jest/globals"

beforeEach(() => {
  document.body.innerHTML = `<div><div id="hello">Hello Turbo</div></div>`
})

test("action=append", async () => {
  const element = createStreamElement("append", "hello", createTemplateElement("<span> Streams</span>"))
  const element2 = createStreamElement("append", "hello", createTemplateElement("<span> and more</span>"))

  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo")

  document.body.appendChild(element)
  await nextBeat()

  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo Streams")
  expect(element.parentElement).toBeNull()

  document.body.appendChild(element2)
  await nextBeat()

  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo Streams and more")
  expect(element2.parentElement).toBeNull()
})

test("action=append with children ID already present in target", async () => {
  const element = createStreamElement("append", "hello", createTemplateElement(' <div id="child_1">First</div> tail1 '))
  const element2 = createStreamElement(
    "append",
    "hello",
    createTemplateElement('<div id="child_1">New First</div> <div id="child_2">Second</div> tail2 ')
  )
  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo")

  document.body.appendChild(element)
  await nextBeat()

  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo First tail1 ")
  expect(element.parentElement).toBeNull()

  document.body.appendChild(element2)
  await nextBeat()

  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo  tail1 New First Second tail2 ")
})

test("action=prepend", async () => {
  const element = createStreamElement("prepend", "hello", createTemplateElement("<span>Streams </span>"))
  const element2 = createStreamElement("prepend", "hello", createTemplateElement("<span>and more </span>"))
  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo")

  document.body.appendChild(element)
  await nextBeat()

  expect(document.getElementById("hello")?.textContent).toEqual("Streams Hello Turbo")
  expect(element.parentElement).toBeNull()

  document.body.appendChild(element2)
  await nextBeat()

  expect(document.getElementById("hello")?.textContent).toEqual("and more Streams Hello Turbo")
  expect(element.parentElement).toBeNull()
})

test("action=prepend with children ID already present in target", async () => {
  const element = createStreamElement("prepend", "hello", createTemplateElement('<div id="child_1">First</div> tail1 '))
  const element2 = createStreamElement(
    "prepend",
    "hello",
    createTemplateElement('<div id="child_1">New First</div> <div id="child_2">Second</div> tail2 ')
  )
  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo")

  document.body.appendChild(element)
  await nextBeat()

  expect(document.getElementById("hello")?.textContent).toEqual("First tail1 Hello Turbo")
  expect(element.parentElement).toBeNull()

  document.body.appendChild(element2)
  await nextBeat()

  expect(document.getElementById("hello")?.textContent).toEqual("New First Second tail2  tail1 Hello Turbo")
})

test("action=remove", async () => {
  const element = createStreamElement("remove", "hello")
  expect(document.getElementById("hello")).toBeTruthy()

  document.body.appendChild(element)
  await nextBeat()

  expect(document.getElementById("hello")).toBeFalsy()
  expect(element.parentElement).toBeNull()
})

test("action=replace", async () => {
  const element = createStreamElement("replace", "hello", createTemplateElement(`<h1 id="hello">Hello Turbo</h1>`))
  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo")
  expect(document.querySelector("div#hello")).toBeTruthy()

  document.body.appendChild(element)
  await nextBeat()

  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo")
  expect(document.querySelector("div#hello")).toBeNull()
  expect(document.querySelector("h1#hello")).toBeTruthy()
  expect(element.parentElement).toBeNull()
})

test("action=update", async () => {
  const element = createStreamElement("update", "hello", createTemplateElement("Goodbye Turbo"))
  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo")

  document.body.appendChild(element)
  await nextBeat()

  expect(document.getElementById("hello")?.textContent).toEqual("Goodbye Turbo")
  expect(element.parentElement).toBeNull()
})

test("action=after", async () => {
  const element = createStreamElement("after", "hello", createTemplateElement(`<h1 id="after">After Turbo</h1>`))
  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo")

  document.body.appendChild(element)
  await nextBeat()

  expect(document.getElementById("hello")?.nextSibling?.textContent).toEqual("After Turbo")
  expect(document.querySelector("div#hello")).toBeTruthy()
  expect(document.querySelector("h1#after")).toBeTruthy()
  expect(element.parentElement).toBeNull()
})

test("action=before", async () => {
  const element = createStreamElement("before", "hello", createTemplateElement(`<h1 id="before">Before Turbo</h1>`))
  expect(document.getElementById("hello")?.textContent).toEqual("Hello Turbo")

  document.body.appendChild(element)
  await nextBeat()

  expect(document.getElementById("hello")?.previousSibling?.textContent).toEqual("Before Turbo")
  expect(document.querySelector("div#hello")).toBeTruthy()
  expect(document.querySelector("h1#before")).toBeTruthy()
  expect(element.parentElement).toBeNull()
})

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
