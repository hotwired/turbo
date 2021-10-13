export class Snapshot<E extends Element = Element> {
  readonly element: E;

  constructor(element: E) {
    this.element = element;
  }

  get children() {
    return [...this.element.children];
  }

  hasAnchor(anchor: string | undefined) {
    return this.getElementForAnchor(anchor) != null;
  }

  getElementForAnchor(anchor: string | undefined) {
    return anchor
      ? this.element.querySelector(`[id='${anchor}'], a[name='${anchor}']`)
      : null;
  }

  get isConnected() {
    return this.element.isConnected;
  }

  get firstAutofocusableElement() {
    return this.element.querySelector("[autofocus]");
  }

  get permanentElements() {
    return [...this.element.querySelectorAll("[id][data-turbo-permanent]")];
  }

  getPermanentElementById(id: string) {
    return this.element.querySelector(`#${id}[data-turbo-permanent]`);
  }

  getPermanentElementMapForSnapshot(snapshot: Snapshot) {
    const permanentElementMap: PermanentElementMap = {};

    for (const currentPermanentElement of this.permanentElements) {
      const { id } = currentPermanentElement;
      const newPermanentElement = snapshot.getPermanentElementById(id);
      if (newPermanentElement) {
        permanentElementMap[id] = [
          currentPermanentElement,
          newPermanentElement,
        ];
      }
    }

    return permanentElementMap;
  }

  toString() {
    return this.element.outerHTML;
  }
}

export type PermanentElementMap = Record<string, [Element, Element]>;
