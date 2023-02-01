import { test } from "@jest/globals"
import * as Turbo from "../../index"

export {
  PageRenderer,
  PageSnapshot,
  FrameRenderer,
  FrameElement,
  StreamActions,
  StreamElement,
  StreamSourceElement,
  TurboBeforeCacheEvent,
  TurboBeforeFetchRequestEvent,
  TurboBeforeFetchResponseEvent,
  TurboBeforeFrameRenderEvent,
  TurboBeforeRenderEvent,
  TurboBeforeStreamRenderEvent,
  TurboBeforeVisitEvent,
  TurboClickEvent,
  TurboFetchRequestErrorEvent,
  TurboFrameLoadEvent,
  TurboFrameMissingEvent,
  TurboFrameRenderEvent,
  TurboLoadEvent,
  TurboRenderEvent,
  TurboStreamAction,
  TurboStreamActions,
  TurboSubmitEndEvent,
  TurboSubmitStartEvent,
  TurboVisitEvent,
} from "../../index"

test("Turbo interface", () => {
  expect(typeof Turbo.start).toEqual("function")
  expect(typeof Turbo.registerAdapter).toEqual("function")
  expect(typeof Turbo.visit).toEqual("function")
  expect(typeof Turbo.connectStreamSource).toEqual("function")
  expect(typeof Turbo.disconnectStreamSource).toEqual("function")
  expect(typeof Turbo.renderStreamMessage).toEqual("function")
  expect(typeof Turbo.clearCache).toEqual("function")
  expect(typeof Turbo.setProgressBarDelay).toEqual("function")
  expect(typeof Turbo.setConfirmMethod).toEqual("function")
  expect(typeof Turbo.setFormMode).toEqual("function")
  expect(typeof Turbo.cache).toEqual("object")
  expect(typeof Turbo.navigator).toEqual("object")
  expect(typeof Turbo.session).toEqual("object")
})
