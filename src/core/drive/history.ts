import { uuid } from "../../util"

export type RestorationData = { scrollPosition?: { x: number; y: number } }

export type RestorationDataMap = { [restorationIdentifier: string]: RestorationData }

export type VisitDirection = "forward" | "back" | "none"

export type TurboHistoryState = {
  restorationIdentifier: string
  restorationIndex: number
  documentIdentifier?: string
}

type HistoryMethod = typeof history.pushState

// The Navigation API is not in every TypeScript DOM lib yet.
type WindowWithNavigation = Window & { navigation?: { currentEntry?: { id: string } | null } }

export interface HistoryDelegate {
  historyPoppedToLocationWithRestorationIdentifierAndDirection(
    location: URL,
    restorationIdentifier: string,
    direction: VisitDirection,
    isSameDocument: boolean
  ): void
  historyPoppedWithEmptyState(location: URL): void
}

export class History {
  // The current entry can change before a paused render replaces the visible document.
  #renderedDocumentIdentifier = uuid()
  #entryDocumentIdentifier = this.#renderedDocumentIdentifier

  // replaceState on startup would turn a native POST entry into a GET entry.
  #initialEntries = new Map<string | undefined, TurboHistoryState>()

  location!: URL
  restorationIdentifier = uuid()
  restorationData: RestorationDataMap = {}
  started = false
  currentIndex = 0
  declare readonly delegate: HistoryDelegate
  declare previousScrollRestoration?: ScrollRestoration

  constructor(delegate: HistoryDelegate) {
    this.delegate = delegate
  }

  start(): void {
    if (!this.started) {
      addEventListener("popstate", this.onPopState, false)
      const state = this.#getEntryState(history.state)
      this.currentIndex = state?.restorationIndex || 0
      this.#renderedDocumentIdentifier = state?.documentIdentifier || this.#renderedDocumentIdentifier
      const location = new URL(window.location.href)
      const entryId = (window as WindowWithNavigation).navigation?.currentEntry?.id
      const shouldPreserveEntry = Boolean(entryId) && !history.state?.turbo
      const restorationIdentifier = state?.restorationIdentifier ||
        (shouldPreserveEntry && this.location ? uuid() : this.restorationIdentifier)
      this.started = true

      if (shouldPreserveEntry) {
        this.#initialEntries.set(entryId, {
          restorationIdentifier,
          restorationIndex: this.currentIndex,
          documentIdentifier: this.#renderedDocumentIdentifier
        })
        this.location = location
        this.restorationIdentifier = restorationIdentifier
        this.#entryDocumentIdentifier = this.#renderedDocumentIdentifier
      } else {
        this.update(history.replaceState, location, restorationIdentifier, {
          documentIdentifier: this.#renderedDocumentIdentifier,
          preserveState: true
        })
      }
    }
  }

  stop(): void {
    if (this.started) {
      removeEventListener("popstate", this.onPopState, false)
      this.started = false
    }
  }

  push(location: URL, restorationIdentifier?: string): void {
    this.update(history.pushState, location, restorationIdentifier)
  }

  replace(location: URL, restorationIdentifier?: string): void {
    this.update(history.replaceState, location, restorationIdentifier)
  }

  update(
    method: HistoryMethod,
    location: URL,
    restorationIdentifier = uuid(),
    { documentIdentifier = uuid(), preserveState = false }: { documentIdentifier?: string; preserveState?: boolean } = {}
  ): void {
    if (method === history.pushState) {
      // A router can create an entry without emitting popstate before a Drive visit leaves it.
      if (!this.#getEntryState(history.state)?.documentIdentifier) {
        this.update(history.replaceState, new URL(window.location.href), history.state?.turbo?.restorationIdentifier || uuid(), {
          documentIdentifier: this.#entryDocumentIdentifier || this.#renderedDocumentIdentifier,
          preserveState: true
        })
      }
      ++this.currentIndex
    }

    const state: { turbo?: TurboHistoryState } =
      preserveState && typeof history.state === "object" && history.state !== null ? { ...history.state } : {}
    state.turbo = { ...state.turbo, restorationIdentifier, restorationIndex: this.currentIndex, documentIdentifier }
    method.call(history, state, "", location.href)
    this.location = location
    this.restorationIdentifier = restorationIdentifier
    this.#entryDocumentIdentifier = documentIdentifier
  }

  get renderedDocumentIdentifier(): string {
    return this.#renderedDocumentIdentifier
  }

  get entryDocumentIdentifier(): string {
    return this.#entryDocumentIdentifier
  }

  adoptDocument(documentIdentifier: string): void {
    this.#renderedDocumentIdentifier = documentIdentifier
  }

  // Restoration data

  getRestorationDataForIdentifier(restorationIdentifier: string): RestorationData {
    return this.restorationData[restorationIdentifier] || {}
  }

  updateRestorationData(additionalData: Partial<RestorationData>): void {
    const { restorationIdentifier } = this
    const restorationData = this.restorationData[restorationIdentifier]
    this.restorationData[restorationIdentifier] = {
      ...restorationData,
      ...additionalData
    }
  }

  // Scroll restoration

  assumeControlOfScrollRestoration(): void {
    if (!this.previousScrollRestoration) {
      this.previousScrollRestoration = history.scrollRestoration ?? "auto"
      history.scrollRestoration = "manual"
    }
  }

  relinquishControlOfScrollRestoration(): void {
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

  onPopState = (event: PopStateEvent) => {
    const turbo = this.#getEntryState(event.state)
    const previousEntryDocumentIdentifier = this.#entryDocumentIdentifier
    this.location = new URL(window.location.href)

    if (turbo) {
      const { restorationIdentifier, restorationIndex, documentIdentifier = uuid() } = turbo
      this.restorationIdentifier = restorationIdentifier
      this.#entryDocumentIdentifier = documentIdentifier
      const direction: VisitDirection = restorationIndex > this.currentIndex ? "forward" : "back"
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

  // Private

  #getEntryState(state: { turbo?: TurboHistoryState } | null | undefined): TurboHistoryState | undefined {
    return state?.turbo || this.#initialEntries.get((window as WindowWithNavigation).navigation?.currentEntry?.id)
  }
}

