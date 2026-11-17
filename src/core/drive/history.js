import { uuid } from "../../util"

export class History {
  // The current entry can change before a paused render replaces the visible document.
  #renderedDocumentIdentifier = uuid()
  #entryDocumentIdentifier = this.#renderedDocumentIdentifier

  location
  restorationIdentifier = uuid()
  restorationData = {}
  started = false
  currentIndex = 0

  constructor(delegate) {
    this.delegate = delegate
  }

  start() {
    if (!this.started) {
      addEventListener("popstate", this.onPopState, false)
      const state = history.state?.turbo
      this.currentIndex = state?.restorationIndex || 0
      this.#renderedDocumentIdentifier = state?.documentIdentifier || this.#renderedDocumentIdentifier
      this.started = true
      this.update(history.replaceState, new URL(window.location.href), state?.restorationIdentifier || this.restorationIdentifier, {
        documentIdentifier: this.#renderedDocumentIdentifier,
        preserveState: true
      })
    }
  }

  stop() {
    if (this.started) {
      removeEventListener("popstate", this.onPopState, false)
      this.started = false
    }
  }

  push(location, restorationIdentifier) {
    this.update(history.pushState, location, restorationIdentifier)
  }

  replace(location, restorationIdentifier) {
    this.update(history.replaceState, location, restorationIdentifier)
  }

  update(method, location, restorationIdentifier = uuid(), { documentIdentifier = uuid(), preserveState = false } = {}) {
    if (method === history.pushState) {
      // A router can create an entry without emitting popstate before a Drive visit leaves it.
      if (!history.state?.turbo?.documentIdentifier) {
        this.update(history.replaceState, new URL(window.location.href), history.state?.turbo?.restorationIdentifier || uuid(), {
          documentIdentifier: this.#entryDocumentIdentifier || this.#renderedDocumentIdentifier,
          preserveState: true
        })
      }
      ++this.currentIndex
    }

    const state = preserveState && typeof history.state === "object" && history.state !== null ? { ...history.state } : {}
    state.turbo = { ...state.turbo, restorationIdentifier, restorationIndex: this.currentIndex, documentIdentifier }
    method.call(history, state, "", location.href)
    this.location = location
    this.restorationIdentifier = restorationIdentifier
    this.#entryDocumentIdentifier = documentIdentifier
  }

  get renderedDocumentIdentifier() {
    return this.#renderedDocumentIdentifier
  }

  get entryDocumentIdentifier() {
    return this.#entryDocumentIdentifier
  }

  adoptDocument(documentIdentifier) {
    this.#renderedDocumentIdentifier = documentIdentifier
  }

  // Restoration data

  getRestorationDataForIdentifier(restorationIdentifier) {
    return this.restorationData[restorationIdentifier] || {}
  }

  updateRestorationData(additionalData) {
    const { restorationIdentifier } = this
    const restorationData = this.restorationData[restorationIdentifier]
    this.restorationData[restorationIdentifier] = {
      ...restorationData,
      ...additionalData
    }
  }

  // Scroll restoration

  assumeControlOfScrollRestoration() {
    if (!this.previousScrollRestoration) {
      this.previousScrollRestoration = history.scrollRestoration ?? "auto"
      history.scrollRestoration = "manual"
    }
  }

  relinquishControlOfScrollRestoration() {
    if (this.previousScrollRestoration) {
      try {
        history.scrollRestoration = this.previousScrollRestoration
      } catch {
        // Firefox can throw SecurityError when restoring scrollRestoration
        // during pagehide. The page is unloading; leave the browser's value.
      }
      delete this.previousScrollRestoration
    }
  }

  // Event handlers

  onPopState = (event) => {
    const { turbo } = event.state || {}
    const previousEntryDocumentIdentifier = this.#entryDocumentIdentifier
    this.location = new URL(window.location.href)

    if (turbo) {
      const { restorationIdentifier, restorationIndex, documentIdentifier = uuid() } = turbo
      this.restorationIdentifier = restorationIdentifier
      this.#entryDocumentIdentifier = documentIdentifier
      const direction = restorationIndex > this.currentIndex ? "forward" : "back"
      const isSameDocument = documentIdentifier === this.#renderedDocumentIdentifier &&
        previousEntryDocumentIdentifier === this.#renderedDocumentIdentifier
      this.currentIndex = restorationIndex
      if (!turbo.documentIdentifier) {
        this.update(history.replaceState, this.location, restorationIdentifier, { documentIdentifier, preserveState: true })
      }
      this.delegate.historyPoppedToLocationWithRestorationIdentifierAndDirection(this.location, restorationIdentifier, direction, isSameDocument)
    } else {
      this.currentIndex++
      this.update(history.replaceState, this.location, uuid(), {
        documentIdentifier: this.#entryDocumentIdentifier || this.#renderedDocumentIdentifier,
        preserveState: true
      })
      this.delegate.historyPoppedWithEmptyState(this.location)
    }
  }
}
