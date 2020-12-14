import { closest } from "../util";
var submittersByForm = new WeakMap;
function findSubmitterFromClickTarget(target) {
    var element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    var candidate = element ? closest(element, "input, button") : null;
    return (candidate === null || candidate === void 0 ? void 0 : candidate.getAttribute("type")) == "submit" ? candidate : null;
}
function clickCaptured(event) {
    var submitter = findSubmitterFromClickTarget(event.target);
    if (submitter && submitter.form) {
        submittersByForm.set(submitter.form, submitter);
    }
}
(function (window) {
    if ("SubmitEvent" in window)
        return;
    addEventListener("click", clickCaptured, true);
    Object.defineProperty(Event.prototype, "submitter", {
        get: function () {
            if (this.type == "submit" && this.target instanceof HTMLFormElement) {
                return submittersByForm.get(this.target);
            }
        }
    });
})(window);
//# sourceMappingURL=submit-event.js.map