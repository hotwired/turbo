type FormSubmitter = HTMLElement & { form?: HTMLFormElement }

const submittersByForm: WeakMap<HTMLFormElement, HTMLElement> = new WeakMap

function findSubmitterFromClickTarget(target: EventTarget | null): FormSubmitter | null {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
  const candidate = element ? element.closest("input, button") as FormSubmitter | null : null
  return candidate?.getAttribute("type") == "submit" ? candidate : null
}

function clickCaptured(event: Event) {
  const submitter = findSubmitterFromClickTarget(event.target)

  if (submitter && submitter.form) {
    submittersByForm.set(submitter.form, submitter)
  }
}

(function() {
  if ("SubmitEvent" in window) return

  addEventListener("click", clickCaptured, true)

  Object.defineProperty(Event.prototype, "submitter", {
    get(): HTMLElement | undefined {
      if (this.type == "submit" && this.target instanceof HTMLFormElement) {
        return submittersByForm.get(this.target)
      }
    }
  })
})()
