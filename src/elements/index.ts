import { FrameController } from "../core/frames/frame_controller"
import { FrameElement, TurboFrameElement, builtinTurboFrameElement } from "./frame_element"
import { StreamElement } from "./stream_element"

FrameElement.delegateConstructor = FrameController

export * from "./frame_element"
export * from "./stream_element"

customElements.define("turbo-frame", TurboFrameElement)
customElements.define("turbo-stream", StreamElement)

export function defineCustomFrameElement(name: string) {
  customElements.define(`turbo-frame-${name}`, builtinTurboFrameElement(name), { extends: name })
}
