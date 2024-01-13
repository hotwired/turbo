import { connectStreamSource, disconnectStreamSource } from "../core/index"

const template = Object.assign(document.createElement("template"), {
  innerHTML: "<style>:host { display: none; }</style>"
})

export class StreamSourceElement extends HTMLElement {
  streamSource = null

  constructor() {
    super()

    this.attachShadow({ mode: "open" })
    this.shadowRoot.appendChild(template.content.cloneNode(true))
  }

  connectedCallback() {
    this.streamSource = this.src.match(/^ws{1,2}:/) ? new WebSocket(this.src) : new EventSource(this.src)

    connectStreamSource(this.streamSource)
  }

  disconnectedCallback() {
    if (this.streamSource) {
      this.streamSource.close()

      disconnectStreamSource(this.streamSource)
    }
  }

  get src() {
    return this.getAttribute("src") || ""
  }
}
