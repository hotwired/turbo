declare global {
  type ViewTransition = {
    finished: Promise<void>
  }

  interface Document {
    startViewTransition?(callback: () => void): ViewTransition
  }
}

export function withViewTransition(shouldTransition: boolean, callback: () => Promise<void>): Promise<void> {
  if (shouldTransition && document.startViewTransition) {
    return document.startViewTransition(callback).finished
  } else {
    return callback()
  }
}
