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

test("action=append with a form template containing an input named id", async () => {
  const element = createStreamElement(
    "append",
    "hello",
    createTemplateElement(' <form id="child_1"><input type="hidden" name="id" value="First"></form> tail1 ')
  )
  const element2 = createStreamElement(
    "append",
    "hello",
    createTemplateElement(
      '<form id="child_1"><input type="hidden" name="id" value="New First"></form> <form id="child_2"><input type="hidden" name="id" value="Second"></form> tail2 '
    )
  )
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.innerHTML, 'Hello Turbo <form id="child_1"><input type="hidden" name="id" value="First"></form> tail1 ')
  assert.isNull(element.parentElement)

  subject.append(element2)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.innerHTML, 'Hello Turbo  tail1 <form id="child_1"><input type="hidden" name="id" value="New First"></form> <form id="child_2"><input type="hidden" name="id" value="Second"></form> tail2 ')
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

test("action=prepend with a form template containing an input named id", async () => {
  const element = createStreamElement("prepend", "hello", createTemplateElement('<form id="child_1"><input type="hidden" name="id" value="First"></form> tail1 '))
  const element2 = createStreamElement(
    "prepend",
    "hello",
    createTemplateElement(
      '<form id="child_1"><input type="hidden" name="id" value="New First"></form> <form id="child_2"><input type="hidden" name="id" value="Second"></form> tail2 '
    )
  )
  assert.equal(subject.find("#hello")?.textContent, "Hello Turbo")

  subject.append(element)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.innerHTML, '<form id="child_1"><input type="hidden" name="id" value="First"></form> tail1 Hello Turbo')
  assert.isNull(element.parentElement)

  subject.append(element2)
  await nextAnimationFrame()

  assert.equal(subject.find("#hello")?.innerHTML, '<form id="child_1"><input type="hidden" name="id" value="New First"></form> <form id="child_2"><input type="hidden" name="id" value="Second"></form> tail2  tail1 Hello Turbo')
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

test("action=update", async () => {
  const element = createStreamElement("update", "hello", createTemplateElement("Goodbye Turbo"))
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

test("test action=refresh processed when no request id", async () => {
  await assertRefreshProcessed(() => {
    triggerRefresh()
  })
})

test("test action=refresh discarded when matching request id for same URL", async () => {
  await assertRefreshNotProcessed(() => {
    const currentUrl = document.baseURI
    Turbo.session.recentRequests.markUrlAsRefreshed("123", currentUrl)
    triggerRefresh("123")
  })
})

test("test action=refresh for current URL processed for different request id", async () => {
  const currentUrl = document.baseURI

  await assertRefreshProcessed(() => {
    Turbo.session.recentRequests.markUrlAsRefreshed("789", currentUrl)
    triggerRefresh("999")
  })

  await assertRefreshNotProcessed(() => {
    triggerRefresh("999")
  })
})

test("test action=refresh for current URL processed when no request id", async () => {
  await assertRefreshProcessed(() => {
    const currentUrl = document.baseURI
    Turbo.session.recentRequests.markUrlAsRefreshed("123", currentUrl)
    triggerRefresh()
  })
})

test("test action=refresh processed when request id has not refreshed current URL", async () => {
  await assertRefreshProcessed(() => {
    Turbo.session.recentRequests.markUrlAsRefreshed("456", "http://example.com/other-page")
    triggerRefresh("456")
  })
})

test("test action=refresh discards multiple refreshes for same URL and request id", async () => {
  await assertRefreshProcessed(() => {
    triggerRefresh("duplicate-test")
  })

  await assertRefreshNotProcessed(() => {
    triggerRefresh("duplicate-test")
  })
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

const assertRefreshProcessed = async (callback) => {
  document.body.setAttribute("data-modified", "")
  assert.ok(document.body.hasAttribute("data-modified"))

  callback()

  await sleep(250)
  assert.notOk(document.body.hasAttribute("data-modified"))
}

const assertRefreshNotProcessed = async (callback) => {
  document.body.setAttribute("data-modified", "")
  assert.ok(document.body.hasAttribute("data-modified"))

  callback()

  await sleep(250)
  assert.ok(document.body.hasAttribute("data-modified"))
}

const triggerRefresh = (requestId) => {
  const element1 = createStreamElement("refresh")
  if (requestId) {
    element1.setAttribute("request-id", requestId)
  }
  subject.append(element1)
}
