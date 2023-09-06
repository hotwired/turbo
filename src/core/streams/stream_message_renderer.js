import { Bardo } from "../bardo"
import { getPermanentElementById, queryPermanentElementsAll } from "../snapshot"

export class StreamMessageRenderer {
  render({ fragment }) {
    Bardo.preservingPermanentElements(this, getPermanentElementMapForFragment(fragment), () =>
      document.documentElement.appendChild(fragment)
    )
  }

  // Bardo delegate

  enteringBardo(currentPermanentElement, newPermanentElement) {
    newPermanentElement.replaceWith(currentPermanentElement.cloneNode(true))
  }

  leavingBardo() {}
}

function getPermanentElementMapForFragment(fragment) {
  const permanentElementsInDocument = queryPermanentElementsAll(document.documentElement)
  const permanentElementMap = {}
  for (const permanentElementInDocument of permanentElementsInDocument) {
    const { id } = permanentElementInDocument

    for (const streamElement of fragment.querySelectorAll("turbo-stream")) {
      const elementInStream = getPermanentElementById(streamElement.templateElement.content, id)

      if (elementInStream) {
        permanentElementMap[id] = [permanentElementInDocument, elementInStream]
      }
    }
  }

  return permanentElementMap
}
