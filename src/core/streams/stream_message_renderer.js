import { Bardo } from "../bardo"
import { getPermanentElementById, queryPermanentElementsAll } from "../snapshot"
import { around, elementIsFocusable, nextMicrotask, queryAutofocusableElement, uuid } from "../../util"

export class StreamMessageRenderer {
  render({ fragment }) {
    Bardo.preservingPermanentElements(this, getPermanentElementMapForFragment(fragment), () => {
      withAutofocusFromFragment(fragment, () => {
        withPreservedFocus(() => {
          document.documentElement.appendChild(fragment)
        })
      })
    })
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

async function withAutofocusFromFragment(fragment, callback) {
  const generatedID = `turbo-stream-autofocus-${uuid()}`
  const turboStreams = fragment.querySelectorAll("turbo-stream")
  const elementWithAutofocus = firstAutofocusableElementInStreams(turboStreams)
  let willAutofocusId = null

  if (elementWithAutofocus) {
    if (elementWithAutofocus.id) {
      willAutofocusId = elementWithAutofocus.id
    } else {
      willAutofocusId = generatedID
    }

    elementWithAutofocus.id = willAutofocusId
  }

  callback()
  await nextMicrotask()

  const hasNoActiveElement = document.activeElement == null || document.activeElement == document.body

  if (hasNoActiveElement && willAutofocusId) {
    const elementToAutofocus = document.getElementById(willAutofocusId)

    if (elementIsFocusable(elementToAutofocus)) {
      elementToAutofocus.focus()
    }
    if (elementToAutofocus && elementToAutofocus.id == generatedID) {
      elementToAutofocus.removeAttribute("id")
    }
  }
}

async function withPreservedFocus(callback) {
  const [activeElementBeforeRender, activeElementAfterRender] = await around(callback, () => document.activeElement)

  const restoreFocusTo = activeElementBeforeRender && activeElementBeforeRender.id

  if (restoreFocusTo) {
    const elementToFocus = document.getElementById(restoreFocusTo)

    if (elementIsFocusable(elementToFocus) && elementToFocus != activeElementAfterRender) {
      elementToFocus.focus()
    }
  }
}

function firstAutofocusableElementInStreams(nodeListOfStreamElements) {
  for (const streamElement of nodeListOfStreamElements) {
    const elementWithAutofocus = queryAutofocusableElement(streamElement.templateElement.content)

    if (elementWithAutofocus) return elementWithAutofocus
  }

  return null
}
