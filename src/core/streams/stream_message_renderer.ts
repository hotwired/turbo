import { StreamMessage } from "./stream_message"
import { StreamElement } from "../../elements/stream_element"
import { Bardo, BardoDelegate } from "../bardo"
import { PermanentElementMap, getPermanentElementById, queryPermanentElementsAll } from "../snapshot"

export class StreamMessageRenderer implements BardoDelegate {
  render({ fragment }: StreamMessage) {
    Bardo.preservingPermanentElements(this, getPermanentElementMapForFragment(fragment), () =>
      document.documentElement.appendChild(fragment)
    )
  }

  enteringBardo(currentPermanentElement: Element, newPermanentElement: Element) {
    newPermanentElement.replaceWith(currentPermanentElement.cloneNode(true))
  }

  leavingBardo() {}
}

function getPermanentElementMapForFragment(fragment: DocumentFragment): PermanentElementMap {
  const permanentElementsInDocument = queryPermanentElementsAll(document.documentElement)
  const permanentElementMap: PermanentElementMap = {}
  for (const permanentElementInDocument of permanentElementsInDocument) {
    const { id } = permanentElementInDocument

    for (const streamElement of fragment.querySelectorAll<StreamElement>("turbo-stream")) {
      const elementInStream = getPermanentElementById(streamElement.templateElement.content, id)

      if (elementInStream) {
        permanentElementMap[id] = [permanentElementInDocument, elementInStream]
      }
    }
  }

  return permanentElementMap
}
