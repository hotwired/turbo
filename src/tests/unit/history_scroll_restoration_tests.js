import { assert } from "@open-wc/testing"
import { History } from "../../core/drive/history"

test("relinquishControlOfScrollRestoration ignores a SecurityError from Firefox", () => {
  const history = new History({})
  history.previousScrollRestoration = "auto"

  const original = Object.getOwnPropertyDescriptor(window.history, "scrollRestoration")
  Object.defineProperty(window.history, "scrollRestoration", {
    configurable: true,
    get() {
      return "manual"
    },
    set() {
      throw new DOMException("The operation is insecure.", "SecurityError")
    }
  })

  try {
    assert.doesNotThrow(() => history.relinquishControlOfScrollRestoration())
    assert.equal(history.previousScrollRestoration, undefined)
  } finally {
    if (original) {
      Object.defineProperty(window.history, "scrollRestoration", original)
    } else {
      delete window.history.scrollRestoration
    }
  }
})
