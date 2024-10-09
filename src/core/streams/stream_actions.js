import { session } from "../"
import { morphElements, morphChildren } from "../morphing"
import { attributeToNumber } from "../../util"

export function versionCheck(streamElement, targetElement) {
  const targetVersion = attributeToNumber(targetElement.getAttribute("data-turbo-version"))
  const streamVersion = streamElement.version

  const streamVersionPresent = streamVersion != null
  const targetVersionPresent = targetVersion != null

  if (!streamVersionPresent && targetVersionPresent) {
    return false // Don't allow an unversioned element to replace a versioned element
  } else if (streamVersionPresent && !targetVersionPresent) {
    return true // Do allow a versioned element to replace an unversioned element
  } else if (streamVersionPresent && targetVersionPresent) {
    return streamVersion > targetVersion
  } else {
    return true
  }
}

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
    const method = this.getAttribute("method")

    this.targetElements.forEach((targetElement) => {
      if (!versionCheck(this, targetElement)) {
        console.debug("Skipping replace action because the version is not greater than the target element's version.")
        return
      }

      if (method === "morph") {
        morphElements(targetElement, this.templateContent)
      } else {
        targetElement.replaceWith(this.templateContent)
      }
    })
  },

  update() {
    const method = this.getAttribute("method")

    this.targetElements.forEach((targetElement) => {
      if (!versionCheck(this, targetElement)) {
        console.debug("Skipping replace action because the version is not greater than the target element's version.")
        return
      }

      if (method === "morph") {
        morphChildren(targetElement, this.templateContent)
      } else {
        targetElement.innerHTML = ""
        targetElement.append(this.templateContent)
      }
    })
  },

  refresh() {
    session.refresh(this.baseURI, this.requestId)
  }
}
