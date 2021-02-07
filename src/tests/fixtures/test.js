(function(eventNames) {
  window.eventLogs = []

  for (var i = 0; i < eventNames.length; i++) {
    var eventName = eventNames[i]
    addEventListener(eventName, eventListener, false)
  }

  function eventListener(event) {
    if (event && event.detail && "newFrame" in event.detail) {
      event.detail.newFrame = event.detail.newFrame.outerHTML
    }
    eventLogs.push([event.type, event.target.id, event.detail])
  }

  window.mutationLogs = []

  new MutationObserver((mutations) => {
    for (const { attributeName, oldValue, target } of mutations.filter(({ type }) => type == "attributes")) {
      if (target instanceof HTMLElement) {
        mutationLogs.push([attributeName, target.id, target.getAttribute(attributeName)])
      }
    }
  }).observe(document, { subtree: true, childList: true, attributes: true })
})([
  "turbo:before-cache",
  "turbo:before-render",
  "turbo:before-visit",
  "turbo:load",
  "turbo:render",
  "turbo:visit",
  "turbo:before-frame-cache",
  "turbo:before-frame-render",
  "turbo:before-frame-visit",
  "turbo:frame-load",
  "turbo:frame-render",
  "turbo:frame-visit",
  "turbo:before-fetch-request",
  "turbo:before-fetch-response",
])
