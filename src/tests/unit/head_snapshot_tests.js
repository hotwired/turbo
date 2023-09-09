import { HeadSnapshot } from "../../core/drive/head_snapshot"
import { parseHTMLDocument } from "../../util"
import { DOMTestCase } from "../helpers/dom_test_case"
import { assert } from "@open-wc/testing"

export class HeadSnapshotTests extends DOMTestCase {}

let subject

setup(() => {
  subject = new HeadSnapshotTests()
  subject.setup()
  subject.fixtureHTML =  `
  <head>
    <title>Title 1</title>
    <link rel="stylesheet" href="#base.css" type="text/css">
    <link rel="stylesheet" href="#tracked.css" type="text/css" data-turbo-track="reload" nonce="nonce">
    <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
    <style>
        .test-style{
            font-size:99px;
        }
    </style>
    <meta name="description" content="Meta Description">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  `
  const parsedHTML = parseHTMLDocument(subject.fixtureHTML)
  subject.headSnapshot = new HeadSnapshot(parsedHTML.head)
})

test("test element parsing", async () => {
  // const element = createStreamElement("before", "hello", createTemplateElement(`<h1 id="before">Before Turbo</h1>`))
  const titleElement = document.createElement("title")
  titleElement.innerHTML = "Title 1"

  assert.isTrue(subject.headSnapshot.getElements("title")[0].isEqualNode(titleElement))

  // link elements should only be icon element, stylesheets are stored in stylesheet property
  assert.equal(subject.headSnapshot.getElements("link").length, 1)
  assert.equal(subject.headSnapshot.stylesheets.length, 3)
})

test("test getMetaValue", async () => {
  assert.equal(subject.headSnapshot.getMetaValue("description"), "Meta Description")
  assert.equal(subject.headSnapshot.getMetaValue("viewport"), "width=device-width, initial-scale=1.0")
})

test("test trackedElementSignature", async () => {
  // ensure tracked elements are in signature, with nonce removed (as nonce will change per page load)
  assert.equal(
    subject.headSnapshot.trackedElementSignature,
    '<link rel="stylesheet" href="#tracked.css" type="text/css" data-turbo-track="reload" nonce="">'
  )
})
