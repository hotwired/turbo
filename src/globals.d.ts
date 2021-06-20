interface SubmitEvent extends Event {
  submitter: HTMLElement | null
}

interface Node {
  // https://github.com/Microsoft/TypeScript/issues/283
  cloneNode(deep?: boolean): this
}

interface Window {
  Turbo: typeof import("./core/index")
}
