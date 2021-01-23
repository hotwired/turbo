export type SnapshotRootNode = Node & ParentNode

export class Snapshot {
  readonly rootNode: SnapshotRootNode

  constructor(rootNode: SnapshotRootNode) {
    this.rootNode = rootNode
  }

  get children() {
    return [ ...this.rootNode.children ]
  }

  hasAnchor(anchor: string) {
    return this.getElementForAnchor(anchor) != null
  }

  getElementForAnchor(anchor: string) {
    try {
      return this.rootNode.querySelector(`[id='${anchor}'], a[name='${anchor}']`)
    } catch {
      return null
    }
  }

  get firstAutofocusableElement() {
    return this.rootNode.querySelector("[autofocus]")
  }

  get permanentElements() {
    return [ ...this.rootNode.querySelectorAll("[id][data-turbo-permanent]") ]
  }

  getPermanentElementById(id: string) {
    return this.rootNode.querySelector(`#${id}[data-turbo-permanent]`)
  }

  getPermanentElementsPresentInSnapshot(snapshot: Snapshot) {
    return this.permanentElements.filter(({ id }) => snapshot.getPermanentElementById(id))
  }
}
