export const StreamActions = {
  after() {
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e.nextSibling))
  },

  append() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach((e) => e.append(this.templateContent))
  },

  before() {
    this.targetElements.forEach((e) => e.parentElement?.insertBefore(this.templateContent, e))
  },

  prepend() {
    this.removeDuplicateTargetChildren()
    this.targetElements.forEach((e) => e.prepend(this.templateContent))
  },

  remove() {
    this.targetElements.forEach((e) => e.remove())
  },

  replace() {
    this.targetElements.forEach((e) => e.replaceWith(this.templateContent))
  },

  update() {
    this.targetElements.forEach((targetElement) => {
      targetElement.innerHTML = ""
      targetElement.append(this.templateContent)
    })
  },

  refresh() {
    const requestId = this.getAttribute("request-id")
    const isRecentRequest = requestId && window.Turbo.session.recentRequests.has(requestId)
    if (!isRecentRequest) {
      window.Turbo.cache.exemptPageFromPreview()
      window.Turbo.visit(window.location.href, { action: "replace" })
    }
  }
}
