export class Snapshot<E extends Element = Element> {
  readonly element: E

  constructor(element: E) {
    this.element = element
  }

  get children() {
    return [ ...this.element.children ]
  }

  hasAnchor(anchor: string) {
    return this.getElementForAnchor(anchor) != null
  }

  getElementForAnchor(anchor: string) {
    try {
      return this.element.querySelector(`[id='${anchor}'], a[name='${anchor}']`)
    } catch {
      return null
    }
  }

  get isConnected() {
    return this.element.isConnected
  }

  get firstAutofocusableElement() {
    return this.element.querySelector("[autofocus]")
  }

  get permanentElements() {
    return [ ...this.element.querySelectorAll("[id][data-turbo-permanent]") ]
  }

  getPermanentElementById(id: string) {
    return this.element.querySelector(`#${id}[data-turbo-permanent]`)
  }

  getPermanentElementsPresentInSnapshot(snapshot: Snapshot) {
    return this.permanentElements.filter(({ id }) => snapshot.getPermanentElementById(id))
  }
}
