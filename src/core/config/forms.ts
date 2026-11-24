import { cancelEvent } from "../../util"

export type Submitter = HTMLButtonElement | HTMLInputElement

export type SubmitterConfig = {
  beforeSubmit(submitter: Submitter): void
  afterSubmit(submitter: Submitter): void
}

export type FormMode = "on" | "off" | "optin"

const submitter: Record<"aria-disabled" | "disabled", SubmitterConfig> = {
  "aria-disabled": {
    beforeSubmit: submitter => {
      submitter.setAttribute("aria-disabled", "true")
      submitter.addEventListener("click", cancelEvent)
    },

    afterSubmit: submitter => {
      submitter.removeAttribute("aria-disabled")
      submitter.removeEventListener("click", cancelEvent)
    }
  },

  "disabled": {
    beforeSubmit: submitter => submitter.disabled = true,
    afterSubmit: submitter => submitter.disabled = false
  }
}

class Config {
  declare mode: FormMode
  #submitter: SubmitterConfig | null = null

  constructor(config: { mode: FormMode; submitter: string | SubmitterConfig }) {
    Object.assign(this, config)
  }

  get submitter(): SubmitterConfig | null {
    return this.#submitter
  }

  // A string names a built-in submitter config ("disabled" or "aria-disabled").
  set submitter(value: string | SubmitterConfig | null) {
    this.#submitter = submitter[value as keyof typeof submitter] || value
  }
}

export type FormsConfig = Config

export const forms: FormsConfig = new Config({
  mode: "on",
  submitter: "disabled"
})
