import { cancelEvent } from "../../util"

const submitter = {
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
  #submitter = null

  constructor(config) {
    Object.assign(this, config)
  }

  get submitter() {
    return this.#submitter
  }

  set submitter(value) {
    this.#submitter = submitter[value] || value
  }
}

export const forms = new Config({
  mode: "on",
  submitter: "disabled"
})
