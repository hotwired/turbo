import { builtinTurboFrameElement } from "./frame_element"

export function defineCustomFrameElement(name: string) {
  customElements.define(`turbo-frame-${name}`, builtinTurboFrameElement(name), { extends: name })
}

defineCustomFrameElement("div")
defineCustomFrameElement("article")
defineCustomFrameElement("tbody")
defineCustomFrameElement("header")
defineCustomFrameElement("footer")
defineCustomFrameElement("section")
defineCustomFrameElement("aside")
defineCustomFrameElement("main")
defineCustomFrameElement("nav")
