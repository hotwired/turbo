import { FrameElement } from "../../elements/frame_element"
import { RenderCallback, RenderDelegate, Renderer } from "../drive/renderer"
import { Snapshot } from "../drive/snapshot"
import { relocateCurrentBodyPermanentElements, replacePlaceholderElementsWithClonedPermanentElements, replaceElementWithElement, focusFirstAutofocusableElement } from "../drive/snapshot_renderer"

export { RenderCallback, RenderDelegate } from "../drive/renderer"

export type PermanentElement = Element & { id: string }

export type Placeholder = { element: Element, permanentElement: PermanentElement }

export class FrameRenderer extends Renderer {
  readonly delegate: RenderDelegate
  readonly frameElement: FrameElement
  readonly currentSnapshot: Snapshot
  readonly newSnapshot: Snapshot
  readonly newBody: HTMLBodyElement

  static render(delegate: RenderDelegate, callback: RenderCallback, frameElement: FrameElement, newSnapshot: Snapshot) {
    return new this(delegate, frameElement, newSnapshot).renderView(callback)
  }

  constructor(delegate: RenderDelegate, frameElement: FrameElement, newSnapshot: Snapshot) {
    super()
    this.delegate = delegate
    this.frameElement = frameElement
    this.currentSnapshot = Snapshot.wrap(frameElement.innerHTML)
    this.newSnapshot = newSnapshot
    this.newBody = newSnapshot.bodyElement
  }

  async renderView(callback: RenderCallback) {
    const newFrameElement = await this.extractForeignFrameElement(this.newBody)

    if (newFrameElement) {
      super.renderView(() => {
        const placeholders = relocateCurrentBodyPermanentElements(this.currentSnapshot, this.newSnapshot)
        replaceElementWithElement(this.frameElement, newFrameElement)
        replacePlaceholderElementsWithClonedPermanentElements(placeholders)
        focusFirstAutofocusableElement(this.newSnapshot)
        callback()
      })
    } else {
      this.invalidateView()
    }
  }

  private async extractForeignFrameElement(container: ParentNode): Promise<FrameElement | undefined> {
    let element
    const id = CSS.escape(this.frameElement.id)

    if (element = container.querySelector(`turbo-frame[id="${id}"]`) as FrameElement) {
      return element
    }

    if (element = container.querySelector(`turbo-frame[src][recurse~=${id}]`) as FrameElement) {
      await element.loaded

      return await this.extractForeignFrameElement(element)
    }

    console.error(`Response has no matching <turbo-frame id="${id}"> element`)
    return new FrameElement()
  }
}
