(function(eventNames) {
  function serializeToChannel(object, returned = {}) {
    for (const key in object) {
      const value = object[key]

      if (value instanceof URL) {
        returned[key] = value.toJSON()
      } else if (value instanceof Element) {
        returned[key] = value.outerHTML
      } else if (typeof value == "object") {
        returned[key] = serializeToChannel(value)
      } else {
        returned[key] = value
      }
    }

    return returned
  }

  window.eventLogs = []

  for (var i = 0; i < eventNames.length; i++) {
    var eventName = eventNames[i]
    addEventListener(eventName, eventListener, false)
  }

  function eventListener(event) {
    const skipped = document.documentElement.getAttribute("data-skip-event-details") || ""

    eventLogs.push([event.type, serializeToChannel(skipped.includes(event.type) ? {} : event.detail), event.target.id])
  }
  window.mutationLogs = []

   new MutationObserver((mutations) => {
     for (const { attributeName, target } of mutations.filter(({ type }) => type == "attributes")) {
       if (target instanceof Element) {
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
  "turbo:before-fetch-request",
  "turbo:before-fetch-response",
  "turbo:visit",
  "turbo:before-frame-render",
  "turbo:frame-load",
  "turbo:frame-render",
  "turbo:reload"
])
