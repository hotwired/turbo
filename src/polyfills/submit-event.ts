type FormSubmitter = HTMLElement & { form?: HTMLFormElement, type?: string }

const submittersByForm: WeakMap<HTMLFormElement, HTMLElement> = new WeakMap

function findSubmitterFromClickTarget(target: EventTarget | null): FormSubmitter | null {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
  const candidate = element ? element.closest("input, button") as FormSubmitter | null : null
  return candidate?.type == "submit" ? candidate : null
}

function clickCaptured(event: Event) {
  const submitter = findSubmitterFromClickTarget(event.target)

  if (submitter && submitter.form) {
    submittersByForm.set(submitter.form, submitter)
  }
}

(function() {
  if ("submitter" in Event.prototype) return

  let prototype;
  // Certain versions of Safari 15 have a bug where they won't
  // populate the submitter. This hurts TurboDrive's enable/disable detection.
  // See https://bugs.webkit.org/show_bug.cgi?id=229660
  if ("SubmitEvent" in window && /Apple Computer/.test(navigator.vendor)) {
    prototype = window.SubmitEvent.prototype;
  } else if ("SubmitEvent" in window) {
    return; // polyfill not needed
  } else {
    prototype = window.Event.prototype;
  }

  addEventListener("click", clickCaptured, true)

  Object.defineProperty(prototype, "submitter", {
    get(): HTMLElement | undefined {
      if (this.type == "submit" && this.target instanceof HTMLFormElement) {
        return submittersByForm.get(this.target)
      }
    }
  })
})()
