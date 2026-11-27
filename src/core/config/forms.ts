import { cancelEvent } from "../../util"

export type Submitter = HTMLButtonElement | HTMLInputElement

export type SubmitterConfig = {
  beforeSubmit(submitter: HTMLElement): void
  afterSubmit(submitter: HTMLElement): void
}

export type FormMode = "on" | "off" | "optin"

/** The built-in submitter configs, selected by name. */
export type SubmitterName = "aria-disabled" | "disabled"

const submitter: Record<SubmitterName, SubmitterConfig> = {
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
    beforeSubmit: submitter => (submitter as Submitter).disabled = true,
    afterSubmit: submitter => (submitter as Submitter).disabled = false
  }
}

export type ConfirmMethod = (
  message: string,
  element: HTMLFormElement,
  submitter?: HTMLElement
) => boolean | Promise<boolean>

export interface FormsConfig {
  mode: FormMode
  confirm?: ConfirmMethod
  get submitter(): SubmitterConfig
  set submitter(value: SubmitterName | SubmitterConfig)
}

class Config implements FormsConfig {
  declare mode: FormMode
  declare confirm?: ConfirmMethod

  #submitter: SubmitterConfig | null = null

  constructor(config: { mode: FormMode; submitter: SubmitterName | SubmitterConfig }) {
    Object.assign(this, config)
  }

  // Always set by the constructor.
  get submitter(): SubmitterConfig {
    return this.#submitter!
  }

  set submitter(value: SubmitterName | SubmitterConfig) {
    this.#submitter = submitter[value as SubmitterName] || (value as SubmitterConfig)
  }
}

export const forms: FormsConfig = new Config({
  mode: "on",
  submitter: "disabled"
})
