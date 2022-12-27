import { HeadSnapshot } from "../../core/drive/head_snapshot"
import { parseHTMLDocument } from "../../util"
import { DOMTestCase } from "../helpers/dom_test_case"

export class HeadSnapshotTests extends DOMTestCase {
  headSnapshot!: HeadSnapshot

  async beforeTest() {
    this.fixtureHTML = `
  <head>
    <title>Title 1</title>
    <link rel="stylesheet" href="base.css" type="text/css">
    <link rel="stylesheet" href="tracked.css" type="text/css" data-turbo-track="reload" nonce="nonce">
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
    const parsedHTML = parseHTMLDocument(this.fixtureHTML)
    this.headSnapshot = new HeadSnapshot(parsedHTML.head)
  }

  async "test element parsing"() {
    // const element = createStreamElement("before", "hello", createTemplateElement(`<h1 id="before">Before Turbo</h1>`))
    const titleElement = document.createElement("title")
    titleElement.innerHTML = "Title 1"

    this.assert.isTrue(this.headSnapshot.getElements("title")[0].isEqualNode(titleElement))

    // link elements should only be icon element, stylesheets are stored in stylesheet property
    this.assert.equal(this.headSnapshot.getElements("link").length, 1)
    this.assert.equal(this.headSnapshot.stylesheets.length, 3)
  }

  async "test getMetaValue"() {
    this.assert.equal(this.headSnapshot.getMetaValue("description"), "Meta Description")
    this.assert.equal(this.headSnapshot.getMetaValue("viewport"), "width=device-width, initial-scale=1.0")
  }

  async "test trackedElementSignature"() {
    // ensure tracked elements are in signature, with nonce removed (as nonce will change per page load)
    this.assert.equal(
      this.headSnapshot.trackedElementSignature,
      '<link rel="stylesheet" href="tracked.css" type="text/css" data-turbo-track="reload" nonce="">'
    )
  }
}

HeadSnapshotTests.registerSuite()
