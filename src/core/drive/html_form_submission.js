import { expandURL } from "../url"
import { getAttribute, getVisitAction } from "../../util"
import { FetchMethod, fetchMethodFromString } from "../../http/fetch_request"

export const FormEnctype = {
  urlEncoded: "application/x-www-form-urlencoded",
  multipart: "multipart/form-data",
  plain: "text/plain"
}

export function formEnctypeFromString(encoding) {
  switch (encoding.toLowerCase()) {
    case FormEnctype.multipart:
      return FormEnctype.multipart
    case FormEnctype.plain:
      return FormEnctype.plain
    default:
      return FormEnctype.urlEncoded
  }
}

export class HTMLFormSubmission {
  constructor(form, submitter) {
    this.form = form
    this.submitter = submitter

    const url = expandURL(this.action)

    this.location = this.isSafe ? mergeFormDataEntries(url, [...this.body.entries()]) : url
  }

  closest(selectors) {
    return this.form.closest(selectors)
  }

  get method() {
    return this.submitter?.getAttribute("formmethod") || this.form.getAttribute("method") || ""
  }

  get fetchMethod() {
    return fetchMethodFromString(this.method.toLowerCase()) || FetchMethod.get
  }

  get target() {
    if (this.submitter?.hasAttribute("formtarget") || this.form.hasAttribute("target")) {
      return this.submitter?.getAttribute("formtarget") || this.form.getAttribute("target")
    } else {
      return null
    }
  }

  get action() {
    const formElementAction = typeof this.form.action === "string" ? this.form.action : null

    if (this.submitter?.hasAttribute("formaction")) {
      return this.submitter.getAttribute("formaction") || ""
    } else {
      return this.form.getAttribute("action") || formElementAction || ""
    }
  }

  get formData() {
    const formData = new FormData(this.form)
    const name = this.submitter?.getAttribute("name")
    const value = this.submitter?.getAttribute("value")

    if (name) {
      formData.append(name, value || "")
    }

    return formData
  }

  get enctype() {
    return formEnctypeFromString(this.submitter?.getAttribute("formenctype") || this.form.enctype)
  }

  get body() {
    if (this.enctype == FormEnctype.urlEncoded || this.fetchMethod == FetchMethod.get) {
      const formDataAsStrings = [...this.formData].reduce((entries, [name, value]) => {
        return entries.concat(typeof value == "string" ? [[name, value]] : [])
      }, [])

      return new URLSearchParams(formDataAsStrings)
    } else {
      return this.formData
    }
  }

  get visitAction() {
    return getVisitAction(this.submitter, this.form)
  }

  get frame() {
    return getAttribute("data-turbo-frame", this.submitter, this.form)
  }

  get isSafe() {
    return this.fetchMethod === FetchMethod.get
  }
}

function mergeFormDataEntries(url, entries) {
  const searchParams = new URLSearchParams()

  for (const [name, value] of entries) {
    if (value instanceof File) continue

    searchParams.append(name, value)
  }

  url.search = searchParams.toString()

  return url
}
