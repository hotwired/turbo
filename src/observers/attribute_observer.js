export class AttributeObserver {
  started = false

  constructor(delegate, element, attributeName) {
    this.delegate = delegate
    this.element = element
    this.attributeName = attributeName
    this.observer = new MutationObserver(this.#handleMutations)
  }

  start() {
    if (!this.started) {
      this.observer.observe(this.element, {
        attributeFilter: [this.attributeName],
        subtree: true,
        childList: true
      })

      this.started = true
    }

    for (const element of this.#queryAllMatches(this.element)) {
      this.#handleNode(element)
    }
  }

  stop() {
    if (this.started) {
      this.observer.disconnect()
      this.started = false
    }
  }

  #handleMutations = (mutationRecords) => {
    for (const { addedNodes, target, type } of mutationRecords) {
      if (type === "attributes") {
        this.#handleNode(target)
      } else {
        for (const node of addedNodes) {
          if (node instanceof Element) {
            this.#handleNode(node)

            for (const element of this.#queryAllMatches(node)) {
              this.#handleNode(element)
            }
          }
        }
      }
    }
  }

  #handleNode(node) {
    if (node instanceof Element && node.hasAttribute(this.attributeName)) {
      this.delegate.observedElementWithAttribute(node, this.attributeName, node.getAttribute(this.attributeName))
    }
  }

  #queryAllMatches(parent) {
    return parent.querySelectorAll(`[${this.attributeName}]`)
  }
}
