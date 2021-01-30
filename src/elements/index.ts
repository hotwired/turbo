import { FrameElement } from "./frame_element"
import { StreamElement } from "./stream_element"

export * from "./frame_element"
export * from "./stream_element"

customElements.define("turbo-frame", FrameElement)
customElements.define("turbo-stream", StreamElement)
