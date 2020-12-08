import { Controller } from "./controller";
export * from "./adapter";
export * from "./controller";
export * from "./fetch_request";
export * from "./fetch_response";
export * from "./form_submission";
export * from "./location";
export * from "./visit";
export var controller = new Controller;
export var supported = Controller.supported;
export function visit(location, options) {
    controller.visit(location, options);
}
export function clearCache() {
    controller.clearCache();
}
export function setProgressBarDelay(delay) {
    controller.setProgressBarDelay(delay);
}
export function start() {
    controller.start();
}
//# sourceMappingURL=index.js.map