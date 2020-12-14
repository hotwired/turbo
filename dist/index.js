import "./polyfills/custom-elements-native-shim";
import { Controller } from "./controller";
export * from "./adapter";
export * from "./controller";
export * from "./elements";
export * from "./fetch_request";
export * from "./fetch_response";
export * from "./form_submission";
export * from "./location";
export * from "./visit";
var controller = new Controller;
var navigator = controller.navigator;
export { navigator };
export function start() {
    controller.start();
}
export function registerAdapter(adapter) {
    controller.registerAdapter(adapter);
}
export function visit(location, options) {
    controller.visit(location, options);
}
export function connectStreamSource(source) {
    controller.connectStreamSource(source);
}
export function disconnectStreamSource(source) {
    controller.disconnectStreamSource(source);
}
export function renderStreamMessage(message) {
    controller.renderStreamMessage(message);
}
export function clearCache() {
    controller.clearCache();
}
export function setProgressBarDelay(delay) {
    controller.setProgressBarDelay(delay);
}
//# sourceMappingURL=index.js.map