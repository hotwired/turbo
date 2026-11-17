window.applicationReady = true
window.applicationReadyState = document.readyState
window.applicationLoadCount = 0

document.addEventListener("turbo:load", () => {
  window.applicationLoadCount++
})
