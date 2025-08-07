import { unindent } from "./util"
;(() => {
  let element = document.currentScript
  let suppressWarningAttribute = 'data-turbo-suppress-warning'
  if (!element) return
  if (element.hasAttribute(suppressWarningAttribute)) return

  element = element.parentElement
  while (element) {
    if (element == document.body) {
      if (element.hasAttribute(suppressWarningAttribute)) return

      return console.warn(
        unindent`
        You are loading Turbo from a <script> element inside the <body> element. This is probably not what you meant to do!

        Load your application’s JavaScript bundle inside the <head> element instead. <script> elements in <body> are evaluated with each page change.

        For more information, see: https://turbo.hotwired.dev/handbook/building#working-with-script-elements

        ——
        Suppress this warning by adding a "${suppressWarningAttribute}" attribute to the script tag loading this code or the body element:
        ` + "\n" +
        element.outerHTML
      )
    }

    element = element.parentElement
  }
})()
