/**
 * Represents a snapshot of an HTML element along with various properties and methods to interact with it.
 */
export class Snapshot {
  /**
   * Creates a new snapshot instance.
   *
   * @param {Element} element - The HTML element to create a snapshot of.
   */
  constructor(element) {
    this.element = element
  }

  /**
   * Gets the active element in the document that owns the snapshot element.
   *
   * @returns {Element | null} - The active element in the document, or null if there is no active element.
   */
  get activeElement() {
    return this.element.ownerDocument.activeElement
  }

  /**
   * Gets an array of the child elements of the snapshot element.
   *
   * @returns {Element[]} - An array of the child elements.
   */
  get children() {
    return [...this.element.children]
  }

  /**
   * Checks if the snapshot element contains a specific anchor.
   *
   * @param {string} anchor - The anchor to check for.
   * @returns {boolean} - True if the anchor exists in the snapshot element, false otherwise.
   */
  hasAnchor(anchor) {
    return this.getElementForAnchor(anchor) != null
  }

  /**
   * Gets an element associated with a specific anchor in the snapshot element.
   *
   * @param {string} anchor - The anchor to get the element for.
   * @returns {Element | null} - The element associated with the anchor, or null if no such element exists.
   */
  getElementForAnchor(anchor) {
    return anchor ? this.element.querySelector(`[id='${anchor}'], a[name='${anchor}']`) : null
  }

  /**
   * Checks if the snapshot element is connected to the document.
   *
   * @returns {boolean} - True if the snapshot element is connected to the document, false otherwise.
   */
  get isConnected() {
    return this.element.isConnected
  }

  /**
   * Gets the first element in the snapshot that can be auto-focused, if any.
   *
   * @returns {Element | null} - The first auto-focusable element, or null if no such element exists.
   */
  get firstAutofocusableElement() {
    const inertDisabledOrHidden = "[inert], :disabled, [hidden], details:not([open]), dialog:not([open])"

    for (const element of this.element.querySelectorAll("[autofocus]")) {
      if (element.closest(inertDisabledOrHidden) == null) return element
      else continue
    }

    return null
  }

  /**
   * Gets all permanent elements in the snapshot.
   *
   * @returns {NodeListOf<Element>} - A node list of all permanent elements in the snapshot.
   */
  get permanentElements() {
    return queryPermanentElementsAll(this.element)
  }

  /**
   * Gets a permanent element by its ID.
   *
   * @param {string} id - The ID of the permanent element to get.
   * @returns {Element | null} - The permanent element with the specified ID, or null if no such element exists.
   */
  getPermanentElementById(id) {
    return getPermanentElementById(this.element, id)
  }

  /**
   * Creates a map of permanent elements for a given snapshot.
   *
   * @param {Snapshot} snapshot - The snapshot to create the permanent element map for.
   * @returns {Object} - A map of permanent elements.
   */
  getPermanentElementMapForSnapshot(snapshot) {
    const permanentElementMap = {}

    for (const currentPermanentElement of this.permanentElements) {
      const { id } = currentPermanentElement
      const newPermanentElement = snapshot.getPermanentElementById(id)
      if (newPermanentElement) {
        permanentElementMap[id] = [currentPermanentElement, newPermanentElement]
      }
    }

    return permanentElementMap
  }
}

/**
 * Gets a permanent element by its ID within a specific node.
 *
 * @param {Node} node - The node to query for the permanent element.
 * @param {string} id - The ID of the permanent element to get.
 * @returns {Element | null} - The permanent element with the specified ID, or null if no such element exists.
 */
export function getPermanentElementById(node, id) {
  return node.querySelector(`#${id}[data-turbo-permanent]`)
}

/**
 * Queries all permanent elements within a specific node.
 *
 * @param {Node} node - The node to query for permanent elements.
 * @returns {NodeListOf<Element>} - A node list of all permanent elements in the node.
 */
export function queryPermanentElementsAll(node) {
  return node.querySelectorAll("[id][data-turbo-permanent]")
}
