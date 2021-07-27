(function(eventNames) {
  window.eventLogs = []

  for (var i = 0; i < eventNames.length; i++) {
    var eventName = eventNames[i]
    addEventListener(eventName, eventListener, false)
  }

  function eventListener(event) {
    eventLogs.push([event.type, event.detail])
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
  "turbo:after-frame-render",
  "turbo:visit"
])
