import { assert } from "@open-wc/testing"
import { FormSubmission } from "../../core/drive/form_submission"

let form, submitter

setup(() => {
  form = document.body.appendChild(document.createElement("form"))
  form.action = "http://example.com"
  form.method = "post"
  submitter = form.appendChild(document.createElement("button"))
  submitter.textContent = "Submit"
  submitter.setAttribute("data-turbo-submits-with", "Submitting...")
})

teardown(() => {
  form.remove()
})

test("finishing an older submission does not clear a newer submission's busy state", () => {
  const firstSubmission = new FormSubmission(delegate, form, submitter)
  const secondSubmission = new FormSubmission(delegate, form, submitter)
  firstSubmission.requestStarted(firstSubmission.fetchRequest)
  secondSubmission.requestStarted(secondSubmission.fetchRequest)
  firstSubmission.requestFinished(firstSubmission.fetchRequest)

  assert.equal(form.getAttribute("aria-busy"), "true")
  assert.equal(submitter.textContent, "Submitting...")

  secondSubmission.requestFinished(secondSubmission.fetchRequest)

  assert.isFalse(form.hasAttribute("aria-busy"))
  assert.equal(submitter.textContent, "Submit")
})

const delegate = {
  formSubmissionStarted() {},
  formSubmissionFinished() {}
}
