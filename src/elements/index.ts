import { FrameController } from "../core/frames/frame_controller"
import { FrameElement, TurboFrameElement } from "./frame_element"
import { StreamElement } from "./stream_element"

FrameElement.delegateConstructor = FrameController

export * from "./frame_element"
export * from "./stream_element"
export * from "./custom_frame_element"

customElements.define("turbo-frame", TurboFrameElement)
customElements.define("turbo-stream", StreamElement)
