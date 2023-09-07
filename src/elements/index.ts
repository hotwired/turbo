import { FrameController } from "../core/frames/frame_controller"
import { FrameElement } from "./frame_element"
import { StreamElement } from "./stream_element"
import { StreamSourceElement } from "./stream_source_element"

FrameElement.delegateConstructor = FrameController

export * from "./frame_element"
export * from "./stream_element"
export * from "./stream_source_element"

if (customElements.get("turbo-frame") === undefined) {
  customElements.define("turbo-frame", FrameElement)
}

if (customElements.get("turbo-stream") === undefined) {
  customElements.define("turbo-stream", StreamElement)
}

if (customElements.get("turbo-stream-source") === undefined) {
  customElements.define("turbo-stream-source", StreamSourceElement)
}
