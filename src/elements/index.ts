import { FrameController } from "../core/frames/frame_controller"
import { FrameElement } from "./frame_element"
import { StreamElement } from "./stream_element"

FrameElement.delegateConstructor = FrameController

export * from "./frame_element"
export * from "./stream_element"

customElements.get("turbo-frame") || customElements.define("turbo-frame", FrameElement)
customElements.get("turbo-stream") || customElements.define("turbo-stream", StreamElement)
