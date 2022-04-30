import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class AutofocusTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/autofocus.html")
  }

  async "test autofocus first autofocus element on load"() {
    await this.nextBeat
    this.assert.ok(
      await this.hasSelector("#first-autofocus-element:focus"),
      "focuses the first [autofocus] element on the page"
    )
    this.assert.notOk(
      await this.hasSelector("#second-autofocus-element:focus"),
      "focuses the first [autofocus] element on the page"
    )
  }

  async "test autofocus first [autofocus] element on visit"() {
    await this.goToLocation("/src/tests/fixtures/navigation.html")
    await this.clickSelector("#autofocus-link")
    await this.sleep(500)

    this.assert.ok(
      await this.hasSelector("#first-autofocus-element:focus"),
      "focuses the first [autofocus] element on the page"
    )
    this.assert.notOk(
      await this.hasSelector("#second-autofocus-element:focus"),
      "focuses the first [autofocus] element on the page"
    )
  }

  async "test navigating a frame with a descendant link autofocuses [autofocus]:first-of-type"() {
    await this.clickSelector("#frame-inner-link")
    await this.nextBeat

    this.assert.ok(
      await this.hasSelector("#frames-form-first-autofocus-element:focus"),
      "focuses the first [autofocus] element in frame"
    )
    this.assert.notOk(
      await this.hasSelector("#frames-form-second-autofocus-element:focus"),
      "focuses the first [autofocus] element in frame"
    )
  }

  async "test navigating a frame with a link targeting the frame autofocuses [autofocus]:first-of-type"() {
    await this.clickSelector("#frame-outer-link")
    await this.nextBeat

    this.assert.ok(
      await this.hasSelector("#frames-form-first-autofocus-element:focus"),
      "focuses the first [autofocus] element in frame"
    )
    this.assert.notOk(
      await this.hasSelector("#frames-form-second-autofocus-element:focus"),
      "focuses the first [autofocus] element in frame"
    )
  }

  async "test navigating a frame with a turbo-frame targeting the frame autofocuses [autofocus]:first-of-type"() {
    await this.clickSelector("#drives-frame-target-link")
    await this.nextBeat

    this.assert.ok(
      await this.hasSelector("#frames-form-first-autofocus-element:focus"),
      "focuses the first [autofocus] element in frame"
    )
    this.assert.notOk(
      await this.hasSelector("#frames-form-second-autofocus-element:focus"),
      "focuses the first [autofocus] element in frame"
    )
  }
}

AutofocusTests.registerSuite()
