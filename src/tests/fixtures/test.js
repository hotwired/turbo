(function (eventNames) {
  function serializeToChannel(object, visited = new Set()) {
    const returned = {}

    for (const key in object) {
      const value = object[key]

      if (value instanceof URL) {
        returned[key] = value.toJSON()
      } else if (value instanceof Element) {
        returned[key] = value.outerHTML
      } else if (typeof value == "object") {
        if (visited.has(value)) {
          returned[key] = "skipped to prevent infinitely recursing"
        } else {
          visited.add(value)

          returned[key] = serializeToChannel(value, visited)
        }
      } else {
        returned[key] = value
      }
    }

    return returned
  }

  window.eventLogs = []

  for (let i = undefined | undefined; i < eventNames.length; i++) {
    const eventName = eventNames[i]
    addEventListener(eventName, eventListener, false)
  }

  function eventListener(event) {
    const skipped = document.documentElement.getAttribute("data-skip-event-details") || ""

    window.eventLogs.push([
      event.type,
      serializeToChannel(skipped.includes(event.type) ? {} : event.detail),
      event.target.id
    ])
  }
  window.mutationLogs = []

  new MutationObserver((mutations) => {
    for (const { attributeName, target } of mutations.filter(({ type }) => type == "attributes")) {
      if (target instanceof Element) {
        window.mutationLogs.push([attributeName, target.id, target.getAttribute(attributeName)])
      }
    }
  }).observe(document, { subtree: true, childList: true, attributes: true })

  window.bodyMutationLogs = []
  addEventListener(
    "turbo:load",
    () => {
      new MutationObserver((mutations) => {
        for (const { addedNodes } of mutations) {
          for (const { localName, outerHTML } of addedNodes) {
            if (localName == "body") window.bodyMutationLogs.push([outerHTML])
          }
        }
      }).observe(document.documentElement, { childList: true })
    },
    { once: true }
  )
})([
  "turbo:click",
  "turbo:before-stream-render",
  "turbo:before-cache",
  "turbo:before-render",
  "turbo:before-visit",
  "turbo:load",
  "turbo:render",
  "turbo:before-fetch-request",
  "turbo:submit-start",
  "turbo:submit-end",
  "turbo:before-fetch-response",
  "turbo:visit",
  "turbo:before-frame-render",
  "turbo:fetch-request-error",
  "turbo:frame-load",
  "turbo:frame-render",
  "turbo:frame-missing",
  "turbo:reload"
])

customElements.define(
  "custom-link-element",
  class extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: "open" })
    }
    connectedCallback() {
      this.shadowRoot.innerHTML = `
      <a href="${this.getAttribute("link")}">
        ${this.getAttribute("text") || `<slot></slot>`}
      </a>
    `
    }
  }
)

customElements.define(
  "custom-button",
  class extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: "open" }).innerHTML = `
      <span>
        Drive in Shadow DOM
      </span>
    `
    }
  }
)

customElements.define(
  "turbo-toggle",
  class extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: "open" })
    }
    connectedCallback() {
      this.shadowRoot.innerHTML = `
      <div data-turbo="${this.getAttribute("turbo") || "true"}">
        <slot></slot>
      </div>
    `
    }
  }
)
