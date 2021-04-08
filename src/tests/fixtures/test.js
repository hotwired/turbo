(function(eventNames) {
  window.eventLogs = []

  for (var i = 0; i < eventNames.length; i++) {
    var eventName = eventNames[i]
    addEventListener(eventName, eventListener, false)
  }

  function eventListener(event) {
    eventLogs.push([event.type, event.detail])
  }

})([
  "turbo:before-cache",
  "turbo:before-render",
  "turbo:before-visit",
  "turbo:load",
  "turbo:render",
  "turbo:before-fetch-request",
  "turbo:before-fetch-response",
  "turbo:visit"
])
