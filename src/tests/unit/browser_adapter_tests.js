import { assert } from "@open-wc/testing"
import { BrowserAdapter } from "../../core/native/browser_adapter"
import { Navigator } from "../../core/drive/navigator"

let adapter, navigator

setup(() => {
  adapter = new BrowserAdapter({ progressBarDelay: 60000 })
  navigator = new Navigator({ adapter })
})

teardown(() => {
  adapter.hideFormProgressBar()
  adapter.hideVisitProgressBar()
  adapter.progressBar.stylesheetElement.remove()
})

test("finishing an older form does not complete a newer form's progress", () => {
  const first = {}
  const second = {}
  navigator.formSubmissionStarted(first)
  navigator.formSubmissionStarted(second)
  navigator.formSubmissionFinished(first)

  assert.equal(adapter.progressBar.value, 0)

  navigator.formSubmissionFinished(second)
  assert.equal(adapter.progressBar.value, 1)
})

test("finishing a form clears progress when its replacement has not started", () => {
  const first = {}
  navigator.formSubmissionStarted(first)
  navigator.formSubmission = { state: "requesting" }
  navigator.formSubmissionFinished(first)

  assert.equal(adapter.progressBar.value, 1)
})

test("finishing a form does not complete a newer visit's progress", () => {
  const form = {}
  navigator.formSubmissionStarted(form)
  const visit = {
    action: "advance",
    loadCachedSnapshot() {},
    issueRequest() {},
    hasCachedSnapshot() { return false }
  }
  adapter.visitStarted(visit)
  adapter.visitRequestStarted(visit)
  navigator.formSubmissionFinished(form)

  assert.equal(adapter.progressBar.value, 0)
})
