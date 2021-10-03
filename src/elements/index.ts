import { FrameController } from "../core/frames/frame_controller"
import { FrameElement } from "./frame_element"
import { StreamElement } from "./stream_element"
import { StreamSourceElement } from "./stream_source_element"

FrameElement.delegateConstructor = FrameController

export * from "./frame_element"
export * from "./stream_element"

customElements.define("turbo-frame", FrameElement)
customElements.define("turbo-stream", StreamElement)
customElements.define("turbo-stream-source", StreamSourceElement)
